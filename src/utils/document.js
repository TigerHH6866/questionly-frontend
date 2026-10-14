import katex from 'katex'
import { renderMarkdown, renderInline } from './markdown'

/** 噪声块：页码、页眉页脚，不参与渲染与切分 */
const NOISE_TYPES = new Set(['page_number', 'page_footer', 'page_header'])

/** 主题号：1. / 1) / 1、 / 1． / 1） / 第1题 —— 只有这些才是新题的起点 */
const MAIN_START_RES = [
  /^\s*\d{1,3}\s*\\?[.)]/,
  /^\s*\d{1,3}\s*[、．）]/,
  /^\s*第\s*\d{1,3}\s*题/
]

/** 括号题号：(1) / （1）—— 通常是大题下的小题，不另起一题 */
const SUB_START_RE = /^\s*[（(]\s*\d{1,3}\s*[）)]/

/**
 * 取块内的 span 列表。
 * content_list_v2 的块形如 { type, content: { <type>_content: [span...] }, bbox }
 */
function spansOf(block) {
  const content = block.content || {}
  const spans = content[`${block.type}_content`]
  return Array.isArray(spans) ? spans : []
}

/**
 * 裸题号 "1." / "1)" 会被 markdown-it 当成有序列表，需转义其中的分隔符。
 * 括号号 "(1)" / "（1）" 不是列表标记，保持原样以便按小题识别。
 */
function escapeQuestionMarker(markdown) {
  return markdown.replace(/^(\s*)(\d{1,3})(\s*)([.)])/, (_, lead, num, gap, sep) => {
    return `${lead}${num}${gap}\\${sep}`
  })
}

/** 选择题选项标记：A. / A． / A) / A） */
const OPTION_MARK_RE = /(^|[\s\u3000])([A-DＡ-Ｄ])\s*([.．)）])/g

function toAsciiLetter(ch) {
  const code = ch.charCodeAt(0)
  return code >= 0xff21 && code <= 0xff3a ? String.fromCharCode(code - 0xfee0) : ch
}

/**
 * 选择题选项常被 OCR 挤在同一行（如 "A.5 B.6 C.8 D.9"），
 * 在选项标记前补段落换行，让每个选项独占一行。
 * 仅在字母按 A→B→C→D 递增时才处理，避免把正文中的普通字母误判成选项。
 */
function breakOptions(markdown) {
  if (!markdown) return markdown
  const marks = []
  OPTION_MARK_RE.lastIndex = 0
  let match
  while ((match = OPTION_MARK_RE.exec(markdown)) !== null) {
    marks.push({ at: match.index + match[1].length, letter: toAsciiLetter(match[2]) })
  }
  if (marks.length < 2) return markdown
  for (let i = 1; i < marks.length; i += 1) {
    if (marks[i].letter <= marks[i - 1].letter) return markdown
  }
  let out = markdown
  for (let i = marks.length - 1; i >= 0; i -= 1) {
    const before = out.slice(0, marks[i].at).replace(/[\s\u3000]+$/, '')
    out = before + (before ? '\n\n' : '') + out.slice(marks[i].at)
  }
  return out
}

/** 把块内 span 拼成 markdown 文本，行内公式还原成 $...$ 交给 markdown 渲染 */
function spansToMarkdown(block) {
  const joined = spansOf(block)
    .map((span) => {
      if (!span) return ''
      if (span.type === 'equation_inline') return `$${span.content ?? ''}$`
      return span.content ?? ''
    })
    .join('')
  return escapeQuestionMarker(joined)
}

function imagePathOf(block) {
  const path = block.content?.image_source?.path
  return typeof path === 'string' ? path : ''
}

/** 单块标准化，字段名以真实 MinerU 输出为准 */
function normalize(block) {
  const type = block.type
  switch (type) {
    case 'title':
      return { type, text: spansToMarkdown(block), level: block.content?.level ?? 2 }
    case 'table':
      return { type, html: block.content?.html ?? '' }
    case 'equation_interline':
      return { type, latex: block.content?.math_content ?? '' }
    case 'image':
      return { type, imgPath: imagePathOf(block) }
    default:
      return { type, text: breakOptions(spansToMarkdown(block)) }
  }
}

/**
 * content_list_v2（页 → 块 → span）摊平成有序块序列
 */
export function toBlocks(contentListV2) {
  const pages = Array.isArray(contentListV2) ? contentListV2 : []
  const blocks = []
  pages.forEach((page, pageIdx) => {
    if (!Array.isArray(page)) return
    page.forEach((block) => {
      if (!block || typeof block !== 'object' || !block.type) return
      if (NOISE_TYPES.has(block.type)) return
      blocks.push({ ...normalize(block), pageIdx })
    })
  })
  return blocks
}

function isTextBlock(block) {
  return block.type === 'paragraph' || block.type === 'title'
}

function isMainStart(block) {
  if (!isTextBlock(block)) return false
  const text = block.text || ''
  return MAIN_START_RES.some((re) => re.test(text))
}

function isSubStart(block) {
  return isTextBlock(block) && SUB_START_RE.test(block.text || '')
}

/**
 * 在线性块序列上按题号切分。
 * 有主题号时只按主题号切分，括号小题号（1）(2) 归入当前题目；
 * 整份文档没有主题号时，才退回按括号小题号切分。
 * 图片/表格等块归属到前一道题；首个题号之前的内容进 preamble。
 * 一个题号都没识别到时，整份文档作为单题兜底。
 */
export function splitQuestions(blocks) {
  const isStart = blocks.some(isMainStart) ? isMainStart : isSubStart
  const questions = []
  const preamble = []
  let current = null

  blocks.forEach((block) => {
    if (isStart(block)) {
      current = [block]
      questions.push(current)
      return
    }
    if (current) {
      current.push(block)
    } else {
      preamble.push(block)
    }
  })

  if (!questions.length) {
    return blocks.length
      ? { preamble: [], questions: [{ index: 0, blocks }], single: true }
      : { preamble: [], questions: [], single: true }
  }
  return {
    preamble,
    questions: questions.map((item, index) => ({ index, blocks: item })),
    single: false
  }
}

/** 渲染单个块为 HTML 片段 */
export function renderBlock(block, imagesBase) {
  switch (block.type) {
    case 'title':
      return block.text ? `<h3 class="blk-title">${renderInline(block.text)}</h3>` : ''
    case 'table':
      return block.html ? `<div class="blk-table">${block.html}</div>` : ''
    case 'equation_interline':
      return block.latex
        ? `<div class="blk-equation">${katex.renderToString(block.latex, {
            displayMode: true,
            throwOnError: false
          })}</div>`
        : ''
    case 'image':
      return block.imgPath
        ? `<figure class="blk-image"><img src="${imagesBase}${block.imgPath}" alt="" loading="lazy"></figure>`
        : ''
    default:
      return block.text ? `<div class="blk-para">${renderMarkdown(block.text)}</div>` : ''
  }
}

/** 渲染一道题（块数组）为 HTML */
export function renderQuestion(blocks, imagesBase) {
  return (blocks || []).map((block) => renderBlock(block, imagesBase)).join('')
}

/** 普通文本转 LaTeX 时需要转义的字符 */
const LATEX_ESCAPES = {
  '\\': '\\textbackslash{}',
  '{': '\\{',
  '}': '\\}',
  '$': '\\$',
  '&': '\\&',
  '#': '\\#',
  '%': '\\%',
  '_': '\\_',
  '~': '\\textasciitilde{}',
  '^': '\\textasciicircum{}'
}

/** 文本片段转义：先去掉 markdown 的转义反斜杠（如题号 "1\."），再转义 LaTeX 特殊字符 */
function plainToLatex(text) {
  return String(text ?? '')
    .replace(/\\([^\w\s])/g, '$1')
    .replace(/[\\{}$&#%_~^]/g, (ch) => LATEX_ESCAPES[ch])
}

/** 文本块转 LaTeX：已还原成 $...$ 的行内公式原样保留，其余部分转义 */
function spansToLatex(text) {
  const parts = String(text ?? '').split(/\$([^$\n]+?)\$/)
  return parts.map((part, i) => (i % 2 ? `$${part}$` : plainToLatex(part))).join('')
}

/** 表格 HTML 转 LaTeX tabular，单元格内的 $...$ 公式保留 */
function tableToLatex(html) {
  if (!html || typeof DOMParser === 'undefined') return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const table = doc.querySelector('table')
  if (!table) return ''
  const rows = [...table.querySelectorAll('tr')]
    .map((tr) => [...tr.querySelectorAll('th,td')].map((cell) => spansToLatex(cell.textContent).trim()))
    .filter((row) => row.length)
  if (!rows.length) return ''
  const cols = Math.max(...rows.map((row) => row.length))
  const body = rows
    .map((row) => {
      const cells = row.slice()
      while (cells.length < cols) cells.push('')
      return cells.join(' & ')
    })
    .join(' \\\\\n')
  return `\\begin{tabular}{${'l'.repeat(cols)}}\n${body}\n\\end{tabular}`
}

/**
 * 把一道题的块序列还原成 LaTeX 片段，用于复制到 LaTeX 编辑器。
 * 只输出题目本身，不套 \documentclass 外壳；图片用 \includegraphics、表格用 tabular。
 */
export function questionLatex(blocks, imagesBase = '') {
  const parts = []
  ;(blocks || []).forEach((block) => {
    switch (block.type) {
      case 'table': {
        const tabular = tableToLatex(block.html)
        if (tabular) parts.push(tabular)
        break
      }
      case 'equation_interline':
        if (block.latex) parts.push(`\\[\n${block.latex.trim()}\n\\]`)
        break
      case 'image':
        if (block.imgPath) parts.push(`\\includegraphics[width=0.6\\linewidth]{${imagesBase}${block.imgPath}}`)
        break
      default:
        if (block.text) parts.push(spansToLatex(block.text))
    }
  })
  return parts.join('\n\n')
}

/** 把一道题的块序列还原成 Markdown 文本，用于提交给分析接口 */
export function questionMarkdown(blocks, imagesBase = '') {
  const parts = []
  ;(blocks || []).forEach((block) => {
    switch (block.type) {
      case 'table':
        if (block.html) parts.push(block.html)
        break
      case 'equation_interline':
        if (block.latex) parts.push(`$$\n${block.latex}\n$$`)
        break
      case 'image':
        if (block.imgPath) parts.push(`![题目插图](${imagesBase}${block.imgPath})`)
        break
      default:
        if (block.text) parts.push(block.text)
    }
  })
  return parts.join('\n\n')
}

/**
 * 题库里已存的题干（Markdown 文本）还原成 LaTeX 片段，用于复制到 LaTeX 编辑器。
 * 与 questionLatex 同源，只是输入从块序列换成了 Markdown：块之间以空行分隔，
 * 逐块识别公式 / 图片 / 表格 HTML，其余按普通文本转义。
 */
export function markdownToLatex(markdown) {
  const parts = []
  String(markdown ?? '')
    .split(/\n{2,}/)
    .forEach((chunk) => {
      const piece = chunk.trim()
      if (!piece) return

      if (/^<table[\s\S]*<\/table>$/i.test(piece)) {
        const tabular = tableToLatex(piece)
        if (tabular) parts.push(tabular)
        return
      }
      const display = piece.match(/^\$\$([\s\S]+?)\$\$$/)
      if (display) {
        parts.push(`\\[\n${display[1].trim()}\n\\]`)
        return
      }
      const image = piece.match(/^!\[[^\]]*\]\((\S+)\)$/)
      if (image) {
        parts.push(`\\includegraphics[width=0.6\\linewidth]{${image[1]}}`)
        return
      }

      // 去掉 Markdown 的标题 / 列表标记，块内按行拆成独立段落
      const text = piece
        .split('\n')
        .map((line) => line.replace(/^\s*#{1,6}\s*/, '').replace(/^\s*[-*+]\s+/, '').trim())
        .filter(Boolean)
        .join('\n\n')
      if (text) parts.push(spansToLatex(text))
    })
  return parts.join('\n\n')
}
