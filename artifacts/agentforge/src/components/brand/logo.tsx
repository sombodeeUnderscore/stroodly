import React from "react";

type LogoProps = {
  className?: string;
  size?: number;
};

export function StroodlyLogo({ className, size = 28 }: LogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 48 48"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-label="Stroodly"
    >
      <defs>
        <linearGradient id="stroodly-crust" x1="0" y1="0" x2="48" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="hsl(38 95% 62%)" />
          <stop offset="0.55" stopColor="hsl(28 90% 50%)" />
          <stop offset="1" stopColor="hsl(18 78% 36%)" />
        </linearGradient>
        <linearGradient id="stroodly-filling" x1="0" y1="0" x2="0" y2="48" gradientUnits="userSpaceOnUse">
          <stop offset="0" stopColor="hsl(42 100% 78%)" />
          <stop offset="1" stopColor="hsl(32 90% 62%)" />
        </linearGradient>
      </defs>
      <circle cx="24" cy="24" r="22" fill="url(#stroodly-filling)" opacity="0.22" />
      <path
        d="M24 6c9.94 0 18 8.06 18 18s-8.06 18-18 18c-8.28 0-15-6.72-15-15 0-6.9 5.6-12.5 12.5-12.5 5.75 0 10.42 4.67 10.42 10.42 0 4.78-3.88 8.66-8.66 8.66-3.98 0-7.2-3.22-7.2-7.2 0-3.31 2.68-6 6-6 2.76 0 5 2.24 5 5"
        stroke="url(#stroodly-crust)"
        strokeWidth="3.2"
        strokeLinecap="round"
        fill="none"
      />
      <circle cx="30" cy="24" r="1.8" fill="hsl(18 78% 36%)" />
    </svg>
  );
}
