import { defineConfig, type Plugin } from "vite";

const reactPlugin = (await import("@vitejs/plugin-react")).default;
const mdx = (await import("@mdx-js/rollup")).default;
const remarkFrontmatter = (await import("remark-frontmatter")).default;
const remarkMdxFrontmatter = (await import("remark-mdx-frontmatter")).default;
const remarkGfm = (await import("remark-gfm")).default;
const rehypePrettyCode = (await import("rehype-pretty-code")).default;
const rehypeCallouts = (await import("rehype-callouts")).default;
const { rehypeGithubAlerts } = await import("rehype-github-alerts");

const mdxPlugin = Object.assign(
  mdx({
    remarkPlugins: [
      remarkFrontmatter,
      [remarkMdxFrontmatter, { name: "frontmatter" }],
      remarkGfm,
    ],
    rehypePlugins: [
      rehypeGithubAlerts,
      rehypeCallouts,
      [
        rehypePrettyCode,
        {
          // use GitHub dark theme from shiki
          theme: "github-dark",
          // ensure empty lines are preserved so line numbers align
          onVisitLine: (node: {
            children: { type: string; value: string }[];
          }) => {
            if (node.children.length === 0) {
              node.children = [{ type: "text", value: " " }];
            }
          },
          // keep background so our CSS can override appearance
          keepBackground: true,
        },
      ],
    ],
  }),
  { enforce: "pre" },
) as Plugin;

const config = {
  plugins: [mdxPlugin, reactPlugin({ include: /\.(jsx|tsx)$/ })],
};

export default defineConfig(config);
