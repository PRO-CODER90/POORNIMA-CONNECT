/**
 * Decorative pastel washes behind the student panel.
 *
 * The mock's illustrated set (watercolor washes, leaf sprigs, palace
 * silhouettes) is not in the repo yet, so this is the CSS fallback from the
 * brief: layered radial gradients. Edge decoration is `lg+` only so mobile
 * stays clean; one soft wash stays at the top on every breakpoint.
 */
export default function WatercolorBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 z-0 overflow-hidden">
      {/* top wash: pink left, sky right, a little butter in the middle */}
      <div className="absolute -top-40 left-1/2 h-[28rem] w-[64rem] max-w-[160vw] -translate-x-1/2 bg-[radial-gradient(closest-side,rgba(255,236,190,0.55),transparent)]" />
      <div className="absolute -left-32 -top-32 h-[26rem] w-[26rem] rounded-full bg-[radial-gradient(closest-side,rgba(248,187,208,0.55),transparent)]" />
      <div className="absolute -right-24 -top-36 h-[28rem] w-[30rem] rounded-full bg-[radial-gradient(closest-side,rgba(180,210,255,0.6),transparent)]" />

      {/* edges and bottom corners (desktop only) */}
      <div className="absolute -left-40 top-1/3 hidden h-[34rem] w-[22rem] rounded-full bg-[radial-gradient(closest-side,rgba(196,224,200,0.45),transparent)] lg:block" />
      <div className="absolute -right-40 top-1/3 hidden h-[34rem] w-[22rem] rounded-full bg-[radial-gradient(closest-side,rgba(255,214,170,0.45),transparent)] lg:block" />
      <div className="absolute -bottom-28 -left-24 hidden h-80 w-[28rem] rounded-full bg-[radial-gradient(closest-side,rgba(221,190,240,0.5),transparent)] lg:block" />
      <div className="absolute -bottom-28 -right-24 hidden h-80 w-[28rem] rounded-full bg-[radial-gradient(closest-side,rgba(255,200,180,0.5),transparent)] lg:block" />
    </div>
  );
}
