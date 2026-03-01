# Project Guidelines

## Code Style

- **Formatter**: Biome for linting and formatting. Run `pnpm format` before committing.
- **TypeScript**: Strict mode enabled. See [tsconfig.json](../tsconfig.json).
- **Naming**: Pages kebab-case (`.astro`), components PascalCase (`.astro`), utilities kebab-case (`.ts`, `.mjs`).
- **Locale**: Chinese (zh-CN) for UI-facing content, English for code comments and class names.

## Architecture

- **Framework**: Astro 5.x static site generator with Vue 3 for interactive islands.
- **Content Flow**: Markdown in `src/data/blog/` → Zod-validated by [content.config.ts](../src/content.config.ts) → rendered via `[...slug].astro`.
- **Component Islands**: Interactive components use Astro `define:vars` + vanilla JS (e.g., [HwList.astro](../src/components/HwList.astro)), or Vue with `client:visible` for lazy hydration.
- **Layouts**: All pages extend [BaseLayout.astro](../src/layouts/BaseLayout.astro), which provides global styles (80+ CSS design tokens), navigation, and Fluent UI initialization.
- **Custom Plugins**: [rehype-del-to-sub.mjs](../src/lib/rehype-del-to-sub.mjs) converts `~digits~` to `<sub>`, `^text^` to `<sup>`. [remark-gemoji.mjs](../src/lib/remark-gemoji.mjs) converts `:emoji:` syntax.

## Build and Test

```bash
pnpm dev      # Dev server at localhost:4321
pnpm build    # Production build (static output)
pnpm preview  # Preview production build
pnpm lint     # Biome lint check
pnpm format   # Biome format with auto-write
```

## UI Design

- **Theme**: Dark mode with Fluent 2 design tokens. Cool-tinted neutrals (`#1b1b1f` base), muted slate blue accent (`#7ca6c4`).
- **Colors**: All colors defined as CSS custom properties in BaseLayout.astro — use these tokens, not raw hex values.
- **Components**: Use Fluent UI web components (`fluent-button`, `fluent-badge`, etc.). Register new ones in [fluent-init.ts](../src/lib/fluent-init.ts).
- **Typography**: "Segoe UI Variable Display" system stack; "Cascadia Code" for monospace.
- **Mobile**: 768px breakpoint triggers mobile blocker overlay.

## Project Conventions

- **Homework Data**: Python crawler in `hw-list/` → `homework_data.json`. Astro reads at **build-time** via `readFileSync`, pre-computes filters, passes to [HwList.astro](../src/components/HwList.astro). Client-side file upload fallback when SSR data unavailable.
- **Fluent UI**: Register web components in [fluent-init.ts](../src/lib/fluent-init.ts). Imported globally by BaseLayout.
- **Markdown Pipeline**: Remark plugins (AST) run first, then rehype. GFM `~~text~~` → `<del>` gets converted to `<sub>`/`<sup>` by custom rehype plugin. Supports KaTeX math, GitHub alerts, callouts.
- **Blog Posts**: Add numbered `.md` files to `src/data/blog/` with frontmatter: `title` (required), `date` (required), `description`, `tags`, `cover`.
- **Date Format**: Use `YYYY-MM-DD` strings consistently across Python crawler output, TypeScript utilities, and filter logic.

## Integration Points

- **Content Collections**: Astro Content Collections API with Zod schemas in [content.config.ts](../src/content.config.ts).
- **Python Crawler**: Environment variables `PORTAL_USERNAME` and `PORTAL_PASSWORD`. Schema in [homework.ts](../src/lib/homework.ts).

## Security

- Crawler credentials in environment variables only — never commit.
- No secrets in client-side code or build output.
