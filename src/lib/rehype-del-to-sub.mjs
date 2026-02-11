import { visit } from "unist-util-visit";
import { h } from "hastscript";

/**
 * Rehype 插件：在 HTML 层面处理下标、上标和定义列表
 *
 * 功能：
 * 1. 将单个数字的 <del> 标签转换为 <sub>（处理 H~2~O 语法）
 * 2. 处理文本中的上标语法 X^2^（转换为 <sup>）
 * 3. 增强定义列表的样式
 */
export default function rehypeSupSubEnhancements() {
  return (tree) => {
    // 第一步：处理 del -> sub 转换
    visit(tree, "element", (node) => {
      if (node.tagName !== "del") {
        return;
      }

      // 提取文本内容
      const text = extractText(node);

      // 如果是短数字内容，转换为 sub
      if (/^[\d]{1,2}$/.test(text.trim())) {
        node.tagName = "sub";
      }
    });

    // 第二步：处理文本中的上标语法
    visit(tree, "text", (node, index, parent) => {
      const text = node.value;

      // 检查是否包含上标语法
      if (!/\^[^\^\s]+\^/.test(text)) {
        return;
      }

      const children = [];
      let lastIndex = 0;
      const regex = /\^([^\^\s]+)\^/g;
      let match = regex.exec(text);

      while (match !== null) {
        // 添加之前的纯文本
        if (match.index > lastIndex) {
          children.push({
            type: "text",
            value: text.slice(lastIndex, match.index),
          });
        }

        // 添加上标元素
        children.push(
          h("sup", {}, [
            {
              type: "text",
              value: match[1],
            },
          ]),
        );

        lastIndex = regex.lastIndex;
        match = regex.exec(text);
      }

      // 添加剩余的文本
      if (lastIndex < text.length) {
        children.push({
          type: "text",
          value: text.slice(lastIndex),
        });
      }

      // 替换原始节点
      if (children.length > 0) {
        parent.children.splice(index, 1, ...children);
      }
    });

    // 第三步：增强定义列表的样式
    visit(tree, "element", (node, _index, _parent) => {
      // 查找输出的定义列表结构
      if (
        node.tagName === "div" &&
        node.children &&
        node.children.some((child) => child.tagName === "div")
      ) {
        // 检查这是否看起来像定义列表
        let isDefinitionList = false;
        for (let i = 0; i < node.children.length; i += 2) {
          const current = node.children[i];
          const next = node.children[i + 1];
          if (
            current &&
            current.tagName === "div" &&
            current.type !== "text" &&
            next &&
            next.tagName === "div" &&
            next.children &&
            next.children[0] &&
            next.children[0].tagName === "p"
          ) {
            isDefinitionList = true;
            break;
          }
        }

        // 如果是定义列表，添加适当的类名
        if (isDefinitionList) {
          node.properties = node.properties || {};
          node.properties.className = ["definition-list"];
        }
      }
    });
  };
}

/**
 * 从节点中提取文本内容
 */
function extractText(node) {
  if (node.type === "text") {
    return node.value;
  }
  if (node.children && Array.isArray(node.children)) {
    return node.children.map((child) => extractText(child)).join("");
  }
  return "";
}
