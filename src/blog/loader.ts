/// <reference types="vite/client" />
import type { BlogFrontmatter, BlogPost } from "./types";

/**
 * Eagerly imports every .md / .mdx file under `src/content/blog/`
 * and returns a sorted (newest-first) list of BlogPost objects.
 */

// Vite glob import – eager so we can access frontmatter & default export
const modules = import.meta.glob<{
  frontmatter: BlogFrontmatter;
  default: React.ComponentType;
}>("../content/blog/**/*.{md,mdx}", { eager: true });

function slugFromPath(path: string): string {
  return path.replace("../content/blog/", "").replace(/\.(md|mdx)$/, "");
}

export function getAllPosts(): BlogPost[] {
  const posts: BlogPost[] = Object.entries(modules).map(([path, mod]) => ({
    slug: slugFromPath(path),
    frontmatter: mod.frontmatter ?? {
      title: slugFromPath(path),
      date: "1970-01-01",
    },
    Component: mod.default,
  }));

  // Sort by date descending (newest first)
  posts.sort(
    (a, b) =>
      new Date(b.frontmatter.date).getTime() -
      new Date(a.frontmatter.date).getTime(),
  );

  return posts;
}

export function getPostBySlug(slug: string): BlogPost | undefined {
  return getAllPosts().find((p) => p.slug === slug);
}
