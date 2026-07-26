import defaultMdxComponents from 'fumadocs-ui/mdx';
import type { MDXComponents } from 'mdx/types';
import type { ComponentProps } from 'react';

import { CONSOLE_URL } from '@/lib/layout.shared';

function ConsoleLink({ children, ...props }: ComponentProps<'a'>) {
  return (
    <a href={CONSOLE_URL} {...props}>
      {children}
    </a>
  );
}

export function getMDXComponents(components?: MDXComponents): MDXComponents {
  return { ...defaultMdxComponents, ConsoleLink, ...components };
}
