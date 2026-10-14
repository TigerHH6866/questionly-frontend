import http from './http'

/** MediaRecorder 的 MIME 类型 -> 文件扩展名（后端按扩展名推断音频格式） */
const EXT_BY_TYPE = {
  'audio/webm': 'webm',
  'audio/ogg': 'ogg',
  'audio/mp4': 'm4a',
  'audio/mpeg': 'mp3',
  'audio/wav': 'wav'
}

function fileNameOf(blob) {
  const type = (blob.type || '').split(';')[0]
  return `voice.${EXT_BY_TYPE[type] || 'webm'}`
}

/**
 * 语音识别：上传录音片段，返回识别文本
 * @param {Blob} blob 录音数据
 */
export function recognizeAudio(blob) {
  const form = new FormData()
  form.append('audio', blob, fileNameOf(blob))
  return http.post('/asr/recognize', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  })
}
