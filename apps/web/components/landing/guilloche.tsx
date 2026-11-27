const round = (n: number) => Math.round(n * 10) / 10;

const RING = Array.from({ length: 48 }, (_, i) => {
  const a = (i * 7.5 * Math.PI) / 180;
  return { cx: round(200 + 86 * Math.cos(a)), cy: round(200 + 86 * Math.sin(a)) };
});

const PETALS = Array.from({ length: 36 }, (_, i) => i * 5);

/**
 * Security-print rosette, the guilloche found on banknotes and passports: 48 circles whose centres
 * turn around one point, 36 ellipses turned every 5 degrees, and a double seal border, all in
 * hairlines. The overlap produces the moiré that makes such prints hard to copy.
 */
export function GuillocheRosette({ className, reveal = false }: { className?: string; reveal?: boolean }) {
  return (
    <svg viewBox="0 0 400 400" aria-hidden className={`${className ?? ""} ${reveal ? "guilloche-reveal" : ""}`} fill="none" stroke="currentColor">
      <g strokeWidth={0.5} vectorEffect="non-scaling-stroke">
        {RING.map(({ cx, cy }) => (
          <circle key={`${cx},${cy}`} cx={cx} cy={cy} r={104} vectorEffect="non-scaling-stroke" />
        ))}
        {PETALS.map((deg) => (
          <ellipse key={deg} cx={200} cy={200} rx={190} ry={62} transform={`rotate(${deg} 200 200)`} vectorEffect="non-scaling-stroke" />
        ))}
        <circle cx={200} cy={200} r={197} vectorEffect="non-scaling-stroke" />
        <circle cx={200} cy={200} r={193} vectorEffect="non-scaling-stroke" />
      </g>
    </svg>
  );
}

const WIDTH = 1200;

function wave(phase: number, amplitude: number, offset: number): string {
  const points: string[] = [];
  for (let x = 0; x <= WIDTH; x += 6) {
    const t = (x / WIDTH) * Math.PI * 2;
    const y = offset + amplitude * Math.sin(t * 3 + phase) + amplitude * 0.45 * Math.sin(t * 7 - phase * 1.7);
    points.push(`${x},${round(y)}`);
  }
  return `M${points.join("L")}`;
}

const BAND = Array.from({ length: 14 }, (_, i) => wave(i * 0.32, 26, 60 + i * 0.8));

/** A horizontal guilloche band of interleaved waves, used as a border motif on the drenched section. */
export function GuillocheBand({ className }: { className?: string }) {
  return (
    <svg viewBox={`0 0 ${WIDTH} 120`} preserveAspectRatio="none" aria-hidden className={className} fill="none" stroke="currentColor">
      {BAND.map((d, i) => (
        <path key={i} d={d} strokeWidth={0.6} vectorEffect="non-scaling-stroke" />
      ))}
    </svg>
  );
}
