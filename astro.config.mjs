import mdx from "@astrojs/mdx";
import { defineConfig } from "astro/config";
import rehypeCallouts from "rehype-callouts";
import { rehypeGithubAlerts } from "rehype-github-alerts";
import rehypeKatex from "rehype-katex";
import remarkDefinitionList from "remark-definition-list";
import remarkGfm from "remark-gfm";
import remarkMath from "remark-math";
import rehypeSupSubEnhancements from "./src/lib/rehype-del-to-sub.mjs";
import remarkGemoji from "./src/lib/remark-gemoji.mjs";

export default defineConfig({
  output: "static",
  integrations: [
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
