import type { ComponentType } from "react";

/** Frontmatter metadata for a blog post */
export interface BlogFrontmatter {
  title: string;
  date: string;
  description?: string;
  tags?: string[];
  cover?: string;
}

/** A resolved blog post entry with its component and metadata */
export interface BlogPost {
  slug: string;
  frontmatter: BlogFrontmatter;
  Component: ComponentType;
}
