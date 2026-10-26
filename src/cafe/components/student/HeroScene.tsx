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

const PINK_IDS = ['a', 'b', 'c'];
const LEAVES = ['#3f7a33', '#4f8a3c', '#2f6a2b', '#5e9a46'];

/** Gradients for the bracts; render once inside each SVG that draws flowers. */
function FlowerDefs({ uid }: { uid: string }) {
  return (
    <>
      <radialGradient id={`${uid}-bv-a`} cx="0.5" cy="0.35" r="0.75">
        <stop offset="0" stopColor="#ffd1e3" />
        <stop offset="0.45" stopColor="#f2559a" />
        <stop offset="1" stopColor="#c8185f" />
      </radialGradient>
      <radialGradient id={`${uid}-bv-b`} cx="0.5" cy="0.35" r="0.75">
        <stop offset="0" stopColor="#ffe0ec" />
        <stop offset="0.5" stopColor="#f77fb0" />
        <stop offset="1" stopColor="#de3a80" />
      </radialGradient>
      <radialGradient id={`${uid}-bv-c`} cx="0.5" cy="0.35" r="0.75">
        <stop offset="0" stopColor="#ffc2da" />
        <stop offset="0.5" stopColor="#e93d88" />
        <stop offset="1" stopColor="#b3124f" />
      </radialGradient>
    </>
  );
}

/** One papery bract: a rounded heart shape with a centre vein. */
const BRACT = 'M0 0 C-7 -3 -9 -12 -4 -16 C-1 -18 1 -18 4 -16 C9 -12 7 -3 0 0 Z';

/** A spray of bougainvillea: leaves underneath, three-bract flowers on top. */
function Bougainvillea({ uid, cx, cy, rx, ry, n, seed, size = 1 }: { uid: string; cx: number; cy: number; rx: number; ry: number; n: number; seed: number; size?: number }) {
  const r = rng(seed);
  const pos = () => {
    const a = r() * Math.PI * 2;
    const d = Math.sqrt(r());
    return [cx + Math.cos(a) * rx * d, cy + Math.sin(a) * ry * d] as const;
  };
  const leaves = Array.from({ length: Math.round(n * 0.55) }, (_, i) => {
    const [x, y] = pos();
    const k = size * (0.9 + r() * 0.5);
    return (
      <path
        key={`l${i}`}
        d="M0 0 C6 -6 16 -6 22 0 C16 6 6 6 0 0 Z"
        transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${Math.round(r() * 360)}) scale(${k.toFixed(2)})`}
        fill={LEAVES[i % LEAVES.length]}
      />
    );
  });
  const flowers = Array.from({ length: n }, (_, i) => {
    const [x, y] = pos();
    const k = size * (0.75 + r() * 0.6);
    const rot = r() * 120;
    const fill = `url(#${uid}-bv-${PINK_IDS[Math.floor(r() * PINK_IDS.length)]})`;
    return (
      <g key={`f${i}`} transform={`translate(${x.toFixed(1)} ${y.toFixed(1)}) rotate(${rot.toFixed(0)}) scale(${k.toFixed(2)})`}>
        {[0, 120, 240].map((a) => (
          <g key={a} transform={`rotate(${a})`}>
            <path d={BRACT} fill={fill} />
            <path d="M0 -1 V-13" stroke="#b0104e" strokeOpacity={0.35} strokeWidth={0.6} />
          </g>
        ))}
        <circle r={1.6} fill="#fff7d6" />
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

/** Line-art clouds and a few birds for the empty sky on the left of the hero. */
export function SkySketch({ className = '' }: { className?: string }) {
  const cloud = (x: number, y: number, s: number) => (
    <path
      key={`${x}-${y}`}
      transform={`translate(${x} ${y}) scale(${s})`}
      d="M0 20 C-2 10 8 4 16 8 C18 -2 34 -4 38 6 C46 2 56 8 54 18 C60 20 60 28 52 28 H4 C-4 28 -6 22 0 20 Z"
    />
  );
  return (
    <svg viewBox="0 0 520 140" fill="none" stroke={PALACE_STROKE} strokeWidth={1.3} strokeLinecap="round" className={className} aria-hidden>
      {cloud(20, 30, 1.1)}
      {cloud(250, 10, 1.3)}
      {cloud(420, 60, 0.9)}
      <path d="M150 60 q6 -6 12 0 q6 -6 12 0 M190 40 q5 -5 10 0 q5 -5 10 0 M120 90 q4 -4 8 0 q4 -4 8 0" />
    </svg>
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

const ARCH_W = 560;
const ARCH_H = 330;
const ARCH_D = archPath(ARCH_W, ARCH_H, 6);

/** Campus photo in the cusped jharokha arch, framed by bougainvillea. `uid` must be unique per instance. */
export function ArchPhoto({ className = '', uid = 'arch' }: { className?: string; uid?: string }) {
  // The flowers spill past the arch, so the SVG canvas is padded around it.
  const pad = { l: 70, r: 30, t: 24, b: 0 };
  const B = (p: Omit<Parameters<typeof Bougainvillea>[0], 'uid'>) => <Bougainvillea uid={uid} {...p} />;
  return (
    <svg
      viewBox={`${-pad.l} ${-pad.t} ${ARCH_W + pad.l + pad.r} ${ARCH_H + pad.t + pad.b}`}
      className={className}
      preserveAspectRatio="xMidYMax meet"
      aria-hidden
    >
      <defs>
        <clipPath id={`${uid}-clip`}>
          <path d={ARCH_D} />
        </clipPath>
        <FlowerDefs uid={uid} />
      </defs>
      <path d={ARCH_D} fill="#fff" transform="translate(-6 -6) scale(1.022)" opacity={0.95} />
      <image
        href="/brand/hero-campus.webp"
        x={-10}
        y={-4}
        width={ARCH_W + 20}
        height={ARCH_H + 8}
        preserveAspectRatio="xMidYMid slice"
        clipPath={`url(#${uid}-clip)`}
      />
      <path d={ARCH_D} fill="none" stroke="#f4a3c4" strokeWidth={3} strokeLinejoin="round" />
      {/* sprays hug the outside of the arch: left jamb, along the crown, top-right corner, right side */}
      {B({ cx: -34, cy: 200, rx: 36, ry: 150, n: 150, seed: 7, size: 0.62 })}
      {B({ cx: 6, cy: 96, rx: 40, ry: 50, n: 60, seed: 11, size: 0.6 })}
      {B({ cx: 70, cy: 30, rx: 50, ry: 26, n: 46, seed: 23, size: 0.55 })}
      {B({ cx: 190, cy: 2, rx: 46, ry: 14, n: 24, seed: 5, size: 0.5 })}
      {B({ cx: ARCH_W - 50, cy: 6, rx: 70, ry: 26, n: 60, seed: 17, size: 0.6 })}
      {B({ cx: ARCH_W + 4, cy: 130, rx: 22, ry: 110, n: 70, seed: 31, size: 0.55 })}
    </svg>
  );
}

/** Loose sprays for the left edge of the banner. */
export function EdgeFlowers({ className = '', uid = 'edge' }: { className?: string; uid?: string }) {
  return (
    <svg viewBox="0 0 90 420" className={className} aria-hidden>
      <defs>
        <FlowerDefs uid={uid} />
      </defs>
      <Bougainvillea uid={uid} cx={8} cy={60} rx={34} ry={50} n={40} seed={41} size={0.6} />
      <Bougainvillea uid={uid} cx={0} cy={250} rx={36} ry={70} n={50} seed={43} size={0.6} />
      <Bougainvillea uid={uid} cx={24} cy={390} rx={34} ry={30} n={26} seed={47} size={0.6} />
    </svg>
  );
}
