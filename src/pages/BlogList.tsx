import React, { useMemo } from 'react'
import { NavLink } from 'react-router-dom'
import { Title2, Body1, Caption1 } from '@fluentui/react-components'
import { getAllPosts } from '../blog/loader'

export default function BlogList() {
  const posts = useMemo(() => getAllPosts(), [])

  if (posts.length === 0) {
    return (
      <div className="blog-empty">
        <Title2 as="h2">Blog</Title2>
        <Body1>暫無文章。</Body1>
      </div>
    )
  }

  return (
    <div className="blog-list">
      <div className="blog-list-header">
        <Title2 as="h2">Blog</Title2>
        <Caption1 className="blog-count">{posts.length} 篇文章</Caption1>
      </div>

      <div className="blog-grid">
        {posts.map((post) => (
          <NavLink
            key={post.slug}
            to={`/blog/${post.slug}`}
            className="blog-card fui-Card"
          >
            {post.frontmatter.cover && (
              <div
                className="blog-card-cover"
                style={{ backgroundImage: `url(${post.frontmatter.cover})` }}
              />
            )}
            <div className="blog-card-body">
              <h3 className="blog-card-title">{post.frontmatter.title}</h3>
              {post.frontmatter.description && (
                <p className="blog-card-desc">{post.frontmatter.description}</p>
              )}
              <div className="blog-card-meta">
                <time dateTime={post.frontmatter.date}>
                  {new Date(post.frontmatter.date).toLocaleDateString('zh-CN', {
                    year: 'numeric',
                    month: 'long',
                    day: 'numeric',
                  })}
                </time>
                {post.frontmatter.tags && post.frontmatter.tags.length > 0 && (
                  <div className="blog-card-tags">
                    {post.frontmatter.tags.map((tag) => (
                      <span key={tag} className="blog-tag fui-Badge fui-Badge--ghost">
                        {tag}
                      </span>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </NavLink>
        ))}
      </div>
    </div>
  )
}
