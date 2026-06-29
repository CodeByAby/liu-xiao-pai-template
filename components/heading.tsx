import { cn } from "@/lib/utils";
import { MotionProps } from "framer-motion";
import React from "react";

type HeadingTag = "h1" | "h2" | "h3" | "h4" | "h5" | "h6";

type HeadingProps = {
  className?: string;
  as?: HeadingTag;
  children: React.ReactNode;
  size?: "sm" | "md" | "xl" | "2xl";
} & MotionProps &
  React.HTMLAttributes<HTMLHeadingElement>;

export const Heading = ({
  className,
  as: Tag = "h2",
  children,
  size = "md",
  ...props
}: HeadingProps) => {
  const sizeVariants = {
    sm: "text-xl md:text-2xl md:leading-snug",
    md: "text-3xl md:text-5xl md:leading-tight",
    xl: "text-4xl md:text-6xl md:leading-none",
    "2xl": "text-5xl md:text-7xl md:leading-none",
  };
  return (
    <Tag
      className={cn(
        "text-3xl md:text-5xl md:leading-tight max-w-5xl mx-auto text-center tracking-tight",
        "font-medium",
        "text-foreground",
        sizeVariants[size],
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
};
