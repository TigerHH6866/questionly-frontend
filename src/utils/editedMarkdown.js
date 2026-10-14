import TurndownService from 'turndown'

/**
 * AI 分析结果面板支持用户点击光标就地编辑，但 details 列要求 Markdown 格式，
 * 因此需要把编辑后的面板 HTML 转回 Markdown。
 *
 * KaTeX 渲染出来的 HTML 无法直接反转，改为从 MathML 的 annotation 节点里取回原始 LaTeX，
 * 还原成 \(...\) / \[...\] 定界符，避免公式在转换后退化成乱码。
 */
const turndown = new TurndownService({
  headingStyle: 'atx',
  bulletListMarker: '-',
  codeBlockStyle: 'fenced'
})

turndown.addRule('katex', {
  filter: (node) => node.nodeName === 'SPAN' && node.classList?.contains('katex'),
  replacement: (content, node) => {
    const tex = node.querySelector('annotation[encoding="application/x-tex"]')?.textContent
    if (!tex) return content
    return node.closest('.katex-display') ? `\n\n\\[${tex}\\]\n\n` : `\\(${tex}\\)`
  }
})

/** 面板 HTML -> Markdown */
export function toEditedMarkdown(html) {
  return turndown.turndown(html || '').trim()
}
