import katex from 'katex'
// mhchem 扩展提供 \ce{} 写法（H2O、CO2、SO4^2-），化学题可直接输入
import 'katex/contrib/mhchem'

/**
 * 公式在可编辑区域里的原子保护。
 *
 * KaTeX 渲染结果是一大堆嵌套 span，浏览器会把光标塞进视觉层里逐字符退格，
 * 导致根号、分数、上下标被拆散（表现为「回删后错位」）。
 * 这里把公式节点整体标记为不可编辑对象，并在键盘边界处整块删除。
 */

/** 公式节点选择器：行内公式与独立公式都算一个原子对象 */
const MATH_SELECTOR = '.katex, .katex-display'

/** 空上下标里的零宽占位：没有它光标无法停留在空的 <sup>/<sub> 内 */
const PLACEHOLDER = '\u200b'

/** 取光标所贴公式的最外层节点，避免只删掉 katex-display 内层的 katex 留下空壳 */
function outerMath(node) {
  if (!node || node.nodeType !== 1) return null
  return node.closest?.('.katex-display') || node.closest?.('.katex') || null
}

/**
 * 把 root 内所有公式标记为不可编辑原子节点，并记录原始 LaTeX。
 * 可重复调用：已经处理过的节点会被跳过属性写入，只补缺失的 data-tex。
 */
export function protectMath(root) {
  if (!root?.querySelectorAll) return
  root.querySelectorAll(MATH_SELECTOR).forEach((node) => {
    node.setAttribute('contenteditable', 'false')
    node.classList.add('math-node')
    if (!node.dataset.tex) {
      const tex = node.querySelector('annotation[encoding="application/x-tex"]')?.textContent
      if (tex) node.dataset.tex = tex
    }
  })
}

/** 光标前紧贴的公式节点 */
function mathBefore(range) {
  const node = range.startContainer
  const offset = range.startOffset
  let before = null
  if (node.nodeType === 3) {
    if (offset > 0) return null
    before = node.previousSibling
  } else {
    before = node.childNodes[offset - 1] || null
  }
  while (before && before.nodeType === 3 && !before.data) before = before.previousSibling
  return outerMath(before)
}

/** 光标后紧贴的公式节点 */
function mathAfter(range) {
  const node = range.startContainer
  const offset = range.startOffset
  let after = null
  if (node.nodeType === 3) {
    if (offset < node.data.length) return null
    after = node.nextSibling
  } else {
    after = node.childNodes[offset] || null
  }
  while (after && after.nodeType === 3 && !after.data) after = after.nextSibling
  return outerMath(after)
}

/** 删除一个节点并把光标放到它原来的位置 */
function removeNodeAt(node) {
  const parent = node.parentNode
  if (!parent) return false
  const at = Array.prototype.indexOf.call(parent.childNodes, node)
  node.remove()
  const range = document.createRange()
  range.setStart(parent, Math.min(at, parent.childNodes.length))
  range.collapse(true)
  const sel = window.getSelection()
  sel?.removeAllRanges()
  sel?.addRange(range)
  return true
}

/** 在 root 内取当前折叠选区；不在 root 内时返回 null */
function collapsedRangeIn(root) {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount || !sel.isCollapsed) return null
  const range = sel.getRangeAt(0)
  if (root && !root.contains(range.startContainer)) return null
  return range
}

/** 退格时若光标紧贴公式，整体删除公式；返回 true 表示已处理 */
export function deleteMathBeforeCaret(event, root) {
  const range = collapsedRangeIn(root)
  if (!range) return false
  const node = mathBefore(range)
  if (!node) return false
  event.preventDefault()
  return removeNodeAt(node)
}

/** Delete 键时若光标紧贴公式，整体删除公式；返回 true 表示已处理 */
export function deleteMathAfterCaret(event, root) {
  const range = collapsedRangeIn(root)
  if (!range) return false
  const node = mathAfter(range)
  if (!node) return false
  event.preventDefault()
  return removeNodeAt(node)
}

/* ------------------------------ 公式插入与编辑 ------------------------------ */

/** 取节点所在元素（文本节点则取父元素） */
function elementAt(node) {
  if (!node) return null
  return node.nodeType === 1 ? node : node.parentElement
}

/** 光标命中的公式节点（双击编辑用），返回最外层节点 */
export function mathNodeAt(target) {
  return outerMath(elementAt(target))
}

/** 渲染一个可直接插入编辑区的公式节点，与正文渲染链路保持同一套 KaTeX 配置 */
export function renderMathNode(latex, displayMode = false) {
  const holder = document.createElement('div')
  holder.innerHTML = katex.renderToString(latex, {
    displayMode,
    throwOnError: false,
    strict: false
  })
  const node = holder.firstElementChild
  if (!node) return null
  node.dataset.tex = latex
  return node
}

/** 记录当前选区（打开弹层前调用），不在 root 内时返回 null */
export function saveEditRange(root) {
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return null
  const range = sel.getRangeAt(0)
  if (root && !root.contains(range.commonAncestorContainer)) return null
  return range.cloneRange()
}

/**
 * 恢复选区：saved 已失效（节点被重渲染替换）时退回到 root 末尾，
 * 保证弹层提交后仍有确定的插入位置。
 */
export function restoreEditRange(root, saved) {
  if (!root) return null
  root.focus?.()
  const sel = window.getSelection()
  if (!sel) return null
  let range = null
  if (saved && root.contains(saved.startContainer) && root.contains(saved.endContainer)) {
    range = saved
  } else {
    range = document.createRange()
    range.selectNodeContents(root)
    range.collapse(false)
  }
  sel.removeAllRanges()
  sel.addRange(range)
  return range
}

/** 把光标放到节点之后 */
function caretAfter(node) {
  const sel = window.getSelection()
  if (!sel || !node?.parentNode) return
  const range = document.createRange()
  range.setStartAfter(node)
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}

/** 在 root 的光标处插入公式，返回新节点；saved 为打开弹层前的选区 */
export function insertMath(root, latex, saved) {
  const node = renderMathNode(latex)
  if (!root || !node) return null
  const range = restoreEditRange(root, saved)
  if (!range) return null
  range.deleteContents()
  range.insertNode(node)
  protectMath(root)
  caretAfter(node)
  return node
}

/** 用新的 LaTeX 替换已有公式节点（双击编辑），返回新节点 */
export function replaceMath(node, latex) {
  const parent = node?.parentNode
  if (!parent) return null
  const next = renderMathNode(latex, Boolean(node.closest?.('.katex-display')))
  if (!next) return null
  parent.replaceChild(next, node)
  const root = parent.closest?.('[data-math-edit]') || parent
  protectMath(root)
  caretAfter(next)
  return next
}

/* --------------------------------- 上下标 --------------------------------- */

/** 拆掉 <sup>/<sub> 标签，内容留在原处，光标落到内容末尾 */
function unwrapTag(tag) {
  const parent = tag.parentNode
  if (!parent) return
  const at = Array.prototype.indexOf.call(parent.childNodes, tag)
  const last = tag.lastChild
  while (tag.firstChild) parent.insertBefore(tag.firstChild, tag)
  parent.removeChild(tag)
  const sel = window.getSelection()
  if (!sel) return
  const range = document.createRange()
  if (last && last.parentNode === parent) {
    range.setStartAfter(last)
  } else {
    range.setStart(parent, Math.min(at, parent.childNodes.length))
  }
  range.collapse(true)
  sel.removeAllRanges()
  sel.addRange(range)
}

/**
 * 上标 / 下标开关：
 * - 选区非空：包进 <sup>/<sub>；已在同标签内则拆掉，在另一种标签内则原地换标签
 * - 光标折叠：在已有标签内按同上规则处理；在标签外插入空的上下标并停在里面
 */
export function toggleSupSub(root, tag) {
  const name = tag === 'sub' ? 'sub' : 'sup'
  const sel = window.getSelection()
  if (!root || !sel || !sel.rangeCount) return false
  const range = sel.getRangeAt(0)
  if (!root.contains(range.startContainer) || !root.contains(range.endContainer)) return false

  const holder = elementAt(range.startContainer)?.closest?.('sup, sub')
  const inside =
    holder && holder !== root && root.contains(holder) && holder.contains(range.endContainer)

  if (inside) {
    if (holder.nodeName.toLowerCase() === name) {
      unwrapTag(holder)
      protectMath(root)
      return true
    }
    // sup ↔ sub：换标签但保留内容
    const next = document.createElement(name)
    while (holder.firstChild) next.appendChild(holder.firstChild)
    holder.replaceWith(next)
    const caret = document.createRange()
    caret.selectNodeContents(next)
    sel.removeAllRanges()
    sel.addRange(caret)
    protectMath(root)
    return true
  }

  const node = document.createElement(name)
  if (range.collapsed) {
    node.appendChild(document.createTextNode(PLACEHOLDER))
    range.insertNode(node)
    const caret = document.createRange()
    caret.setStart(node.firstChild, 1)
    caret.collapse(true)
    sel.removeAllRanges()
    sel.addRange(caret)
  } else {
    node.appendChild(range.extractContents())
    range.insertNode(node)
    const next = document.createRange()
    next.selectNodeContents(node)
    sel.removeAllRanges()
    sel.addRange(next)
  }
  protectMath(root)
  return true
}

/* ------------------------------- 粘贴规范化 ------------------------------- */

/** 只有内容像 LaTeX（带反斜杠命令或上下标符号）时才把 $...$ 当公式 */
const LATEX_HINT_RE = /\\[a-zA-Z]+|[\^_{}]/

/** \(...\) / \[...\] / $$...$$ / $...$ */
const LATEX_SCAN_RE = /\\\(([^\n]+?)\\\)|\\\[([\s\S]+?)\\\]|\$\$([\s\S]+?)\$\$|\$([^$\n]+?)\$/g

const SUPER_RE = /^super$/i
const SUB_RE = /^sub$/i

function escapeText(text) {
  return String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
}

/** 纯文本里的公式定界符转成 KaTeX 节点；没有可转换的内容时返回 null */
function renderPastedLatex(text) {
  let out = ''
  let last = 0
  let changed = false
  LATEX_SCAN_RE.lastIndex = 0
  let match
  while ((match = LATEX_SCAN_RE.exec(text)) !== null) {
    const latex = match[1] ?? match[2] ?? match[3] ?? match[4] ?? ''
    const display = match[2] !== undefined || match[3] !== undefined
    const plainDollar = match[4] !== undefined
    if (plainDollar && !LATEX_HINT_RE.test(latex)) continue
    if (!latex.trim()) continue
    out += escapeText(text.slice(last, match.index)).replace(/\n/g, '<br>')
    out += katex.renderToString(latex.trim(), { displayMode: display, throwOnError: false, strict: false })
    last = match.index + match[0].length
    changed = true
  }
  if (!changed) return null
  return out + escapeText(text.slice(last)).replace(/\n/g, '<br>')
}

/**
 * Word / 网页复制出来的上下标是 <span style="vertical-align:super">，粘进编辑区后
 * 只是一个位置偏移的普通文字，退格与换行都会错位。这里统一换成 <sup>/<sub> 标签。
 * 返回是否真的做过替换，没有可规范化的内容时交给浏览器默认粘贴。
 */
function normalizeSupSub(holder) {
  let changed = false
  holder.querySelectorAll('[style]').forEach((el) => {
    const align = (el.style?.verticalAlign || '').trim()
    const tag = SUPER_RE.test(align) ? 'sup' : SUB_RE.test(align) ? 'sub' : ''
    if (!tag || el.tagName.toLowerCase() === tag) return
    const wrap = document.createElement(tag)
    while (el.firstChild) wrap.appendChild(el.firstChild)
    el.replaceWith(wrap)
    changed = true
  })
  return changed
}

/** 把 holder 里的节点插入到 range 处，光标停在插入内容之后 */
function insertHtmlAt(range, holder) {
  range.deleteContents()
  const frag = document.createDocumentFragment()
  let last = null
  while (holder.firstChild) {
    last = holder.firstChild
    frag.appendChild(last)
  }
  if (!last) return
  range.insertNode(frag)
  const sel = window.getSelection()
  if (!sel) return
  const caret = document.createRange()
  caret.setStartAfter(last)
  caret.collapse(true)
  sel.removeAllRanges()
  sel.addRange(caret)
}

/** Word / 网页复制的 HTML 里夹带的样式与元信息节点，粘进正文只会成为垃圾节点 */
function dropPasteJunk(holder) {
  holder.querySelectorAll('meta, style, link, title, xml').forEach((el) => el.remove())
}

/**
 * 粘贴规范化入口（绑定在 paste 事件上）：
 * 1. 富文本粘贴：Word 的上标 / 下标样式换成 <sup>/<sub> 标签
 * 2. 纯文本粘贴：带定界符的 LaTeX 直接渲染成公式
 * 返回 true 表示已接管粘贴（调用方需要再派发 input 事件同步编辑缓存）。
 */
export function normalizeMathPaste(event, root) {
  if (!root) return false
  const sel = window.getSelection()
  if (!sel || !sel.rangeCount) return false
  const range = sel.getRangeAt(0)
  if (!root.contains(range.startContainer)) return false
  const data = event.clipboardData
  if (!data) return false

  const html = data.getData('text/html')
  if (html) {
    const holder = document.createElement('div')
    holder.innerHTML = html
    dropPasteJunk(holder)
    if (!normalizeSupSub(holder)) return false
    event.preventDefault()
    insertHtmlAt(range, holder)
    return true
  }

  const text = data.getData('text/plain')
  const rendered = text ? renderPastedLatex(text) : null
  if (!rendered) return false
  event.preventDefault()
  const holder = document.createElement('div')
  holder.innerHTML = rendered
  insertHtmlAt(range, holder)
  return true
}
