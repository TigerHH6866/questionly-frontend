import katex from 'katex'
import { renderMarkdown, renderInline } from './markdown.js'

/** 噪声块：页码、页眉页脚、页边装订线文本（如试卷的「考号/姓名/班级/学校」），不参与渲染与切分 */
const NOISE_TYPES = new Set(['page_number', 'page_footer', 'page_header', 'page_aside_text'])

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

/**
 * 选择题选项标记：A. / A． / A) / A）
 * 字母前面可能是空白（"A.5 B.6"），也可能是紧邻的中文标点（"（ ）A. …"、"…温室。B. …"），
 * 所以只排除字母/数字/下划线与左括号，其余一律视为合法边界。
 */
const OPTION_MARK_RE = /(^|[^\w（(])([A-DＡ-Ｄ])\s*([.．)）])/g

function toAsciiLetter(ch) {
  const code = ch.charCodeAt(0)
  return code >= 0xff21 && code <= 0xff3a ? String.fromCharCode(code - 0xfee0) : ch
}

/**
 * 短选项并成一段的宽度上限（相对单位：行内公式记 2，中文记 1，其余记 0.5）。
 * 超过该值的选项属于长文本（语文/英语阅读等），源文件本就是每题一行，保持拆行。
 */
const MAX_INLINE_OPTION_WIDTH = 16

/** 估算一个选项的渲染宽度，用于判断是「短选项」还是「长文本选项」 */
function estimateOptionWidth(text) {
  // 行内公式统一折算成 2 个单位，避免 LaTeX 源码长度干扰判断
  const plain = String(text ?? '').replace(/\$[^$\n]*\$/g, '\u0002')
  let width = 0
  for (const ch of plain) {
    if (ch === '\u0002') width += 2
    else if (ch.charCodeAt(0) > 0x2e80) width += 1
    else width += 0.5
  }
  return width
}

/**
 * 选择题选项的排布（挤在一行 / 两两一行 / 每题一行）由源文件人工决定，
 * OCR 给出的换行并不可靠（同一行会被拆成多段，多行也会被并成一行），
 * 因此分两种情况处理：
 * 短选项把题干与选项分成两段，选项单独成组交给渲染层按宽度自适应排布；
 * 长文本选项仍保持每题一行，避免整段文字挤在一起、断句落在选项中间。
 * 仅在字母按 A→B→C→D 递增时才处理，避免把正文中的普通字母误判成选项。
 *
 * 返回 { text, head, options }：text 是完整 markdown（供分析接口与 LaTeX 使用），
 * head 是题干，options 是短选项组的选项数组（长文本选项时为 null）。
 */
function breakOptions(markdown) {
  if (!markdown) return { text: markdown, head: '', options: null }
  const marks = []
  OPTION_MARK_RE.lastIndex = 0
  let match
  while ((match = OPTION_MARK_RE.exec(markdown)) !== null) {
    marks.push({ at: match.index + match[1].length, letter: toAsciiLetter(match[2]) })
  }
  if (marks.length < 2) return { text: markdown, head: '', options: null }
  for (let i = 1; i < marks.length; i += 1) {
    if (marks[i].letter <= marks[i - 1].letter) return { text: markdown, head: '', options: null }
  }
  const head = markdown.slice(0, marks[0].at).trim()
  const options = marks.map((mark, i) => {
    const end = i + 1 < marks.length ? marks[i + 1].at : markdown.length
    return markdown.slice(mark.at, end).trim()
  })
  if (options.some((option) => estimateOptionWidth(option) > MAX_INLINE_OPTION_WIDTH)) {
    return { text: [head, ...options].filter(Boolean).join('\n\n'), head, options: null }
  }
  return {
    text: head + (head ? '\n\n' : '') + options.join('\u3000'),
    head,
    options
  }
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

/** 图片自带的图注（常见于「图1」「A」这类标识） */
function imageCaptionOf(block) {
  const content = block.content || {}
  const captions = content.image_caption || content.chart_caption || []
  return captions
    .map((item) => (typeof item?.content === 'string' ? item.content : ''))
    .join('')
    .trim()
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
    case 'chart':
      return {
        type: 'image',
        imgPath: imagePathOf(block),
        caption: imageCaptionOf(block),
        bbox: Array.isArray(block.bbox) ? block.bbox : null
      }
    default:
      return { type, ...breakOptions(spansToMarkdown(block)) }
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
    default: {
      if (!block.text) return ''
      // 短选项组用 flex 容器渲染：每行选项两端顶格，间距随行宽自适应
      if (!block.options || block.options.length < 2) {
        return `<div class="blk-para">${renderMarkdown(block.text)}</div>`
      }
      const head = block.head ? `<div class="blk-para">${renderMarkdown(block.head)}</div>` : ''
      const items = block.options
        .map((option) => `<span class="opt-item">${renderInline(option)}</span>`)
        .join('')
      return `${head}<div class="blk-para opt-grid">${items}</div>`
    }
  }
}

/** 独立的选项字母块：A. / B． / C) / D、 */
const OPTION_LABEL_RE = /^[（(]?[A-Fa-fＡ-Ｆ][）).．、]?$/

function optionLabelOf(block) {
  if (block.type !== 'paragraph') return ''
  const text = (block.text || '').trim()
  return OPTION_LABEL_RE.test(text) ? text : ''
}

function escapeHtml(text) {
  return String(text ?? '')
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

/** 选项字母 + 选项图片成对渲染：2 个两列、3 个三列、4 个及以上每行两个 */
function renderOptionGrid(pairs, imagesBase) {
  const cols = pairs.length === 3 ? 3 : 2
  const cells = pairs
    .map(
      (pair) =>
        `<div class="blk-option"><span class="blk-option-label">${pair.label}</span>${renderBlock(
          pair.image,
          imagesBase
        )}</div>`
    )
    .join('')
  return `<div class="blk-options" data-cols="${cols}">${cells}</div>`
}

/**
 * 把整段「A. 点燃酒精灯 B. 滴加液体 …」拆成选项数组；
 * 只认从 A 开始按字母顺序排列的形态，避免误判普通正文
 */
function splitOptionRow(text) {
  const raw = String(text || '').trim()
  if (!raw) return null
  const re = /(?:^|\s)([A-F])[.．、]\s*/g
  const marks = []
  let match
  while ((match = re.exec(raw))) {
    marks.push({ label: match[1], index: match.index, end: match.index + match[0].length })
  }
  if (marks.length < 2) return null
  if (marks.map((item) => item.label).join('') !== 'ABCDEF'.slice(0, marks.length)) return null
  return marks.map((mark, i) => ({
    label: mark.label,
    text: raw.slice(mark.end, i + 1 < marks.length ? marks[i + 1].index : raw.length).trim()
  }))
}

/** bbox 是 [x0, y0, x1, y1]，同一水平带（纵向重叠过半）视为同一行 */
function verticalOverlap(a, b) {
  if (!a || !b || a.length < 4 || b.length < 4) return false
  const height = Math.min(a[3] - a[1], b[3] - b[1])
  if (height <= 0) return false
  return (Math.min(a[3], b[3]) - Math.max(a[1], b[1])) / height >= 0.5
}

/** 连续图片按坐标还原成若干行；缺坐标时退回「2-3 张一行、4 张以上两两一行」 */
function groupImageRows(images) {
  if (!images.length) return []
  const useBbox = images.every((item) => item.bbox && item.bbox.length >= 4)
  if (!useBbox) {
    const perRow = images.length <= 3 ? images.length : 2
    const rows = []
    for (let i = 0; i < images.length; i += perRow) rows.push(images.slice(i, i + perRow))
    return rows
  }
  const rows = []
  images.forEach((image) => {
    const row = rows.find(
      (candidate) =>
        candidate.pageIdx === image.pageIdx &&
        candidate.items.some((item) => verticalOverlap(item.bbox, image.bbox))
    )
    if (row) {
      row.items.push(image)
    } else {
      rows.push({ pageIdx: image.pageIdx, items: [image] })
    }
  })
  return rows.map((row) => row.items.sort((a, b) => a.bbox[0] - b.bbox[0]))
}

/** 一行图片：图片按原顺序横排，图注（或选项字母+文字）贴在各自下方 */
function renderFigureRow(images, labels, imagesBase) {
  const cells = images
    .map((image, index) => {
      const label = labels?.[index]
      const caption = label
        ? `<span class="fig-label">${escapeHtml(label.label)}.</span> ${escapeHtml(label.text)}`
        : escapeHtml(image.caption || '')
      const img = image.imgPath
        ? `<img src="${imagesBase}${image.imgPath}" alt="" loading="lazy">`
        : ''
      if (!img && !caption) return ''
      return `<figure class="blk-figure">${img}${caption ? `<figcaption>${caption}</figcaption>` : ''}</figure>`
    })
    .filter(Boolean)
    .join('')
  return cells ? `<div class="blk-figure-row">${cells}</div>` : ''
}

/** 渲染一道题（块数组）为 HTML：连续图片按坐标还原行，图注/选项字母贴在图下 */
export function renderQuestion(blocks, imagesBase) {
  const parts = []

  for (let i = 0; i < blocks.length; i += 1) {
    const block = blocks[i]

    // MinerU 会把「A. [图]」拆成独立的字母块和图片块，成组还原成选项网格
    if (optionLabelOf(block) && blocks[i + 1]?.type === 'image') {
      const pairs = []
      let cursor = i
      while (cursor + 1 < blocks.length) {
        const label = optionLabelOf(blocks[cursor])
        if (!label || blocks[cursor + 1].type !== 'image') break
        pairs.push({ label, image: blocks[cursor + 1] })
        cursor += 2
      }
      if (pairs.length >= 2) {
        parts.push(renderOptionGrid(pairs, imagesBase))
        i = cursor - 1
        continue
      }
    }

    if (block.type === 'image') {
      const images = [block]
      let cursor = i + 1
      while (blocks[cursor]?.type === 'image') {
        images.push(blocks[cursor])
        cursor += 1
      }

      // 紧跟图片的整行选项标注，按顺序一一贴到图下
      let labels = null
      const next = blocks[cursor]
      if (next?.type === 'paragraph') {
        const parsed = splitOptionRow(next.text || '')
        if (parsed && parsed.length === images.length) {
          labels = parsed
          cursor += 1
        } else if (images.length === 1 && next.text?.trim() === (images[0].caption || '').trim()) {
          cursor += 1 // 图注被单独识别成一段，避免重复显示
        }
      }

      let offset = 0
      groupImageRows(images).forEach((row) => {
        const rowLabels = labels ? labels.slice(offset, offset + row.length) : null
        offset += row.length
        parts.push(renderFigureRow(row, rowLabels, imagesBase))
      })
      i = cursor - 1
      continue
    }

    parts.push(renderBlock(block, imagesBase))
  }

  return parts.join('')
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

/** 从 KaTeX 渲染节点取回原始 LaTeX（MathML 的 annotation 里存着源码） */
function katexSource(node) {
  return node.querySelector('annotation[encoding="application/x-tex"]')?.textContent || ''
}

/** 行内节点转 LaTeX：只额外认识编辑产生的下划线 / 着重号 / 斜体 / 加粗 */
function inlineNodeToLatex(node) {
  let out = ''
  node.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      out += plainToLatex(child.nodeValue)
      return
    }
    if (child.nodeType !== 1) return
    const tag = child.tagName
    if (child.classList?.contains('katex')) {
      const tex = katexSource(child)
      if (tex) out += child.closest('.katex-display') ? '\\[\n' + tex + '\n\\]' : '$' + tex + '$'
      return
    }
    switch (tag) {
      case 'IMG': {
        const src = child.getAttribute('src')
        if (src) out += `\\includegraphics[width=0.6\\linewidth]{${src}}`
        return
      }
      case 'BR':
        out += '\n'
        return
      case 'U':
        out += `\\underline{${inlineNodeToLatex(child)}}`
        return
      case 'EM':
      case 'I':
        out += `\\textit{${inlineNodeToLatex(child)}}`
        return
      case 'STRONG':
      case 'B':
        out += `\\textbf{${inlineNodeToLatex(child)}}`
        return
      case 'SPAN':
        out += child.classList?.contains('dot')
          ? `\\CJKunderdot{${inlineNodeToLatex(child)}}`
          : inlineNodeToLatex(child)
        return
      default:
        out += inlineNodeToLatex(child)
    }
  })
  return out
}

/** 块级节点转 LaTeX：表格 / 公式 / 图片各自成型，其余按行内处理 */
function blockNodeToLatex(node) {
  if (node.nodeType === 3) return plainToLatex(node.nodeValue).trim()
  if (node.nodeType !== 1) return ''
  const tag = node.tagName
  const cls = node.classList
  if (tag === 'TABLE') return tableToLatex(node.outerHTML)
  if (cls?.contains('blk-table')) return tableToLatex(node.innerHTML)
  if (cls?.contains('blk-equation')) {
    const tex = katexSource(node)
    return tex ? '\\[\n' + tex.trim() + '\n\\]' : ''
  }
  if (tag === 'FIGURE' || cls?.contains('blk-image')) {
    const src = node.querySelector('img')?.getAttribute('src')
    return src ? `\\includegraphics[width=0.6\\linewidth]{${src}}` : ''
  }
  return inlineNodeToLatex(node).trim()
}

/**
 * 编辑后的题干 HTML 转 LaTeX。
 * 只处理编辑产生的行内标记与原有的公式 / 图片 / 表格，其余按普通文本转义，
 * 输出风格与 questionLatex 保持一致。
 */
export function editedHtmlToLatex(html) {
  if (!html || typeof DOMParser === 'undefined') return ''
  const doc = new DOMParser().parseFromString(html, 'text/html')
  const parts = []
  doc.body.childNodes.forEach((node) => {
    const chunk = blockNodeToLatex(node)
    if (chunk) parts.push(chunk)
  })
  return parts.join('\n\n')
}

