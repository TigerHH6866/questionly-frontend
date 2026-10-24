import html2canvas from 'html2canvas'
import { renderRichMarkdown } from './markdown'

/** 合成图长边固定 1024（等比缩放），用于视觉模型解题 */
const MAX_EDGE = 1024
/** 离屏渲染宽度：固定宽版式，保证截图字号与题目页一致 */
const RENDER_WIDTH = 900
/** JPEG 质量 */
const JPEG_QUALITY = 0.9
/** 截图放大倍数上限；长题按总像素回退，避免 canvas 过大 */
const MAX_CAPTURE_EDGE = 8000

/** 题干 Markdown 里是否带插图 */
export function hasQuestionImage(markdown) {
  return /!\[[^\]]*\]\(\s*[^)\s]+\s*\)/.test(String(markdown || ''))
}

/**
 * 等容器内的图片全部解码完成。
 * 图片必须先换成 CORS 请求，否则 canvas 会被标记为 tainted，toBlob 直接失败；
 * 任一图片加载失败都视为合成失败（调用方退回纯文本），避免发出缺图的卷面。
 */
async function loadImages(host) {
  const images = Array.from(host.querySelectorAll('img'))
  await Promise.all(
    images.map(
      (img) =>
        new Promise((resolve, reject) => {
          const src = img.getAttribute('src')
          if (!src) {
            resolve()
            return
          }
          const timer = setTimeout(() => fail('题目图片加载超时'), 10000)
          const cleanup = () => {
            clearTimeout(timer)
            img.removeEventListener('load', onLoad)
            img.removeEventListener('error', onError)
          }
          const onLoad = () => {
            cleanup()
            resolve()
          }
          const onError = () => {
            cleanup()
            fail('题目图片加载失败')
          }
          const fail = (msg) => reject(new Error(msg))
          img.addEventListener('load', onLoad)
          img.addEventListener('error', onError)
          // 重新挂载 src 才会按 CORS 模式重新请求；加参数避开浏览器里已缓存的无 CORS 响应
          img.removeAttribute('src')
          img.crossOrigin = 'anonymous'
          img.src = src + (src.includes('?') ? '&' : '?') + 'cors=1'
        })
    )
  )
}

/** 把题目 Markdown 合成一张 JPEG（不落盘，直接用于上传） */
export async function snapshotQuestion(markdown) {
  const host = document.createElement('div')
  host.style.cssText = [
    'position:fixed',
    'left:0',
    'top:0',
    'z-index:-1',
    'pointer-events:none',
    `width:${RENDER_WIDTH}px`,
    'padding:28px 32px',
    'box-sizing:border-box',
    'background:#ffffff',
    'color:#141413',
    'font-family:system-ui,-apple-system,"Segoe UI","PingFang SC","Microsoft YaHei",sans-serif',
    'font-size:15px',
    'line-height:1.85',
    // 截图统一按浅色卷面输出，避免深色主题下文字/表格线在白底上失去对比度
    '--c-dark:#141413',
    '--c-mid-gray:#6b6b66',
    '--c-border:#dcdcd6',
    '--c-subtle:#f7f6f2',
    '--c-surface:#ffffff',
    '--c-light-gray:#e8e6dc'
  ].join(';')
  host.innerHTML = renderRichMarkdown(markdown)
  document.body.appendChild(host)

  try {
    await loadImages(host)
    if (document.fonts && document.fonts.ready) {
      await document.fonts.ready
    }

    const width = host.scrollWidth || RENDER_WIDTH
    const height = host.scrollHeight || RENDER_WIDTH
    const scale = Math.min(2, MAX_CAPTURE_EDGE / Math.max(width, height))

    const canvas = await html2canvas(host, {
      backgroundColor: '#ffffff',
      useCORS: true,
      allowTaint: false,
      logging: false,
      scale
    })

    // 等比缩放到长边 1024
    const longEdge = Math.max(canvas.width, canvas.height)
    const ratio = MAX_EDGE / longEdge
    const out = document.createElement('canvas')
    out.width = Math.max(1, Math.round(canvas.width * ratio))
    out.height = Math.max(1, Math.round(canvas.height * ratio))
    const ctx = out.getContext('2d')
    ctx.fillStyle = '#ffffff'
    ctx.fillRect(0, 0, out.width, out.height)
    ctx.imageSmoothingQuality = 'high'
    ctx.drawImage(canvas, 0, 0, out.width, out.height)

    const blob = await new Promise((resolve) => out.toBlob(resolve, 'image/jpeg', JPEG_QUALITY))
    if (!blob) throw new Error('题目截图导出失败')
    return new File([blob], 'question.jpg', { type: 'image/jpeg' })
  } finally {
    host.remove()
  }
}
