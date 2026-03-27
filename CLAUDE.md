# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Build Commands

```bash
pnpm dev      # Dev server at localhost:4321
pnpm build    # Production build (static output)
pnpm preview  # Preview production build
pnpm lint     # Biome lint check
pnpm format   # Biome format with auto-write (run before committing)
```

## Code Style

- **Formatter**: Biome for linting and formatting
- **TypeScript**: Strict mode enabled
- **Naming**: Pages kebab-case (`.astro`), components PascalCase (`.astro`), utilities kebab-case (`.ts`, `.mjs`)
- **Locale**: Chinese (zh-CN) for UI-facing content, English for code comments and class names

## Architecture

### Framework Stack
- **Astro 6.x** static site generator with MDX integration
- **Fluent UI Web Components** for UI (registered in `src/lib/fluent-init.ts`)
- **Dark theme** with Fluent 2 design tokens

### Content Flow
- Blog: Markdown files in `src/data/blog/` → Zod-validated by `src/content.config.ts` → rendered via `src/pages/blog/[...slug].astro`
- Homework: Python crawler in `hw-list/` → `homework_data.json` → loaded at build-time via fetch

### Markdown Pipeline
Remark plugins (AST) run first, then rehype:
- `remark-gfm`, `remark-math`, `remark-definition-list`, `remark-gemoji` (custom)
- `rehype-github-alerts`, `rehype-callouts`, `rehype-katex`, `rehype-del-to-sub` (custom: converts `~digits~` to `<sub>`, `^text^` to `<sup>`)

### Layout System
All pages extend `src/layouts/BaseLayout.astro`, which provides:
- Global CSS design tokens (colors, spacing, typography)
- Navigation and Fluent UI initialization
- Mobile blocker overlay (768px breakpoint)

### Interactive Components
- Use Astro `define:vars` + vanilla JS for simple interactivity
- Client-side file upload fallback when SSR data unavailable

## Data Schema

**Homework (`HwItem`)**:
```typescript
{
  id: string | number;
  subject: string;
  homework_name: string;
  issue_date: string;  // YYYY-MM-DD
  due_date: string;    // YYYY-MM-DD
  class_group?: string;
  remarks?: string;
}
```

**Blog frontmatter**:
```yaml
title: string (required)
date: date (required)
description?: string
tags?: string[]
cover?: string
```

## Environment Variables

- `PORTAL_USERNAME`, `PORTAL_PASSWORD`: Credentials for the Python homework crawler (never commit)