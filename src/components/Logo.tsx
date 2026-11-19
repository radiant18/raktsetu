export default function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 32 32" aria-hidden>
      <path d="M16 3c4.5 6 9 11 9 16a9 9 0 0 1-18 0c0-5 4.5-10 9-16z" fill="#c8102e" />
      <path d="M9 20h4l2-4 2.5 7 2-4H23" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
    </svg>
  );
}
