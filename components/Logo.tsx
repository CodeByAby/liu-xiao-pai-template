"use client";
import Link from "next/link";
import React from "react";

export const Logo = () => {
  return (
    <Link
      href="/"
      className="font-normal flex space-x-2 items-center text-sm mr-4 text-foreground px-2 py-1 relative z-20"
    >
      <svg
        width="24"
        height="24"
        viewBox="0 0 24 24"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
        className="h-6 w-6"
      >
        {/* 教堂主体 */}
        <path
          d="M12 2L7 7V21H17V7L12 2Z"
          fill="currentColor"
          opacity="0.9"
        />
        {/* 教堂尖顶十字架 */}
        <path
          d="M12 0V2M11 1H13"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
        />
        {/* 教堂大门 */}
        <path
          d="M10.5 21V16C10.5 15.2 11.2 14.5 12 14.5C12.8 14.5 13.5 15.2 13.5 16V21"
          stroke="hsl(var(--background))"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {/* 教堂窗户 */}
        <circle
          cx="12"
          cy="10"
          r="1.5"
          stroke="hsl(var(--background))"
          strokeWidth="1"
          fill="none"
        />
        {/* 侧翼 */}
        <path
          d="M5 10L5 21H7V7M19 10L19 21H17V7"
          fill="currentColor"
          opacity="0.6"
        />
      </svg>
      <span className="font-medium text-foreground">Sistine AI</span>
    </Link>
  );
};
