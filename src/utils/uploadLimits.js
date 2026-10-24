/**
 * 上传文件的前端限制校验。
 * 图片（png / jpg / jpeg）不超过 10MB；PDF / Word 不超过 20MB；
 * PDF 与 docx 还要限制 50 页（页数在浏览器里读，避免把超大文档送去识别）。
 */

export const IMAGE_SIZE_LIMIT = 10 * 1024 * 1024
export const DOC_SIZE_LIMIT = 20 * 1024 * 1024
export const PAGE_LIMIT = 50

const IMAGE_EXTS = new Set(['png', 'jpg', 'jpeg'])

/**
 * 校验文件大小与页数。
 * @returns {Promise<string>} 通过时返回空串，否则返回 i18n 错误 key
 */
export async function checkUpload(file, ext) {
  const isImage = IMAGE_EXTS.has(ext)
  if (file.size > (isImage ? IMAGE_SIZE_LIMIT : DOC_SIZE_LIMIT)) {
    return isImage ? 'import.error.imageSize' : 'import.error.docSize'
  }
  const pages = await countPages(file, ext)
  if (pages !== null && pages > PAGE_LIMIT) return 'import.error.pages'
  return ''
}

/**
 * 读取文件页数，读不出来（加密、损坏、旧版 .doc）时返回 null，只靠大小限制兜底。
 * PDF 用 pdf-lib 解析；docx 是压缩包，页数记在 docProps/app.xml 的 <Pages> 里。
 */
async function countPages(file, ext) {
  try {
    if (ext === 'pdf') {
      const { PDFDocument } = await import('pdf-lib')
      const doc = await PDFDocument.load(await file.arrayBuffer(), { ignoreEncryption: true })
      return doc.getPageCount()
    }
    if (ext === 'docx') {
      const { default: JSZip } = await import('jszip')
      const zip = await JSZip.loadAsync(await file.arrayBuffer())
      const app = zip.file('docProps/app.xml')
      if (!app) return null
      const match = (await app.async('string')).match(/<Pages>(\d+)<\/Pages>/i)
      return match ? Number(match[1]) : null
    }
  } catch {
    return null
  }
  // .doc 是旧版二进制格式，浏览器无法读取页数
  return null
}
