/**
 * Poornima University mark for the student top bar.
 *
 * PLACEHOLDER: the repo has no official crest artwork, so this renders a plain
 * "PU" monogram roundel rather than an imitation of the crest. Swap the <svg>
 * for the university's official SVG (public/brand/pu-crest.svg) once supplied.
 */
export default function BrandMark({ size = 44 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      role="img"
      aria-label="Poornima University"
      className="shrink-0"
    >
      <circle cx="24" cy="24" r="23" fill="#12275f" />
      <circle cx="24" cy="24" r="19.5" fill="none" stroke="#bcd1ff" strokeWidth="1.2" />
      <text
        x="24"
        y="29.5"
        textAnchor="middle"
        fontFamily="ui-serif, Georgia, serif"
        fontSize="16"
        fontWeight="700"
        fill="#ffffff"
      >
        PU
      </text>
    </svg>
  );
}
