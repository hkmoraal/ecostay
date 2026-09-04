// Ecostay wordmark: leaf-in-pin mark + two-tone type.
// Wordmark uses Quicksand (loaded in index.html) so it scales crisply.

export function EcostayMark({ size = 36 }) {
  const h = size;
  const w = (size * 48) / 60;
  return (
    <svg width={w} height={h} viewBox="0 0 48 60" aria-hidden="true">
      <path
        d="M4 22 A20 20 0 1 1 44 22 Q40 41 24 58 Q8 41 4 22 Z"
        fill="#2EA36A"
      />
      <path
        d="M24 34 C 17 30, 17 20, 24.5 15 C 31 20, 30 30, 24 34 Z"
        fill="#EAF8F0"
      />
      <path
        d="M24.2 32 L26 18"
        stroke="#1E7A4D"
        strokeWidth="1.4"
        strokeLinecap="round"
        opacity="0.7"
        fill="none"
      />
    </svg>
  );
}

export default function Logo({ size = 32 }) {
  return (
    <span className="logo" style={{ ['--logo-size']: `${size}px` }}>
      <EcostayMark size={size * 1.25} />
      <span className="logo__word">
        <span className="logo__eco">eco</span>
        <span className="logo__stay">stay</span>
      </span>
    </span>
  );
}
