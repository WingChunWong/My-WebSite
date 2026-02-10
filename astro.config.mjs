import mdx from "@astrojs/mdx";
import vue from "@astrojs/vue";
import { defineConfig } from "astro/config";
import rehypeCallouts from "rehype-callouts";
import { rehypeGithubAlerts } from "rehype-github-alerts";
import rehypePrettyCode from "rehype-pretty-code";
import remarkGfm from "remark-gfm";

export default defineConfig({
  output: "static",
  integrations: [
    vue({
      template: {
        compilerOptions: {
          // Tell Vue compiler that fluent-* tags are Web Components
          isCustomElement: (tag) => tag.startsWith("fluent-"),
        },
      },
    }),
    mdx(),
  ],
  markdown: {
    remarkPlugins: [remarkGfm],
    rehypePlugins: [
      rehypeGithubAlerts,
      rehypeCallouts,
      [
        rehypePrettyCode,
        {
          theme: "github-dark",
          keepBackground: true,
          onVisitLine(node) {
            if (node.children.length === 0) {
              node.children = [{ type: "text", value: " " }];
            }
          },
        },
      ],
    ],
  },
});
