import { gemoji } from "gemoji";
import { visit } from "unist-util-visit";

const emojiMap = {};

// Add gemoji (standard Unicode emoji)
gemoji.forEach((g) => {
  g.names.forEach((name) => {
    emojiMap[`:${name}:`] = g.emoji;
  });
});

// Add GitHub custom emoji (not in standard gemoji)
const githubCustomEmoji = {
  octocat: "🐙",
  "github-alt": "🐙",
  github: "🐙",
  "nerd-face": "🤓",
};

Object.entries(githubCustomEmoji).forEach(([name, emoji]) => {
  emojiMap[`:${name}:`] = emoji;
});

export default function remarkGemoji() {
  return (tree) => {
    visit(tree, "text", (node) => {
      let text = node.value;
      let modified = false;

      // Replace all emoji codes with emojis
      for (const [code, emoji] of Object.entries(emojiMap)) {
        const pattern = code.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
        const regex = new RegExp(pattern, "g");
        if (regex.test(text)) {
          text = text.replace(regex, emoji);
          modified = true;
        }
      }

      if (modified) {
        node.value = text;
      }
    });
  };
}
