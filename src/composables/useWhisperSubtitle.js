
import { ref, onUnmounted } from 'vue'

let whisperModule = null          // WASM 模块实例
let modelBuffer   = null          // 缓存模型

/* 加载 WASM + 模型（仅一次） */
/* 加载 WASM + 模型（仅一次） */
async function loadWhisper() {
  if (whisperModule) return whisperModule;
  if (isLoadingWhisper) {
    await new Promise(resolve => {
      const check = () => {
        if (whisperModule) resolve();
        else setTimeout(check, 100);
      };
      check();
    });
    return whisperModule;
  }

  isLoadingWhisper = true;
  try {
    // 加载WASM脚本
    await new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = '/whisper/libmain.js'; // 去掉 type="module"，避免作用域隔离
      script.onload = resolve;
      script.onerror = (e) => reject(new Error(`加载WASM脚本失败：${e.message}`));
      document.head.appendChild(script);
    });

    // 适配 libmain 导出格式（关键修复）
    await new Promise((resolve, reject) => {
      let checkCount = 0;
      const check = () => {
        // 适配三种常见导出格式
        if (window.libmain || window.whisper || window.Whisper) {
          resolve();
        } else if (checkCount > 20) {
          reject(new Error('WASM模块未导出全局变量（libmain/whisper/Whisper）'));
        } else {
          checkCount++;
          setTimeout(check, 100);
        }
      };
      check();
    });

    // 初始化模块（如果是对象直接用，不是函数就不调用）
    if (typeof window.libmain === 'function') {
      whisperModule = await window.libmain();
    } else {
      whisperModule = window.libmain || window.whisper || window.Whisper;
    }

    if (!whisperModule) {
      throw new Error('libmain.js 初始化失败，返回空');
    }

    // 加载模型
    const modelRes = await fetch('/whisper/ggml-tiny.bin');
    const modelBuf = new Uint8Array(await modelRes.arrayBuffer());
    if (whisperModule.init_model) {
      whisperModule.init_model(modelBuf);
    } else {
      throw new Error('WASM模块无 init_model 方法');
    }

    console.log('Whisper加载成功');
    return whisperModule;
  } catch (error) {
    console.error('加载Whisper失败：', error);
    isLoadingWhisper = false;
    throw error;
  } finally {
    isLoadingWhisper = false;
  }
}

/* 16 kHz 单声道 Float32 → 文字 */
export async function recognize(pcm) {
  if (!whisperModule) await loadWhisper()
  const n = pcm.length
  whisperModule.full(n, pcm)
  return whisperModule.get_text()
}

/* Vue 合成函数 */
export function useWhisperSubtitle(videoEl, onText) {
  const running = ref(false)
  let ctx = null
  let node = null
  let src  = null

  function start() {
    if (running.value) return
    running.value = true
    ctx = new (window.AudioContext || window.webkitAudioContext)({ sampleRate: 16000 })
    src = ctx.createMediaElementSource(videoEl)

    // 重采样到 16 kHz 单声道
    const resampler = ctx.createScriptProcessor(4096, 2, 1)
    resampler.onaudioprocess = async (e) => {
      const L = e.inputBuffer.getChannelData(0)
      const R = e.inputBuffer.numberOfChannels > 1 ? e.inputBuffer.getChannelData(1) : L
      const mono = new Float32Array(L.length)
      for (let i = 0; i < L.length; i++) mono[i] = (L[i] + R[i]) * 0.5
      const text = await recognize(mono)
      if (text.trim()) onText(text.trim())
    }
    src.connect(resampler)
    resampler.connect(ctx.destination)
  }

  function stop() {
    running.value = false
    if (src) src.disconnect()
    if (ctx) ctx.close()
  }

  onUnmounted(stop)
  return { start, stop, running }
}