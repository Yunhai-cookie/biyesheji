import WHISPER from 'whisper.cpp-wasm'

let whisper = null          // 单例
let modelBuffer = null      // 缓存到内存，避免重复读 IndexedDB

/** 初始化（只跑一遍） */
export async function initWhisper() {
  if (whisper) return whisper
  whisper = await WHISPER()
  // 优先读缓存，没有再 fetch
  if (!modelBuffer) {
    const cache = await caches.open('whisper-model')
    let res = await cache.match('ggml-tiny.bin')
    if (!res) {
      const resp = await fetch('/whisper/ggml-tiny.bin')
      await cache.put('ggml-tiny.bin', resp.clone())
      res = resp
    }
    modelBuffer = new Uint8Array(await res.arrayBuffer())
  }
  whisper.init_model(modelBuffer)
  return whisper
}

/**
 * 把 16kHz/16bit 的 PCM 片段送进 Whisper
 * @param {Float32Array} pcm  必须是 16kHz
 * @returns {string}          识别出的文字
 */
export async function recognize(pcm) {
  if (!whisper) await initWhisper()
  // whisper.cpp 需要采样数
  const nSamples = pcm.length
  whisper.full(nSamples, pcm)
  return whisper.get_text()
}