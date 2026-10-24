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

  // markdown-it 会在列表项的块级内容前后插入换行；正文开启 pre-wrap 后这些换行会变成
  // 可见空行（项目符号单独一行、文字缩进错位），这里统一剪掉列表项首尾的纯空白
  out = out.replace(/<li([^>]*)>\s+/g, '<li$1>').replace(/\s+<\/li>/g, '</li>')

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

/** 题库题干里的插图块：![题目插图](url) */
const IMAGE_BLOCK_RE = /^!\[[^\]]*\]\(\s*([^)\s]+)\s*\)$/

/**
 * 图片下方紧跟的短图注（如「第25题图（1）」「甲」）。
 * 题号、选项标记、以句末标点结尾的正文都不算图注，避免把后面的大题文字吞进图片格子里。
 */
function isCaptionBlock(text) {
  const value = String(text || '').trim()
  if (!value || value.length > 30) return false
  if (IMAGE_BLOCK_RE.test(value)) return false
  if (/^[#>*+|]|^[-+]\s|^\d+[.)、]|^[（(]\s*\d/.test(value)) return false
  // 选项行（A. …）是正文，不是图注
  if (/^[A-Fa-fＡ-Ｆ]\s*[.．)）、]/.test(value)) return false
  if (/[。；：？!?]$/.test(value)) return false
  return true
}

function escapeHtml(text) {
  return String(text)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/**
 * 题库题干里连续的多张插图在文件解析页是按网格排布的（2 图两列、3 图三列、
 * 4 图及以上每行两张），但直接渲染 Markdown 会一张一行竖向堆叠。
 * 这里把「图片 + 图下短图注」的连续块合并成网格，让搜索结果、我的题库与文件解析页样式一致。
 */
function groupImageBlocks(source) {
  const blocks = String(source || '').split(/(?:\r?\n){2,}/)
  const out = []
  for (let i = 0; i < blocks.length; i += 1) {
    if (!IMAGE_BLOCK_RE.test(blocks[i].trim())) {
      out.push(blocks[i])
      continue
    }
    const cells = []
    let cursor = i
    while (cursor < blocks.length) {
      const match = blocks[cursor].trim().match(IMAGE_BLOCK_RE)
      if (!match) break
      let caption = ''
      if (cursor + 1 < blocks.length && isCaptionBlock(blocks[cursor + 1])) {
        caption = blocks[cursor + 1].trim()
        cursor += 1
      }
      cells.push({ src: match[1], caption })
      cursor += 1
    }
    if (cells.length < 2) {
      out.push(blocks[i])
      if (cells[0]?.caption) out.push(blocks[i + 1])
      i = cursor - 1
      continue
    }
    const cols = cells.length >= 4 ? 2 : cells.length
    const html = cells
      .map(
        ({ src, caption }) =>
          `<figure class="md-image-cell"><img src="${escapeHtml(src)}" alt="" loading="lazy">` +
          (caption ? `<figcaption>${escapeHtml(caption)}</figcaption>` : '') +
          '</figure>'
      )
      .join('')
    out.push(`<div class="md-image-grid" data-cols="${cols}">${html}</div>`)
    i = cursor - 1
  }
  return out.join('\n\n')
}

/** 渲染整段 Markdown 且放行原始 HTML（题库题干里可能内嵌表格 HTML） */
export function renderRichMarkdown(text) {
  return renderWith(text, (source) => rich.render(groupImageBlocks(source)))
}

export default md
