/** The Anuma mark: a private point inside a public ring, the membership-proof idea in one glyph. */
export function Mark({ className = "size-7" }: { className?: string }) {
  return (
    <svg viewBox="0 0 28 28" aria-hidden className={className}>
      <rect width="28" height="28" rx="8" fill="#0b1220" />
      <circle cx="14" cy="14" r="7.25" fill="none" strokeWidth="1.75" stroke="#ffffff" />
      <circle cx="16.75" cy="11.25" r="2.25" fill="#c7d2e0" />
    </svg>
  );
}
