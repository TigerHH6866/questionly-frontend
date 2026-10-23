import MarkdownIt from 'markdown-it'
import katex from 'katex'

// html:false 避免文档正文里的原始 HTML 被执行
const md = new MarkdownIt({ html: false, linkify: false, breaks: true })

// 题库题干里可能内嵌 OCR 直接给出的表格 HTML（<table>…），这类文本需要放行原始 HTML
const rich = new MarkdownIt({ html: true, linkify: false, breaks: true })

const TOKEN_PREFIX = 'KATEXPLACEHOLDER'

/**
 * 先把公式抽成占位符并交给 katex 渲染，markdown 渲染完再替换回去。
 * 这样无需实现 markdown-it 的 block/inline 规则，避免第三方 katex 插件的版本兼容问题。
 *
 * 需要同时兼容两种定界符：$...$ / $$...$$ 与 LaTeX 原生的 \(...\) / \[...\]。
 * 后者若不先抽走，markdown-it 会把 \( 当成转义的括号而吞掉反斜杠，公式就会以裸文本显示。
 */
function renderWith(text, renderer) {
  if (!text) return ''

  const maths = []
  const stash = (latex, displayMode) => {
    const token = TOKEN_PREFIX + maths.length + 'X'
    maths.push({
      token,
      html: katex.renderToString(latex, { displayMode, throwOnError: false })
    })
    return token
  }

  let out = String(text)
    // 块级公式 $$...$$ 与 \[...\]
    .replace(/\$\$([\s\S]+?)\$\$/g, (_, latex) => stash(latex.trim(), true))
    .replace(/\\\[([\s\S]+?)\\\]/g, (_, latex) => stash(latex.trim(), true))
    // 行内公式 $...$ 与 \(...\)（不跨行）
    .replace(/\$([^$\n]+?)\$/g, (_, latex) => stash(latex, false))
    .replace(/\\\(([^\n]+?)\\\)/g, (_, latex) => stash(latex, false))

  out = renderer(out)

  for (const { token, html } of maths) {
    out = out.split(token).join(html)
  }
  return out
}

/** 渲染整段 Markdown（块级） */
export function renderMarkdown(text) {
  return renderWith(text, (source) => md.render(source))
}

/** 渲染单行 Markdown（用于标题等行内场景） */
export function renderInline(text) {
  return renderWith(text, (source) => md.renderInline(source))
}

/** 渲染整段 Markdown 且放行原始 HTML（题库题干里可能内嵌表格 HTML） */
export function renderRichMarkdown(text) {
  return renderWith(text, (source) => rich.render(source))
}

export default md
