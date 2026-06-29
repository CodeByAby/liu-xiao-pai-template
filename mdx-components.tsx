import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import Image, { type ImageProps } from 'next/image';

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return {
    ...defaultMdxComponents,
    Image: ({ alt = '', ...props }: ImageProps) => <Image alt={alt} {...props} />,
    ...components,
  };
}

// Keep useMDXComponents for blog MDX compatibility
export function useMDXComponents(components: MDXComponents) {
  return getMDXComponents(components);
}
