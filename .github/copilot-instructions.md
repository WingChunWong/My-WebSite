# Project Guidelines

## Code Style

- **Formatter**: Use Biome for linting and formatting. Run `pnpm format` before committing.
- **TypeScript**: Strict mode enabled. See [tsconfig.json](../tsconfig.json) for configuration.
- **Naming**: Pages use kebab-case (`.astro`), components use PascalCase (`.vue`, `.astro`), utilities use kebab-case (`.ts`, `.mjs`).
- **Comments**: Use Chinese for UI-facing content, English for technical terms. See [homework.ts](../src/lib/homework.ts) for JSDoc style.

## Architecture

- **Framework**: Astro 5.x static site generator with Vue 3 for interactive components.
- **Content Flow**: Markdown files in `src/data/blog/` → validated by [content.config.ts](../src/content.config.ts) → rendered via `[...slug].astro`.
- **Vue Integration**: Pass SSR data to Vue components via props. Use `client:visible` for lazy loading. Example: [hw-list.astro](../src/pages/hw-list.astro).
- **Layouts**: All pages extend [BaseLayout.astro](../src/layouts/BaseLayout.astro), which handles global styles, navigation, and Fluent UI setup.
- **Custom Plugins**: [rehype-del-to-sub.mjs](../src/lib/rehype-del-to-sub.mjs) converts `~text~` to subscript and `^text^` to superscript. [remark-gemoji.mjs](../src/lib/remark-gemoji.mjs) converts `:emoji:` syntax.

## Build and Test

```bash
pnpm dev      # Start dev server at localhost:4321
pnpm build    # Production build
pnpm preview  # Preview production build
pnpm lint     # Lint with Biome
pnpm format   # Format with Biome
```

## Project Conventions

- **Homework Data**: Python crawler in `hw-list/` fetches data → `homework_data.json`. Astro reads this file and passes to Vue component. See [homework.ts](../src/lib/homework.ts) for type guards and validation.
- **Fluent UI**: Register web components in [fluent-init.ts](../src/lib/fluent-init.ts). Import this file in BaseLayout to apply globally.
- **Markdown**: Supports KaTeX math (`$...$`, `$$...$$`), GitHub alerts, callouts, and GFM. Configure in [astro.config.mjs](../astro.config.mjs).
- **Blog Posts**: Add numbered `.md` files to `src/data/blog/` with required frontmatter: `title`, `date`, `description`, `tags`, `cover`.

## Integration Points

- **Content Collections**: Use Astro's Content Collections API with Zod schemas in [content.config.ts](../src/content.config.ts).
- **Python Crawler**: Uses environment variables `PORTAL_USERNAME` and `PORTAL_PASSWORD`. Outputs JSON with schema defined in [homework.ts](../src/lib/homework.ts).

## Security

- Homework crawler credentials stored in environment variables, never commit to repository.
- Client-side file upload fallback in [HwList.vue](../src/components/vue/HwList.vue) when SSR data unavailable.
