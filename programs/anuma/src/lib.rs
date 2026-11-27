use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};
use groth16_solana::groth16::Groth16Verifier;

mod vk;

declare_id!("9k1zFVABWqqDQRJbfwQpucxWdbN7gJnTCbFFv5RL3nKd");

/// Number of recent Merkle roots accepted by `open_credit`. A proof made against a root that was
/// replaced by up to seven newer registrations still verifies.
pub const ROOT_HISTORY: usize = 8;

/// Semaphore scope for every Anuma credit line. One identity has exactly one nullifier per scope,
/// so one verified person can open exactly one credit line.
pub const SCOPE_BYTES: [u8; 32] = right_pad(b"anuma-credit-v1");

const fn right_pad(text: &[u8]) -> [u8; 32] {
    let mut out = [0u8; 32];
    let mut i = 0;
    while i < text.len() {
        out[i] = text[i];
        i += 1;
    }
    out
}

/// Semaphore's `hash()`: keccak256 of the 32 input bytes, shifted right by 8 bits so the result is
/// a BN254 field element. Big-endian, so the shift drops the last digest byte and prepends a zero.
pub fn hash_to_field(bytes: &[u8; 32]) -> [u8; 32] {
    let digest = solana_keccak_hasher::hash(bytes).to_bytes();
    let mut out = [0u8; 32];
    out[1..].copy_from_slice(&digest[..31]);
    out
}

#[program]
pub mod anuma {
    use super::*;

    /// Creates the config and the USDC vault. The admin also posts Merkle roots.
    pub fn initialize(
        ctx: Context<Initialize>,
        issuer: Pubkey,
        start_limit: u64,
        max_unsecured_limit: u64,
        loan_term_secs: i64,
        grace_secs: i64,
    ) -> Result<()> {
        require!(start_limit > 0 && start_limit <= max_unsecured_limit, AnumaError::BadParams);
        require!(loan_term_secs > 0 && grace_secs >= 0, AnumaError::BadParams);
        let config = &mut ctx.accounts.config;
        config.admin = ctx.accounts.admin.key();
        config.issuer = issuer;
        config.usdc_mint = ctx.accounts.usdc_mint.key();
        config.vault = ctx.accounts.vault.key();
        config.roots = [[0u8; 32]; ROOT_HISTORY];
        config.root_idx = 0;
        config.member_count = 0;
        config.start_limit = start_limit;
        config.max_unsecured_limit = max_unsecured_limit;
        config.loan_term_secs = loan_term_secs;
        config.grace_secs = grace_secs;
        config.bump = ctx.bumps.config;
        Ok(())
    }

    /// Adds one KYC-verified person to the group. The Person PDA is seeded by
    /// `person_id = HMAC(issuer_secret, national_id)`, so `init` rejects a second registration of
    /// the same person. Only the issuer can co-sign, so only verified people get a leaf.
    pub fn register(ctx: Context<Register>, person_id: [u8; 32], commitment: [u8; 32]) -> Result<()> {
        let config = &mut ctx.accounts.config;
        let person = &mut ctx.accounts.person;
        person.kyc_wallet = ctx.accounts.kyc_wallet.key();
        person.commitment = commitment;
        person.index = config.member_count;
        person.bump = ctx.bumps.person;
        config.member_count = config.member_count.checked_add(1).ok_or(AnumaError::MathOverflow)?;
        emit!(Registered { person_id, commitment, index: person.index });
        Ok(())
    }

    /// Stores the LeanIMT root of all commitments in registration order in the root ring buffer.
    pub fn set_root(ctx: Context<SetRoot>, root: [u8; 32]) -> Result<()> {
        let config = &mut ctx.accounts.config;
        let slot = config.root_idx as usize % ROOT_HISTORY;
        config.roots[slot] = root;
        config.root_idx = ((slot + 1) % ROOT_HISTORY) as u8;
        emit!(RootSet { root, member_count: config.member_count });
        Ok(())
    }

    /// Opens an anonymous credit line for a fresh pseudonym key. The Semaphore proof shows that the
    /// caller owns one registered commitment without saying which one. The message is the pseudonym
    /// public key, so a copied proof cannot open a line for another key. The Credit PDA is seeded by
    /// the nullifier, so `init` rejects a second line for the same person.
    pub fn open_credit(
        ctx: Context<OpenCredit>,
        proof_a: [u8; 64],
        proof_b: [u8; 128],
        proof_c: [u8; 64],
        root: [u8; 32],
        nullifier: [u8; 32],
    ) -> Result<()> {
        let config = &ctx.accounts.config;
        require!(root != [0u8; 32] && config.roots.contains(&root), AnumaError::UnknownRoot);

        let message_hash = hash_to_field(&ctx.accounts.pseudonym.key().to_bytes());
        let scope_hash = hash_to_field(&SCOPE_BYTES);
        let public_inputs = [root, nullifier, message_hash, scope_hash];
        let mut verifier =
            Groth16Verifier::new(&proof_a, &proof_b, &proof_c, &public_inputs, &vk::VERIFYING_KEY)
                .map_err(|_| AnumaError::InvalidProof)?;
        verifier.verify().map_err(|_| AnumaError::InvalidProof)?;

        let credit = &mut ctx.accounts.credit;
        credit.pseudonym = ctx.accounts.pseudonym.key();
        credit.nullifier = nullifier;
        credit.limit = config.start_limit;
        credit.debt = 0;
        credit.due_ts = 0;
        credit.repaid_count = 0;
        credit.defaulted = false;
        credit.bump = ctx.bumps.credit;
        emit!(CreditOpened { credit: credit.key(), pseudonym: credit.pseudonym, nullifier, limit: credit.limit });
        Ok(())
    }

    /// Adds lender liquidity to the vault.
    pub fn deposit(ctx: Context<Deposit>, amount: u64) -> Result<()> {
        require!(amount > 0, AnumaError::ZeroAmount);
        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.lender_token.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.lender.to_account_info(),
                },
            ),
            amount,
        )
    }

    /// Pays a merchant from the vault on behalf of the pseudonym (buy now, pay later). One open loan
    /// at a time, up to the current limit.
    pub fn borrow(ctx: Context<Borrow>, amount: u64) -> Result<()> {
        let credit = &mut ctx.accounts.credit;
        require!(!credit.defaulted, AnumaError::Defaulted);
        require!(credit.debt == 0, AnumaError::DebtOutstanding);
        require!(amount > 0, AnumaError::ZeroAmount);
        require!(amount <= credit.limit, AnumaError::OverLimit);

        let now = Clock::get()?.unix_timestamp;
        credit.debt = amount;
        credit.due_ts = now.checked_add(ctx.accounts.config.loan_term_secs).ok_or(AnumaError::MathOverflow)?;

        let seeds: &[&[u8]] = &[b"config", &[ctx.accounts.config.bump]];
        token::transfer(
            CpiContext::new_with_signer(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.vault.to_account_info(),
                    to: ctx.accounts.merchant_token.to_account_info(),
                    authority: ctx.accounts.config.to_account_info(),
                },
                &[seeds],
            ),
            amount,
        )?;
        emit!(Borrowed { credit: credit.key(), amount, due_ts: credit.due_ts });
        Ok(())
    }

    /// Repays debt from any payer. A full repayment on time raises the limit by 50%, capped at the
    /// maximum unsecured limit. A late repayment clears the debt but does not raise the limit, and a
    /// defaulted line stays defaulted.
    pub fn repay(ctx: Context<Repay>, amount: u64) -> Result<()> {
        let credit = &mut ctx.accounts.credit;
        require!(credit.debt > 0, AnumaError::NoDebt);
        require!(amount > 0, AnumaError::ZeroAmount);
        require!(amount <= credit.debt, AnumaError::OverRepay);

        token::transfer(
            CpiContext::new(
                ctx.accounts.token_program.key(),
                Transfer {
                    from: ctx.accounts.payer_token.to_account_info(),
                    to: ctx.accounts.vault.to_account_info(),
                    authority: ctx.accounts.payer.to_account_info(),
                },
            ),
            amount,
        )?;

        credit.debt -= amount;
        let now = Clock::get()?.unix_timestamp;
        let on_time = credit.debt == 0 && now <= credit.due_ts && !credit.defaulted;
        if on_time {
            let grown = credit.limit.checked_mul(3).ok_or(AnumaError::MathOverflow)? / 2;
            credit.limit = grown.min(ctx.accounts.config.max_unsecured_limit);
            credit.repaid_count = credit.repaid_count.saturating_add(1);
        }
        emit!(Repaid { credit: credit.key(), amount, remaining: credit.debt, new_limit: credit.limit });
        Ok(())
    }

    /// Marks an overdue line as defaulted. Anyone can call it after the due time plus grace. The
    /// nullifier-seeded PDA keeps the flag, so the same person can never open a clean line again.
    pub fn mark_default(ctx: Context<MarkDefault>) -> Result<()> {
        let credit = &mut ctx.accounts.credit;
        let now = Clock::get()?.unix_timestamp;
        let deadline = credit.due_ts.checked_add(ctx.accounts.config.grace_secs).ok_or(AnumaError::MathOverflow)?;
        require!(credit.debt > 0 && now > deadline, AnumaError::NotOverdue);
        credit.defaulted = true;
        emit!(DefaultMarked { credit: credit.key(), debt: credit.debt });
        Ok(())
    }
}

#[account]
#[derive(InitSpace)]
pub struct Config {
    pub admin: Pubkey,
    pub issuer: Pubkey,
    pub usdc_mint: Pubkey,
    pub vault: Pubkey,
    pub roots: [[u8; 32]; ROOT_HISTORY],
    pub root_idx: u8,
    pub member_count: u32,
    pub start_limit: u64,
    pub max_unsecured_limit: u64,
    pub loan_term_secs: i64,
    pub grace_secs: i64,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Person {
    pub kyc_wallet: Pubkey,
    pub commitment: [u8; 32],
    pub index: u32,
    pub bump: u8,
}

#[account]
#[derive(InitSpace)]
pub struct Credit {
    pub pseudonym: Pubkey,
    pub nullifier: [u8; 32],
    pub limit: u64,
    pub debt: u64,
    pub due_ts: i64,
    pub repaid_count: u16,
    pub defaulted: bool,
    pub bump: u8,
}

#[derive(Accounts)]
pub struct Initialize<'info> {
    #[account(mut)]
    pub admin: Signer<'info>,
    #[account(init, payer = admin, space = 8 + Config::INIT_SPACE, seeds = [b"config"], bump)]
    pub config: Account<'info, Config>,
    pub usdc_mint: Account<'info, Mint>,
    #[account(
        init,
        payer = admin,
        seeds = [b"vault"],
        bump,
        token::mint = usdc_mint,
        token::authority = config,
    )]
    pub vault: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
    pub system_program: Program<'info, System>,
}

/// The issuer pays rent, so a new user needs no SOL to register.
#[derive(Accounts)]
#[instruction(person_id: [u8; 32])]
pub struct Register<'info> {
    #[account(mut, address = config.issuer @ AnumaError::NotIssuer)]
    pub issuer: Signer<'info>,
    pub kyc_wallet: Signer<'info>,
    #[account(mut, seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        init,
        payer = issuer,
        space = 8 + Person::INIT_SPACE,
        seeds = [b"person", person_id.as_ref()],
        bump,
    )]
    pub person: Account<'info, Person>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct SetRoot<'info> {
    pub admin: Signer<'info>,
    #[account(mut, seeds = [b"config"], bump = config.bump, has_one = admin)]
    pub config: Account<'info, Config>,
}

/// A relayer pays fees and rent, so the fresh pseudonym key holds no SOL and has no on-chain link
/// to the KYC wallet.
#[derive(Accounts)]
#[instruction(proof_a: [u8; 64], proof_b: [u8; 128], proof_c: [u8; 64], root: [u8; 32], nullifier: [u8; 32])]
pub struct OpenCredit<'info> {
    #[account(mut)]
    pub payer: Signer<'info>,
    pub pseudonym: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(
        init,
        payer = payer,
        space = 8 + Credit::INIT_SPACE,
        seeds = [b"credit", nullifier.as_ref()],
        bump,
    )]
    pub credit: Account<'info, Credit>,
    pub system_program: Program<'info, System>,
}

#[derive(Accounts)]
pub struct Deposit<'info> {
    pub lender: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, address = config.vault)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, token::mint = config.usdc_mint, token::authority = lender)]
    pub lender_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Borrow<'info> {
    pub pseudonym: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [b"credit", credit.nullifier.as_ref()], bump = credit.bump, has_one = pseudonym)]
    pub credit: Account<'info, Credit>,
    #[account(mut, address = config.vault)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, token::mint = config.usdc_mint)]
    pub merchant_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct Repay<'info> {
    pub payer: Signer<'info>,
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [b"credit", credit.nullifier.as_ref()], bump = credit.bump)]
    pub credit: Account<'info, Credit>,
    #[account(mut, address = config.vault)]
    pub vault: Account<'info, TokenAccount>,
    #[account(mut, token::mint = config.usdc_mint, token::authority = payer)]
    pub payer_token: Account<'info, TokenAccount>,
    pub token_program: Program<'info, Token>,
}

#[derive(Accounts)]
pub struct MarkDefault<'info> {
    #[account(seeds = [b"config"], bump = config.bump)]
    pub config: Account<'info, Config>,
    #[account(mut, seeds = [b"credit", credit.nullifier.as_ref()], bump = credit.bump)]
    pub credit: Account<'info, Credit>,
}

#[event]
pub struct Registered {
    pub person_id: [u8; 32],
    pub commitment: [u8; 32],
    pub index: u32,
}

#[event]
pub struct RootSet {
    pub root: [u8; 32],
    pub member_count: u32,
}

#[event]
pub struct CreditOpened {
    pub credit: Pubkey,
    pub pseudonym: Pubkey,
    pub nullifier: [u8; 32],
    pub limit: u64,
}

#[event]
pub struct Borrowed {
    pub credit: Pubkey,
    pub amount: u64,
    pub due_ts: i64,
}

#[event]
pub struct Repaid {
    pub credit: Pubkey,
    pub amount: u64,
    pub remaining: u64,
    pub new_limit: u64,
}

#[event]
pub struct DefaultMarked {
    pub credit: Pubkey,
    pub debt: u64,
}

#[error_code]
pub enum AnumaError {
    #[msg("Invalid initialize parameters")]
    BadParams,
    #[msg("Signer is not the configured issuer")]
    NotIssuer,
    #[msg("Root is not in the recent root history")]
    UnknownRoot,
    #[msg("Zero-knowledge proof is invalid")]
    InvalidProof,
    #[msg("Credit line is defaulted")]
    Defaulted,
    #[msg("Repay the open loan first")]
    DebtOutstanding,
    #[msg("Amount exceeds the credit limit")]
    OverLimit,
    #[msg("Amount must be positive")]
    ZeroAmount,
    #[msg("Amount exceeds the debt")]
    OverRepay,
    #[msg("No open debt")]
    NoDebt,
    #[msg("Loan is not past due plus grace")]
    NotOverdue,
    #[msg("Arithmetic overflow")]
    MathOverflow,
}
