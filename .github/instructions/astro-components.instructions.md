---
description: "Use when creating or editing Astro components (.astro files). Covers define:vars data passing, Fluent UI web components, CSS scoping with :global(), design tokens, and inline script patterns."
applyTo: "src/**/*.astro"
---
# Astro Component Conventions

## Server → Client Data

Pass data via `define:vars` + `window` bridge. Two separate `<script>` blocks:

```astro
<script define:vars={{ serverProp }}>
  window.__myData = { serverProp };  // JSON-serializable only
</script>

<script>
  interface MyData { serverProp: string[] }
  const { serverProp } = (window as any).__myData as MyData;
  // Client logic here
</script>
```

Never put logic in the `define:vars` script — it cannot import modules.

## Fluent UI Components

Use Fluent web components for interactive elements. Register new ones in `src/lib/fluent-init.ts`.

```html
<fluent-button appearance="primary">操作</fluent-button>
<fluent-badge appearance="tint" color="brand">标签</fluent-badge>
<fluent-text size="700" weight="bold" block>标题</fluent-text>
```

Do NOT use raw `<button>`, `<input>`, `<select>` — use `fluent-button`, `fluent-text-input`, `fluent-select`.

## CSS Scoping

- Default: styles auto-scoped to component.
- Dynamic content (innerHTML): wrap selectors with `:global()`.
- Layout-level globals: use `<style is:global>`.

```css
/* Scoped — targets static elements in template */
.container { background: var(--colorNeutralBackground2); }

/* Global — targets dynamically inserted children */
.container :global(td) { padding: 10px 16px; }
.container :global(.overdue) { background: rgba(196, 49, 75, 0.1); }
```

## Design Tokens

Use CSS custom properties from BaseLayout — never raw hex values:

```css
background: var(--colorNeutralBackground3);
color: var(--colorNeutralForeground1);
border: 1px solid var(--colorNeutralStroke2);
border-radius: var(--borderRadiusLarge);
transition: all var(--durationNormal) var(--curveEasyEase);
```

Accent color is `var(--colorBrandForeground1)` (`#7ca6c4` muted slate blue).

## Canvas (if applicable)

Always handle high-DPI displays:

```typescript
const dpr = window.devicePixelRatio || 1;
const rect = canvas.getBoundingClientRect();
canvas.width = Math.floor(rect.width * dpr);
canvas.height = Math.floor(rect.height * dpr);
ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
```

## Script Patterns

- Define TypeScript types/interfaces inline in `<script>` blocks.
- Use module-level `let` for component state, functions to mutate + update DOM.
- No Vue — all interactivity is vanilla TypeScript.
- Locale: Chinese for user-facing strings, English for variable names and comments.
