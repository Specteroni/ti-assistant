import { useId } from "react";

export default function CommoditySVG({ color }: { color?: string }) {
  const id = useId().replace(/:/g, "");
  const rimGradientId = `${id}-commodity-rim`;
  const glowGradientId = `${id}-commodity-glow`;
  const symbolGradientId = `${id}-commodity-symbol`;

  return (
    <svg
      width="100%"
      height="100%"
      version="1.1"
      viewBox="0 0 64 64"
      xmlns="http://www.w3.org/2000/svg"
    >
      <defs>
        <linearGradient id={rimGradientId} x1="10" x2="54" y1="8" y2="56">
          <stop stopColor={color ?? "#f8fafc"} offset="0" />
          <stop stopColor={color ?? "#9ca3af"} offset="0.45" />
          <stop stopColor={color ?? "#f1f5f9"} offset="1" />
        </linearGradient>
        <linearGradient id={glowGradientId} x1="8" x2="52" y1="54" y2="16">
          <stop stopColor="#f8fafc" offset="0" />
          <stop stopColor="#94a3b8" offset="0.58" />
          <stop stopColor="#e5e7eb" offset="1" />
        </linearGradient>
        <linearGradient id={symbolGradientId} x1="18" x2="49" y1="15" y2="45">
          <stop stopColor={color ?? "#f8fafc"} offset="0" />
          <stop stopColor={color ?? "#cbd5e1"} offset="0.58" />
          <stop stopColor={color ?? "#64748b"} offset="1" />
        </linearGradient>
      </defs>
      <circle cx="32" cy="32" r="29" fill={`url(#${glowGradientId})`} />
      <circle cx="32" cy="32" r="24" fill="#111827" />
      <circle
        cx="32"
        cy="32"
        r="24"
        fill="none"
        stroke={`url(#${rimGradientId})`}
        strokeWidth="6"
      />
      <path
        d="M45.6 17.8c-6.8-3.6-15.8-2.9-22.4 2.6-6.5 5.4-8.4 14-5.4 21.2l5-4.3c-1.2-4.5.2-9.6 4.2-12.9 4.1-3.4 9.8-3.7 14.2-1.1l-4.4 3.7 15.5 2.1-2.1-15.5z"
        fill={`url(#${symbolGradientId})`}
      />
      <path
        d="M18.4 46.2c6.8 3.6 15.8 2.9 22.4-2.6 6.5-5.4 8.4-14 5.4-21.2l-5 4.3c1.2 4.5-.2 9.6-4.2 12.9-4.1 3.4-9.8 3.7-14.2 1.1l4.4-3.7-15.5-2.1 2.1 15.5z"
        fill={`url(#${symbolGradientId})`}
      />
      <path
        d="M23.8 30.8 32 24l8.2 6.8L32 37.6z"
        fill="#020617"
        opacity="0.86"
      />
    </svg>
  );
}
