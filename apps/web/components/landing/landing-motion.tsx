"use client";

import { useEffect } from "react";

const clamp = (v: number, a = 0, b = 1) => Math.min(b, Math.max(a, v));
const ease = (t: number) => (t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2);

type Kind = "up" | "left" | "right" | "words" | "stagger";
type Target = { el: HTMLElement; kind: Kind; top: number; parts: HTMLElement[]; last: number };

/**
 * Scroll choreography for the landing page, in the spirit of the Noctis story: one rAF loop reads a
 * smoothed scroll position and scrubs every `[data-reveal]` element (blur, lift and fade, words one
 * by one, children in sequence), fades the hero copy out, fills the progress bar and counts up
 * `[data-count]` figures once. Content is visible in the server HTML; this only adds motion, and
 * prefers-reduced-motion leaves everything still.
 */
export function LandingMotion() {
  useEffect(() => {
    if (matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const targets: Target[] = Array.from(document.querySelectorAll<HTMLElement>("[data-reveal]")).map((el) => {
      const kind = el.dataset.reveal as Kind;
      const parts = kind === "words" ? Array.from(el.querySelectorAll<HTMLElement>(".w")) : kind === "stagger" ? (Array.from(el.children) as HTMLElement[]) : [];
      return { el, kind, top: 0, parts, last: -1 };
    });
    const hero = document.getElementById("hero-copy");
    const bar = document.getElementById("scroll-progress");
    const counters = Array.from(document.querySelectorAll<HTMLElement>("[data-count]")).map((el) => ({ el, top: 0, done: false }));

    const measure = () => {
      const y = window.scrollY;
      for (const t of targets) t.top = t.el.getBoundingClientRect().top + y;
      for (const c of counters) c.top = c.el.getBoundingClientRect().top + y;
    };

    const format = (el: HTMLElement, value: number) => {
      const dec = Number(el.dataset.dec ?? 0);
      el.textContent = value.toLocaleString("en-US", { minimumFractionDigits: dec, maximumFractionDigits: dec });
    };
    const countUp = (el: HTMLElement) => {
      const to = Number(el.dataset.count);
      const start = performance.now();
      const tick = (now: number) => {
        const k = ease(clamp((now - start) / 1500));
        format(el, to * k);
        if (k < 1) requestAnimationFrame(tick);
      };
      requestAnimationFrame(tick);
    };

    const tilts = Array.from(document.querySelectorAll<HTMLElement>("[data-tilt]")).map((el) => {
      const move = (e: PointerEvent) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left) / r.width - 0.5;
        const y = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty("--tilt", `perspective(900px) rotateY(${x * 6}deg) rotateX(${-y * 6}deg)`);
      };
      const leave = () => el.style.removeProperty("--tilt");
      el.addEventListener("pointermove", move);
      el.addEventListener("pointerleave", leave);
      return () => {
        el.removeEventListener("pointermove", move);
        el.removeEventListener("pointerleave", leave);
      };
    });

    measure();
    const H = () => window.innerHeight;
    for (const c of counters) {
      if (c.top < window.scrollY + H() * 0.85) c.done = true;
      else format(c.el, 0);
    }

    let vy = window.scrollY;
    let drawnAt = Number.NaN;
    let last = performance.now();
    let raf = 0;

    const apply = (t: Target, p: number) => {
      if (Math.abs(p - t.last) < 0.002) return;
      t.last = p;
      const s = t.el.style;
      if (t.kind === "words") {
        const n = t.parts.length;
        t.parts.forEach((w, i) => {
          const k = ease(clamp(p * 1.7 - (i / Math.max(1, n)) * 0.7));
          w.style.opacity = String(k);
          w.style.transform = `translate3d(0, ${(1 - k) * 0.45}em, 0)`;
          w.style.filter = k < 1 ? `blur(${(1 - k) * 10}px)` : "";
        });
        return;
      }
      if (t.kind === "stagger") {
        t.parts.forEach((c, i) => {
          const k = ease(clamp(p * 1.6 - i * 0.14));
          c.style.opacity = String(k);
          c.style.transform = `translate3d(0, ${(1 - k) * 36}px, 0) var(--tilt, )`;
        });
        return;
      }
      const k = ease(p);
      const dx = t.kind === "left" ? -(1 - k) * 70 : t.kind === "right" ? (1 - k) * 70 : 0;
      const dy = t.kind === "up" ? (1 - k) * 40 : 0;
      s.opacity = String(k);
      s.transform = `translate3d(${dx}px, ${dy}px, 0) var(--tilt, )`;
    };

    const frame = (now: number) => {
      const dt = Math.min(64, now - last);
      last = now;
      const y = window.scrollY;
      vy += (y - vy) * (1 - Math.pow(0.84, dt / 16.7));
      if (Math.abs(y - vy) < 0.1) vy = y;
      raf = requestAnimationFrame(frame);
      if (vy === drawnAt) return;
      drawnAt = vy;
      const h = H();

      const maxScroll = document.documentElement.scrollHeight - h;
      for (const t of targets) {
        const end = Math.min(t.top - h * 0.5, maxScroll);
        const start = Math.min(t.top - h * 0.92, end - 40);
        apply(t, clamp((vy - start) / (end - start)));
      }

      if (hero) {
        const k = clamp(vy / (h * 0.55));
        hero.style.opacity = String(1 - k);
        hero.style.transform = `translate3d(0, ${-k * 90}px, 0) scale(${1 + k * 0.1})`;
        hero.style.filter = k > 0 && k < 1 ? `blur(${k * 8}px)` : "";
      }
      if (bar) {
        const max = document.documentElement.scrollHeight - h;
        bar.style.transform = `scaleX(${max > 0 ? clamp(vy / max) : 0})`;
      }
      for (const c of counters) {
        if (!c.done && c.top < vy + h * 0.8) {
          c.done = true;
          countUp(c.el);
        }
      }
    };
    raf = requestAnimationFrame(frame);

    const remeasure = new ResizeObserver(() => {
      measure();
      drawnAt = Number.NaN;
    });
    remeasure.observe(document.body);

    return () => {
      cancelAnimationFrame(raf);
      remeasure.disconnect();
      for (const off of tilts) off();
    };
  }, []);

  return null;
}
