import mdx from "@astrojs/mdx";
import vue from "@astrojs/vue";
import { defineConfig } from "astro/config";
import rehypeCallouts from "rehype-callouts";
import { rehypeGithubAlerts } from "rehype-github-alerts";
import rehypeKatex from "rehype-katex";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import remarkDefinitionList from "remark-definition-list";
import remarkGemoji from "./src/lib/remark-gemoji.mjs";
import rehypeSupSubEnhancements from "./src/lib/rehype-del-to-sub.mjs";

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
    mdx({
      remarkPlugins: [
        remarkGfm,
        remarkGemoji,
        remarkDefinitionList,
        [remarkMath, { singleDollarTextMath: true }],
      ],
      rehypePlugins: [
        rehypeGithubAlerts,
        rehypeCallouts,
        rehypeSupSubEnhancements,
        [rehypeKatex, { strict: "warn" }],
      ],
    }),
  ],
  markdown: {
    remarkPlugins: [
      remarkGfm,
      remarkGemoji,
      remarkDefinitionList,
      [remarkMath, { singleDollarTextMath: true }],
    ],
    // Temporarily disable rehype-pretty-code to avoid runtime errors
    rehypePlugins: [
      rehypeGithubAlerts,
      rehypeCallouts,
      rehypeSupSubEnhancements,
      [rehypeKatex, { strict: "warn" }],
    ],
  },
});
