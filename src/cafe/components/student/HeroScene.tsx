/**
 * Decorative art for the student dashboard hero: line-art Rajasthani palace
 * sketches, the campus photo inside a cusped jharokha arch, bougainvillea
 * clusters and a street lamp. Everything is inline SVG generated here (no
 * extra assets beyond the campus photo), so it stays crisp at any size.
 */

const PALACE_STROKE = '#e2b79c';

/** Cusped (scalloped) Mughal arch over a rectangle, as an SVG path. */
function archPath(w: number, h: number, lobes = 5) {
  const spring = h * 0.5;
  const top = h * 0.07;
  const cx = w / 2;
  const at = (t: number): [number, number] => [
    cx * (1 - Math.cos((t * Math.PI) / 2)),
    spring - (spring - top) * Math.pow(Math.sin((t * Math.PI) / 2), 1.25),
  ];
  const left = Array.from({ length: lobes + 1 }, (_, i) => at(i / lobes));
  const right = [...left].reverse().map(([x, y]) => [w - x, y] as [number, number]);
  const f = (n: number) => n.toFixed(1);
  const arc = (a: [number, number], b: [number, number]) => {
    const r = Math.hypot(b[0] - a[0], b[1] - a[1]) * 0.56;
    return ` A${f(r)} ${f(r)} 0 0 1 ${f(b[0])} ${f(b[1])}`;
  };
  let d = `M0 ${h} L0 ${f(spring)}`;
  for (let i = 1; i < left.length; i++) d += arc(left[i - 1], left[i]);
  d += ` L${f(cx)} 0 L${f(w - left[lobes][0])} ${f(left[lobes][1])}`;
  for (let i = 1; i < right.length; i++) d += arc(right[i - 1], right[i]);
  return d + ` L${w} ${h} Z`;
}

/** Small deterministic PRNG so the flowers render identically on server and client. */
function rng(seed: number) {
  let s = seed >>> 0;
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return s / 2 ** 32;
  };
}

const PINKS = ['#e83e8c', '#f0619a', '#d6246e', '#f78fb7', '#ec4f8f'];
const LEAVES = ['#4f8a3c', '#3f7a33', '#6aa04f'];

/** A spray of bougainvillea: leaves underneath, papery three-bract flowers on top. */
function Bougainvillea({ cx, cy, rx, ry, n, seed }: { cx: number; cy: number; rx: number; ry: number; n: number; seed: number }) {
  const r = rng(seed);
  const pos = () => {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    return [cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d] as const;
  };
  const leaves = Array.from({ length: Math.round(n * 0.7) }, (_, i) => {
    const [x, y] = pos();
    return (
      <ellipse
        key={`l${i}`}
        cx={x}
        cy={y}
        rx={6 + r() * 4}
        ry={2.8 + r() * 1.6}
        transform={`rotate(${Math.round(r() * 180)} ${x.toFixed(1)} ${y.toFixed(1)})`}
        fill={LEAVES[i % LEAVES.length]}
      />
    );
  });
  const flowers = Array.from({ length: n }, (_, i) => {
    const [x, y] = pos();
    const s = 3.2 + r() * 2.6;
    const rot = r() * 120;
    const fill = PINKS[Math.floor(r() * PINKS.length)];
    return (
      <g key={`f${i}`} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(0)})`} fill={fill}>
        <circle cx={0} cy={-s * 0.6} r={s} />
        <circle cx={s * 0.55} cy={s * 0.35} r={s} />
        <circle cx={-s * 0.55} cy={s * 0.35} r={s} />
        <circle r={s * 0.35} fill="#fde7ef" />
      </g>
    );
  });
  return (
    <g>
      {leaves}
      {flowers}
    </g>
  );
}

/** Loose line drawing of a palace façade with a central dome and chhatris. */
export function PalaceSketch({ className = '' }: { className?: string }) {
  const chhatri = (x: number, y: number, s: number) => (
    <g key={`c${x}`} transform={`translate(${x} ${y}) scale(${s})`}>
      <path d="M-14 0 Q-14 -18 0 -26 Q14 -18 14 0 Z" />
      <path d="M0 -26 V-34" />
      <path d="M-16 0 H16 M-12 0 V22 M12 0 V22 M-16 22 H16" />
    </g>
  );
  const arches = (x0: number, y: number, count: number, w: number, h: number) =>
    Array.from({ length: count }, (_, i) => {
      const x = x0 + i * (w + 6);
      return <path key={`a${x0}-${i}`} d={`M${x} ${y + h} V${y + h * 0.45} Q${x} ${y} ${x + w / 2} ${y} Q${x + w} ${y} ${x + w} ${y + h * 0.45} V${y + h}`} />;
    });
  return (
    <svg viewBox="0 0 420 240" fill="none" stroke={PALACE_STROKE} strokeWidth={1.2} strokeLinecap="round" className={className} aria-hidden>
      {/* main dome */}
      <path d="M150 92 Q150 40 210 22 Q270 40 270 92 Z" />
      <path d="M210 22 V6 M204 12 H216" />
      <path d="M140 92 H280 M146 92 V104 H274 V92" />
      {/* side domes */}
      <path d="M62 120 Q62 92 92 82 Q122 92 122 120 Z M92 82 V72" />
      <path d="M298 120 Q298 92 328 82 Q358 92 358 120 Z M328 82 V72" />
      {chhatri(30, 128, 0.9)}
      {chhatri(390, 128, 0.9)}
      {chhatri(160, 104, 0.7)}
      {chhatri(260, 104, 0.7)}
      {/* façade */}
      <path d="M10 150 H410 M10 156 H410 M20 156 V240 M400 156 V240 M120 104 V150 M300 104 V150 M54 120 H130 M290 120 H366" />
      {arches(132, 112, 6, 20, 34)}
      {arches(30, 166, 6, 24, 40)}
      {arches(232, 166, 6, 24, 40)}
      {arches(54, 214, 12, 22, 26)}
      <path d="M190 166 V240 M230 166 V240 M190 186 Q210 162 230 186" />
    </svg>
  );
}

/** Victorian street lamp, line art with a warm glass. */
export function StreetLamp({ className = '' }: { className?: string }) {
  return (
    <svg viewBox="0 0 60 220" className={className} aria-hidden>
      <g stroke="#2c3443" strokeWidth={2} fill="none" strokeLinecap="round" strokeLinejoin="round">
        <path d="M30 8 V2 M24 10 H36 M18 24 L24 12 H36 L42 24 Z" fill="#2c3443" />
        <path d="M18 24 L22 56 H38 L42 24" fill="#fff6dc" />
        <path d="M30 24 V56 M20 40 H40" strokeWidth={1.2} />
        <path d="M16 56 H44 L40 64 H20 Z" fill="#2c3443" />
        <path d="M27 64 V196 M33 64 V196" />
        <path d="M30 80 q-10 6 -14 -2 M30 80 q10 6 14 -2" strokeWidth={1.4} />
        <path d="M24 120 H36 M24 160 H36" />
        <path d="M20 196 H40 L44 214 H16 Z" fill="#2c3443" />
      </g>
    </svg>
  );
}

const ARCH_W = 380;
const ARCH_H = 300;
const ARCH_D = archPath(ARCH_W, ARCH_H);

/** Campus photo in the jharokha arch with bougainvillea around its edges. */
export function ArchPhoto({ className = '' }: { className?: string }) {
  // The flowers spill past the arch, so the SVG canvas is padded around it.
  const pad = { l: 70, r: 50, t: 20, b: 0 };
  return (
    <svg
      viewBox={`${-pad.l} ${-pad.t} ${ARCH_W + pad.l + pad.r} ${ARCH_H + pad.t + pad.b}`}
      className={className}
      aria-hidden
    >
      <defs>
        <clipPath id="hero-arch">
          <path d={ARCH_D} />
        </clipPath>
      </defs>
      <path d={ARCH_D} fill="#fff" transform="translate(-6 -6) scale(1.032)" opacity={0.9} />
      <image
        href="/brand/hero-campus.webp"
        x={-40}
        y={10}
        width={470}
        height={296}
        preserveAspectRatio="xMidYMid slice"
        clipPath="url(#hero-arch)"
      />
      <path d={ARCH_D} fill="none" stroke="#e98a4b" strokeWidth={4} strokeLinejoin="round" />
      {/* bougainvillea: big spray down the left jamb, a small one at the crown, some on the right */}
      <Bougainvillea cx={-6} cy={150} rx={56} ry={110} n={120} seed={7} />
      <Bougainvillea cx={36} cy={52} rx={34} ry={26} n={34} seed={11} />
      <Bougainvillea cx={150} cy={4} rx={20} ry={12} n={14} seed={23} />
      <Bougainvillea cx={ARCH_W + 6} cy={250} rx={46} ry={46} n={60} seed={31} />
    </svg>
  );
}
