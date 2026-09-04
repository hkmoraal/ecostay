// The signature element of Ecostay: 1 / 2 / 3 leaves = brons / zilver / goud.
// Used in cards, detail headers and the certification result. One component so
// the trust mark looks identical everywhere.

const FILL = ['#1E7A4D', '#2EA36A', '#4FBE86']; // forest, green, fresh
const EMPTY = '#DCE5DE';

function Leaf({ size = 24, fill = '#2EA36A', title }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      role={title ? 'img' : 'presentation'}
      aria-label={title}
      aria-hidden={title ? undefined : true}
    >
      <path d="M12 22 C 5 17, 5 8, 12 2 C 19 8, 19 17, 12 22 Z" fill={fill} />
      <path
        d="M12 19.5 L12 5"
        stroke="#F7F5EF"
        strokeWidth="1"
        strokeLinecap="round"
        opacity="0.55"
        fill="none"
      />
    </svg>
  );
}

export const LEVEL_LABELS = { 0: 'Nog niet gecertificeerd', 1: 'Brons', 2: 'Zilver', 3: 'Goud' };

export default function LeafRating({ level = 0, size = 22, showLabel = false, className = '' }) {
  const label = LEVEL_LABELS[level] || LEVEL_LABELS[0];
  return (
    <span className={`leaf-rating ${className}`} title={`${level} van 3 blaadjes — ${label}`}>
      <span className="leaf-rating__leaves" aria-hidden="true">
        {[0, 1, 2].map((i) => (
          <Leaf key={i} size={size} fill={i < level ? FILL[i] : EMPTY} />
        ))}
      </span>
      {showLabel && <span className="leaf-rating__label">{label}</span>}
      <span className="sr-only">{`${level} van 3 blaadjes, ${label}`}</span>
    </span>
  );
}

export { Leaf };
