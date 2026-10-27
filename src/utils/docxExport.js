/**
 * Word 导出预处理：把依赖 CSS Grid 的多列容器改写成表格。
 *
 * Word 不支持 CSS Grid / Flex，多图并排、带图选项、双栏材料若原样提交会退化成纵向堆叠；
 * 转成表格后 pandoc 会输出 Word 原生表格，尽量保留页面上的并排关系。
 * 纯文字选项（.opt-grid）不转表格，避免 Word 里出现多余边框。
 */

/** 需要转表格的容器；数字为缺少 data-cols 时的默认列数（0 表示按子元素数量） */
const GRID_RULES = [
  { selector: '.blk-images', cols: 2 },
  { selector: '.blk-options', cols: 2 },
  { selector: '.blk-labeled', cols: 2 },
  { selector: '.blk-cols', cols: 2 },
  { selector: '.blk-strip', cols: 0 }
]

/** 把容器的子元素按列数搬进表格，替换掉原容器 */
function toTable(container, fallbackCols) {
  const items = Array.from(container.children)
  if (items.length < 2) return

  const attrCols = Number(container.getAttribute('data-cols'))
  let cols = Number.isFinite(attrCols) && attrCols > 0 ? attrCols : fallbackCols
  if (!cols) cols = items.length
  cols = Math.min(cols, items.length, 3)
  if (cols < 2) return

  const doc = container.ownerDocument
  const table = doc.createElement('table')
  for (let i = 0; i < items.length; i += cols) {
    const row = doc.createElement('tr')
    items.slice(i, i + cols).forEach((item) => {
      const cell = doc.createElement('td')
      cell.appendChild(item)
      row.appendChild(cell)
    })
    // 末行不足时补齐空格，避免 Word 里最后一列被拉伸
    while (row.children.length < cols) {
      row.appendChild(doc.createElement('td'))
    }
    table.appendChild(row)
  }
  // 标记行：后端据此去掉表格边框并删除该行，使并排图片、分栏内容在 Word 中不带外框
  const markRow = doc.createElement('tr')
  const markCell = doc.createElement('td')
  markCell.setAttribute('colspan', String(cols))
  markCell.textContent = 'QLAYOUT'
  markRow.appendChild(markCell)
  table.appendChild(markRow)
  container.replaceWith(table)
}

/** 把页面渲染出的题目 HTML 转成适合交给 pandoc 的结构 */
export function toWordHtml(html) {
  const doc = new DOMParser().parseFromString(`<!DOCTYPE html><html><body>${html || ''}</body></html>`, 'text/html')
  GRID_RULES.forEach(({ selector, cols }) => {
    Array.from(doc.body.querySelectorAll(selector)).forEach((el) => toTable(el, cols))
  })
  return doc.body.innerHTML
}
