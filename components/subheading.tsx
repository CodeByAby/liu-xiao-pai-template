import { cn } from "@/lib/utils";
import { MotionProps } from "framer-motion";
import React from "react";

type SubheadingTag = "p" | "span" | "div";

type SubheadingProps = {
  className?: string;
  as?: SubheadingTag;
  children: React.ReactNode;
} & MotionProps &
  React.HTMLAttributes<HTMLElement>;

export const Subheading = ({
  className,
  as: Tag = "p",
  children,
  ...props
}: SubheadingProps) => {
  return (
    <Tag
      className={cn(
        "text-sm md:text-base  max-w-4xl text-left my-4 mx-auto",
        "text-muted-foreground text-center font-normal",
        className
      )}
      {...props}
    >
      {children}
    </Tag>
  );
};
