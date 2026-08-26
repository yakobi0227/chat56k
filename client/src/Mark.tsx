export default function Mark({ size = 48 }: { size?: number }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      aria-hidden="true"
      className="logo-mark"
    >
      <rect width="48" height="48" fill="#1c1814" />
      <rect x="3" y="3" width="42" height="34" fill="#3a3530" />
      <rect x="6" y="6" width="36" height="28" fill="#0c2e2a" />
      <text
        x="24"
        y="26"
        textAnchor="middle"
        fill="#ff7a18"
        fontFamily="Tahoma, sans-serif"
        fontSize="16"
        fontWeight="700"
      >
        99
      </text>
      <rect x="31" y="20" width="5" height="7" fill="#ff7a18" />
      <rect x="8" y="40" width="32" height="5" fill="#6a6358" />
      <rect x="20" y="39" width="8" height="3" fill="#2a2622" />
    </svg>
  );
}
