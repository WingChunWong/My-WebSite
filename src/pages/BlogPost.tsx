import React, { useMemo, useState, useRef, useCallback } from 'react'
import { useParams, NavLink } from 'react-router-dom'
import { Title1, Body1 } from '@fluentui/react-components'
import { getPostBySlug } from '../blog/loader'

/* ── Copy SVG icons ───────────────────────────────────────────── */
const CopyIcon = () => (
  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M0 6.75C0 5.784.784 5 1.75 5h1.5a.75.75 0 010 1.5h-1.5a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-1.5a.75.75 0 011.5 0v1.5A1.75 1.75 0 019.25 16h-7.5A1.75 1.75 0 010 14.25v-7.5z"/>
    <path d="M5 1.75C5 .784 5.784 0 6.75 0h7.5C15.216 0 16 .784 16 1.75v7.5A1.75 1.75 0 0114.25 11h-7.5A1.75 1.75 0 015 9.25v-7.5zm1.75-.25a.25.25 0 00-.25.25v7.5c0 .138.112.25.25.25h7.5a.25.25 0 00.25-.25v-7.5a.25.25 0 00-.25-.25h-7.5z"/>
  </svg>
)
const CheckIcon = () => (
  <svg width="16" height="16" fill="currentColor" viewBox="0 0 16 16">
    <path d="M13.78 4.22a.75.75 0 010 1.06l-7.25 7.25a.75.75 0 01-1.06 0L2.22 9.28a.75.75 0 011.06-1.06L6 10.94l6.72-6.72a.75.75 0 011.06 0z"/>
  </svg>
)

/** Map language names to Devicon icon names */
function getDeviconNameForLanguage(language: string): string | null {
  const mapping: Record<string, string> = {
    // Common languages as-is
    'typescript': 'typescript',
    'javascript': 'javascript',
    'python': 'python',
    'java': 'java',
    'csharp': 'csharp',
    'cpp': 'cplusplus',
    'c++': 'cplusplus',
    'c': 'c',
    'go': 'go',
    'rust': 'rust',
    'php': 'php',
    'ruby': 'ruby',
    'swift': 'swift',
    'kotlin': 'kotlin',
    'scala': 'scala',
    'r': 'r',
    'sql': 'mysql',
    'html': 'html5',
    'css': 'css3',
    'scss': 'sass',
    'sass': 'sass',
    'less': 'less',
    'json': 'json',
    'yaml': 'yaml',
    'yml': 'yaml',
    'xml': 'xml',
    'markdown': 'markdown',
    'bash': 'bash',
    'shell': 'bash',
    'docker': 'docker',
    'git': 'git',
    'graphql': 'graphql',
    'tsx': 'typescript',
    'jsx': 'javascript',
  }
  
  const normalized = language.toLowerCase().trim()
  return mapping[normalized] || null
}

/** Props shape for the <code> element inside a <pre> block */
interface CodeElementProps {
  className?: string
  'data-language'?: string
  children?: React.ReactNode
}

/** GitHub-style code block with language label + icon + copy button */
function CodeBlock({ children, language }: { children: React.ReactNode; language: string }) {
  const [copied, setCopied] = useState(false)
  const preRef = useRef<HTMLPreElement>(null)
  
  const deviconName = useMemo(() => getDeviconNameForLanguage(language), [language])
  const iconUrl = deviconName
    ? `https://cdn.jsdelivr.net/gh/devicons/devicon@latest/icons/${deviconName}/${deviconName}-original.svg`
    : null

  const handleCopy = useCallback(async () => {
    const text = preRef.current?.textContent ?? ''
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch { /* noop */ }
  }, [])

  return (
    <div className="blog-code-block">
      <div className="blog-code-header">
        <div className="blog-code-label">
          {iconUrl && (
            <img
              src={iconUrl}
              alt={language}
              className="blog-code-icon"
              loading="lazy"
            />
          )}
          <span className="blog-code-language">{language}</span>
        </div>
        <button className="blog-code-copy" onClick={handleCopy} aria-label="Copy code">
          {copied ? <><CheckIcon /><span>Copied!</span></> : <><CopyIcon /><span>Copy</span></>}
        </button>
      </div>
      <pre ref={preRef}>{children}</pre>
    </div>
  )
}

/**
 * Minimal component mapping — the `.markdown-body` wrapper class
 * handles all prose styling via CSS. We only override:
 *   • `pre` — wrap in CodeBlock container with copy button
 *   • `a`   — open external links in new tab
 *   • `img` — lazy loading
 */
const mdxComponents = {
  pre: ({ children, ...props }: React.HTMLAttributes<HTMLPreElement>) => {
    // rehype-pretty-code wraps code in <figure>; in that case children
    // arrives as a <code> element. Plain fenced blocks: <pre><code>…</code></pre>
    const codeEl = React.Children.only(children) as React.ReactElement<CodeElementProps>
    const lang = (codeEl.props?.className ?? '').replace(/language-/, '') ||
                 codeEl.props?.['data-language'] || 'plaintext'
    return <CodeBlock language={lang}>{children}</CodeBlock>
  },
  a: (props: React.AnchorHTMLAttributes<HTMLAnchorElement>) => (
    <a target="_blank" rel="noopener noreferrer" {...props} />
  ),
  img: (props: React.ImgHTMLAttributes<HTMLImageElement>) => (
    <img loading="lazy" {...props} />
  ),
}

export default function BlogPostPage() {
  const { slug } = useParams<{ slug: string }>()
  const post = useMemo(() => (slug ? getPostBySlug(slug) : undefined), [slug])

  if (!post) {
    return (
      <div className="blog-not-found">
        <Title1 as="h1">404</Title1>
        <Body1>找不到該文章。</Body1>
        <NavLink to="/blog" className="fui-Button fui-Button--secondary">
          ← 返回博客列表
        </NavLink>
      </div>
    )
  }

  const { frontmatter, Component } = post

  const MDXComponent = Component as React.ComponentType<{ components: typeof mdxComponents }>

  return (
    <article className="blog-article">
      <header className="blog-article-header">
        <NavLink to="/blog" className="blog-back-link">
          ← 返回博客列表
        </NavLink>
        <h1 className="blog-article-title">{frontmatter.title}</h1>
        <div className="blog-article-meta">
          <time dateTime={frontmatter.date}>
            {new Date(frontmatter.date).toLocaleDateString('zh-CN', {
              year: 'numeric',
              month: 'long',
              day: 'numeric',
            })}
          </time>
          {frontmatter.tags && frontmatter.tags.length > 0 && (
            <div className="blog-article-tags">
              {frontmatter.tags.map((tag) => (
                <span key={tag} className="blog-tag fui-Badge fui-Badge--ghost">
                  {tag}
                </span>
              ))}
            </div>
          )}
        </div>
        {frontmatter.description && (
          <p className="blog-article-desc">{frontmatter.description}</p>
        )}
      </header>

      <hr />

      <div className="markdown-body">
        <MDXComponent components={mdxComponents} />
      </div>
    </article>
  )
}
