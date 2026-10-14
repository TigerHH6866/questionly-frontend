/**
 * 一句话录音器
 *
 * 负责麦克风采集、实时音量分析与人声判定，并按两条时间规则自动结束：
 * 启动后 SILENT_MS 内始终没人说话 -> onSilent（放弃录音）；录音达到 MAX_MS -> onMaxDuration。
 * 结果以回调通知，UI 状态由调用方持有。
 */

/** 判定「有人声」的音量阈值（时域 RMS） */
const SPEECH_RMS = 0.02

/** 连续多少帧超过阈值才算开始说话，避免一次点击声误判 */
const SPEECH_FRAMES = 2

/** 启动后一直没说话就放弃的时长 */
const SILENT_MS = 5000

/** 单次录音最长时长 */
const MAX_MS = 30000

/** 音量回调节流间隔（约 16fps，足够画波形且不拖累渲染） */
const LEVEL_INTERVAL_MS = 60

export class VoiceRecorder {
  /**
   * @param {object} handlers
   * @param {(level:number)=>void} [handlers.onLevel] 音量，0~1
   * @param {()=>void} [handlers.onSilent] 启动后一直没说话
   * @param {()=>void} [handlers.onMaxDuration] 达到最长录音时长
   */
  constructor({ onLevel, onSilent, onMaxDuration } = {}) {
    this.onLevel = onLevel
    this.onSilent = onSilent
    this.onMaxDuration = onMaxDuration
    this.reset()
  }

  reset() {
    this.stream = null
    this.recorder = null
    this.audioCtx = null
    this.analyser = null
    this.buffer = null
    this.chunks = []
    this.rafId = 0
    this.levelAt = 0
    this.loudFrames = 0
    this.speaking = false
    this.silentTimer = null
    this.maxTimer = null
    this.finished = false
  }

  /** 申请麦克风并开始录音；权限被拒时抛出异常 */
  async start() {
    this.stream = await navigator.mediaDevices.getUserMedia({ audio: true })
    this.chunks = []

    this.recorder = new MediaRecorder(this.stream)
    this.recorder.ondataavailable = (event) => {
      if (event.data && event.data.size) this.chunks.push(event.data)
    }
    this.recorder.start()

    this.audioCtx = new AudioContext()
    this.analyser = this.audioCtx.createAnalyser()
    this.analyser.fftSize = 1024
    this.audioCtx.createMediaStreamSource(this.stream).connect(this.analyser)
    this.buffer = new Uint8Array(this.analyser.fftSize)

    this.loudFrames = 0
    this.speaking = false
    this.silentTimer = setTimeout(() => {
      if (!this.speaking) this.onSilent?.()
    }, SILENT_MS)
    this.maxTimer = setTimeout(() => this.onMaxDuration?.(), MAX_MS)

    this.loop()
  }

  /** 采样音量并通知回调 */
  loop() {
    if (this.finished) return
    this.rafId = requestAnimationFrame(() => this.loop())

    const now = performance.now()
    if (now - this.levelAt < LEVEL_INTERVAL_MS) return
    this.levelAt = now

    this.analyser.getByteTimeDomainData(this.buffer)
    let sum = 0
    for (let i = 0; i < this.buffer.length; i += 1) {
      const v = (this.buffer[i] - 128) / 128
      sum += v * v
    }
    const rms = Math.sqrt(sum / this.buffer.length)

    if (rms > SPEECH_RMS) {
      this.loudFrames += 1
      if (!this.speaking && this.loudFrames >= SPEECH_FRAMES) {
        this.speaking = true
        // 已开口，取消「一直没说话就放弃」的计时
        clearTimeout(this.silentTimer)
        this.silentTimer = null
      }
    } else {
      this.loudFrames = 0
    }

    this.onLevel?.(Math.min(1, rms * 6))
  }

  /**
   * 结束录音
   * @param {boolean} discard true 表示丢弃已录内容（静音超时放弃）
   * @returns {Promise<Blob|null>} 录音数据；discard 时为 null
   */
  async stop(discard = false) {
    if (this.finished) return null
    this.finished = true

    const recorder = this.recorder
    const type = (recorder && recorder.mimeType) || 'audio/webm'
    const done = new Promise((resolve) => {
      if (!recorder || recorder.state === 'inactive') {
        resolve()
        return
      }
      recorder.onstop = () => resolve()
      recorder.stop()
    })

    window.cancelAnimationFrame(this.rafId)
    clearTimeout(this.silentTimer)
    clearTimeout(this.maxTimer)
    await done
    await this.audioCtx?.close()
    this.stream?.getTracks().forEach((track) => track.stop())

    const blob = this.chunks.length ? new Blob(this.chunks, { type }) : null
    this.reset()
    return discard ? null : blob
  }
}
