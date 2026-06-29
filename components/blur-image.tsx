"use client";

import clsx from "clsx";
import Image, { type ImageProps } from "next/image";
import React, { useState } from "react";

interface BlurImageProps extends Omit<ImageProps, "alt"> {
  alt?: string;
  objectFit?: React.CSSProperties["objectFit"];
}

export const BlurImage = ({
  height,
  width,
  src,
  className,
  objectFit,
  alt,
  ...rest
}: BlurImageProps) => {
  const [isLoading, setLoading] = useState(true);
  return (
    <Image
      className={clsx(
        "transition duration-300 transform",
        isLoading ? "blur-sm scale-105" : "blur-0 scale-100",
        className
      )}
      onLoad={() => setLoading(false)}
      src={src}
      width={width}
      height={height}
      loading="lazy"
      decoding="async"
      blurDataURL={typeof src === "string" ? src : undefined}
      style={objectFit ? { objectFit, ...rest.style } : rest.style}
      alt={alt ? alt : "Avatar"}
      {...rest}
    />
  );
};
