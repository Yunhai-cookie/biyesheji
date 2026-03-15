<template>
  <div class="video-page-wrapper">
    <!-- 页面头部 -->
    <el-page-header 
      content="视频播放" 
      @back="$router.push('/video-course')"
      style="margin-bottom: 20px;"
    >
      <template #extra>
        <el-button type="text" @click="$router.push('/')">
          <el-icon><HomeFilled /></el-icon>
          返回首页
        </el-button>
      </template>
    </el-page-header>

    <div class="video-container">
      <!-- 加载中状态 -->
      <div v-if="isLoading" class="loading-tip">
        <el-icon class="is-loading" style="font-size: 50px; color: #409eff;">
          <Loading />
        </el-icon>
        <p>正在加载视频...</p>
      </div>
      
      <!-- 视频播放器区域 -->
      <div v-else-if="videoUrlToPlay" class="video-player-wrapper">
        <div class="video-wrapper" ref="videoWrapper">
          <video 
            ref="videoEl"
            class="video-player"
            :poster="videoPoster"
            @play="onVideoPlay"
            @pause="onVideoPause"
            @ended="onVideoEnded"
            @error="handleVideoError"
            @loadedmetadata="onVideoLoaded"
            @timeupdate="onTimeUpdate"
            @waiting="onVideoWaiting"
            @canplay="onVideoCanPlay"
          >
            <source :src="videoUrlToPlay" type="video/mp4">
            您的浏览器不支持视频播放
          </video>
          
          <!-- 自定义控制栏 -->
          <div class="video-controls" v-if="showControls">
            <!-- 进度条 -->
            <div class="progress-bar-wrapper">
              <el-slider
                v-model="currentProgress"
                :max="videoDuration"
                :step="0.1"
                :show-tooltip="false"
                @change="onProgressChange"
                class="progress-slider"
              />
              <div class="time-info">
                <span>{{ formatTime(currentTime) }}</span>
                <span>/</span>
                <span>{{ formatTime(videoDuration) }}</span>
              </div>
            </div>

            <!-- 控制按钮 -->
            <div class="controls-bar">
              <div class="controls-left">
                <el-button 
                  type="text" 
                  @click="togglePlay"
                  style="color: #fff;"
                >
                  <el-icon><VideoPause v-if="isPlaying" /><VideoPlay v-else /></el-icon>
                  {{ isPlaying ? '暂停' : '播放' }}
                </el-button>
                
                <el-button 
                  type="text" 
                  @click="toggleMute"
                  style="color: #fff;"
                >
                  <el-icon>
                    <svg v-if="isMuted" viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" style="width: 16px; height: 16px;">
                      <path fill="currentColor" d="M412.16 592.128L320 674.816l-45.44-45.312L366.592 546.88l-91.904-91.904 45.312-45.312 91.904 91.904 91.84-91.84 45.44 45.44-91.84 91.84zm151.04 0L512 674.816l-45.44-45.312L517.632 546.88l-91.904-91.904 45.312-45.312 91.904 91.904 91.84-91.84 45.44 45.44-91.84 91.84z"/>
                    </svg>
                    <svg v-else viewBox="0 0 1024 1024" xmlns="http://www.w3.org/2000/svg" style="width: 16px; height: 16px;">
                      <path fill="currentColor" d="M625.024 66.048l-265.728 162.56H128a64 64 0 0 0-64 64v405.632a64 64 0 0 0 64 64h231.296l265.728 162.56a64.064 64.064 0 0 0 96.768-55.552V121.6a64.064 64.064 0 0 0-96.768-55.552zM672 832.448l-193.728-118.528H128V310.08h350.272L672 191.552v640.896z"/>
                    </svg>
                  </el-icon>
                  {{ isMuted ? '取消静音' : '静音' }}
                </el-button>

                <el-select 
                  v-model="playbackRate" 
                  size="small" 
                  style="width: 100px; margin-left: 10px;"
                  @change="onPlaybackRateChange"
                  :popper-append-to-body="false"
                  popper-class="video-speed-select"
                >
                  <el-option label="0.5x" :value="0.5" />
                  <el-option label="0.75x" :value="0.75" />
                  <el-option label="1.0x" :value="1.0" />
                  <el-option label="1.25x" :value="1.25" />
                  <el-option label="1.5x" :value="1.5" />
                  <el-option label="2.0x" :value="2.0" />
                </el-select>
              </div>

              <div class="controls-right">
                <el-button 
                  type="text" 
                  @click="toggleFullscreen"
                  style="color: #fff;"
                >
                  <el-icon><FullScreen /></el-icon>
                  {{ isFullscreen ? '退出全屏' : '全屏' }}
                </el-button>
              </div>
            </div>
          </div>
          
          <!-- 弹幕容器 -->
          <div class="danmaku-container" ref="danmakuContainer"></div>
          
          <!-- AI字幕 -->
          <div class="subtitle-layer" v-if="currentSubtitle && subtitleRunning">
            {{ currentSubtitle }}
          </div>

          <!-- 连接状态提示 -->
          <div v-if="connectionStatus" class="connection-status">
            <el-tag :type="connectionStatus.type" size="small">{{ connectionStatus.text }}</el-tag>
          </div>

          <!-- 加载提示 -->
          <div v-if="isBuffering" class="buffering-tip">
            <el-icon class="is-loading"><Loading /></el-icon>
            <span>缓冲中...</span>
          </div>

          <!-- 快捷键提示（临时显示） -->
          <transition name="fade">
            <div v-if="showKeyboardHint" class="keyboard-hint-overlay">
              <div class="keyboard-hint-content">
                <h4>键盘快捷键</h4>
                <div class="hint-list">
                  <div><kbd>空格</kbd> / <kbd>K</kbd>：播放/暂停</div>
                  <div><kbd>←</kbd> <kbd>→</kbd>：快退/快进 5秒</div>
                  <div><kbd>↑</kbd> <kbd>↓</kbd>：音量调节</div>
                  <div><kbd>M</kbd>：静音</div>
                  <div><kbd>F</kbd>：全屏</div>
                  <div><kbd>0-9</kbd>：跳转到 0%-90%</div>
                </div>
              </div>
            </div>
          </transition>

          <!-- 快捷键操作提示（临时显示） -->
          <transition name="fade">
            <div v-if="showHintMessage" class="hint-message">
              {{ hintMessage }}
            </div>
          </transition>
        </div>

        <!-- 视频信息 -->
        <div class="video-info" v-if="route.query.chapterTitle">
          <h3>{{ route.query.chapterTitle }}</h3>
        </div>
      </div>

      <!-- 无视频地址提示 -->
      <div v-else class="empty-tip">
        <el-empty description="未获取到视频地址，请选择正确的章节">
          <el-button type="primary" @click="$router.push('/video-course')">
            返回课程列表
          </el-button>
        </el-empty>
      </div>

      <!-- 控制面板 -->
      <el-card v-if="videoUrlToPlay" class="control-panel" shadow="hover">
        <template #header>
          <div class="card-header">
            <span>播放控制</span>
          </div>
        </template>
        
        <div class="control-buttons">
          <!-- 弹幕输入 -->
          <div class="danmaku-input-group">
            <el-input 
              v-model="danmakuText" 
              placeholder="输入弹幕内容" 
              @keyup.enter="sendDanmaku"
              clearable
            >
              <template #prepend>弹幕</template>
            </el-input>
            <el-button type="primary" @click="sendDanmaku" :icon="ChatLineRound">
              发送
            </el-button>
          </div>

          <!-- AI字幕控制 -->
          <div class="subtitle-control">
            <el-button 
              type="warning" 
              @click="toggleSubtitle"
              :disabled="isSubtitleProcessing"
              :loading="isSubtitleProcessing"
            >
              <el-icon><VideoPause v-if="subtitleRunning" /><VideoPlay v-else /></el-icon>
              {{ subtitleRunning ? '关闭AI字幕' : '开启AI字幕' }}
            </el-button>
            <span v-if="subtitleRunning" class="subtitle-status">
              <el-tag type="success" size="small">字幕运行中</el-tag>
            </span>
          </div>

          <!-- 键盘快捷键帮助 -->
          <div class="keyboard-help">
            <el-button 
              type="info" 
              size="small" 
              @click="showKeyboardHelp"
              plain
            >
              <el-icon><InfoFilled /></el-icon>
              快捷键帮助
            </el-button>
          </div>
        </div>
      </el-card>
    </div>
  </div>
</template>

<script setup>
import { ref, onMounted, onUnmounted, watch, computed } from 'vue';
import { useRoute } from 'vue-router';
import { ElMessage, ElMessageBox } from 'element-plus';
import { 
  HomeFilled, 
  Loading, 
  VideoPlay, 
  VideoPause,
  FullScreen,
  ChatLineRound,
  InfoFilled
} from '@element-plus/icons-vue';

// 基础变量
const route = useRoute();
const originalVideoUrl = ref('');
const videoUrlToPlay = ref('');
const processedVideoUrl = ref('');
const videoEl = ref(null);
const videoWrapper = ref(null);
const danmakuContainer = ref(null);
const danmakuText = ref('');
const isLoading = ref(true);
const hasTriedBlob = ref(false);
const videoPoster = ref(''); // 视频封面

// 播放器状态
const isPlaying = ref(false);
const isMuted = ref(false);
const isFullscreen = ref(false);
const isBuffering = ref(false);
const showControls = ref(true);
const currentTime = ref(0);
const videoDuration = ref(0);
const currentProgress = ref(0);
const playbackRate = ref(1.0);
const volume = ref(1.0); // 音量（0-1）
const showKeyboardHint = ref(false); // 显示键盘快捷键提示
const hintMessage = ref(''); // 快捷键操作提示消息
const showHintMessage = ref(false); // 显示快捷键操作提示

// 弹幕相关
const danmakuList = ref([]);
const displayedDanmakuIds = ref(new Set());
let danmakuTimer = null;
const danmakuLines = 8;
let lineIndex = 0;

// AI字幕核心配置
const currentSubtitle = ref('');
const subtitleRunning = ref(false);
const recognitionLock = ref(false);
// 防重复点击锁 + 连接状态
const isSubtitleProcessing = ref(false); // 按钮禁用锁
const connectionStatus = ref(null); // 连接状态提示
let audioContext = null;
let sourceNode = null;
let scriptProcessor = null;
let ws = null;
let audioResampler = null;
let isAudioSourceCreated = ref(false);
let isSending = false;
let isWsReady = false;
// 音频缓冲区（新增：累积音频数据）
let audioBufferAccumulator = new Int16Array(0);
// 重连控制
let reconnectTimer = null;
const maxReconnectTimes = 3;
let currentReconnectTimes = 0;

// 后端配置
const BACKEND_CONFIG = {
  wsUrl: 'ws://localhost:8088/gangwei/ws/asr',
  sampleRate: 16000,
  frameSize: 6400, // ✅ 修复1：百度要求200ms帧=16000*2*0.2=6400字节
  channels: 1
};

// 更新连接状态提示
const updateConnectionStatus = (type, text) => {
  connectionStatus.value = { type, text };
  // 3秒后自动隐藏非错误状态
  if (type !== 'danger') {
    setTimeout(() => {
      if (connectionStatus.value?.text === text) {
        connectionStatus.value = null;
      }
    }, 3000);
  }
};

// ✅ 修复：COEP绕过函数（改进错误处理和重试机制）
async function loadResourceWithCoepBypass(originalUrl, resourceType = 'video') {
  try {
    if (!originalUrl || !originalUrl.startsWith('http')) {
      throw new Error('无效的资源URL');
    }

    console.log(`开始加载${resourceType}：`, originalUrl);

    const response = await fetch(originalUrl, {
      mode: 'cors',
      headers: {
        'Accept': resourceType === 'video' ? 'video/mp4, video/*' : 'image/jpeg, image/png, image/jpg, image/*'
      },
      credentials: 'omit',
      cache: 'default'
    });

    if (!response.ok) {
      throw new Error(`资源请求失败：${response.status} ${response.statusText}`);
    }

    // 检查响应类型
    const contentType = response.headers.get('content-type');
    if (resourceType === 'video' && contentType && !contentType.includes('video')) {
      console.warn('响应类型不匹配，期望video，实际：', contentType);
    }

    const blob = await response.blob();
    
    if (blob.size === 0) {
      throw new Error('获取到的资源为空');
    }

    const localUrl = URL.createObjectURL(blob);
    console.log(`${resourceType}加载成功，大小：${blob.size}字节，Blob URL：`, localUrl);
    return localUrl;
  } catch (e) {
    console.error(`加载${resourceType}失败：`, e);
    // 不在这里显示错误，让调用者决定如何处理
    return '';
  }
}

// ✅ 修复：视频错误处理（改进错误提示和重试逻辑）
const handleVideoError = async (e) => {
  console.error('视频加载错误：', e);
  const video = videoEl.value;
  if (!video) return;

  const error = video.error;
  let errorMsg = '视频加载失败';
  
  if (error) {
    switch (error.code) {
      case error.MEDIA_ERR_ABORTED:
        errorMsg = '视频加载被中止';
        break;
      case error.MEDIA_ERR_NETWORK:
        errorMsg = '网络错误，无法加载视频';
        break;
      case error.MEDIA_ERR_DECODE:
        errorMsg = '视频解码失败，可能是格式不支持';
        break;
      case error.MEDIA_ERR_SRC_NOT_SUPPORTED:
        errorMsg = '视频格式不支持或URL无效';
        break;
      default:
        errorMsg = `未知错误（错误码：${error.code}）`;
    }
    console.error('视频错误详情：', {
      code: error.code,
      message: error.message || errorMsg
    });
  }

  // 如果当前使用的是Blob URL，说明已经尝试过Blob方式了
  if (videoUrlToPlay.value && videoUrlToPlay.value.startsWith('blob:')) {
    ElMessage.error(`${errorMsg}。请检查视频文件是否存在或格式是否正确`);
    videoUrlToPlay.value = '';
    return;
  }

  // 如果当前使用的是原始URL，尝试使用Blob方式加载
  if (!hasTriedBlob.value && originalVideoUrl.value) {
    ElMessage.warning('直接加载失败，尝试通过Blob方式加载...');
    hasTriedBlob.value = true;
    isLoading.value = true;
    
    try {
      processedVideoUrl.value = await loadResourceWithCoepBypass(originalVideoUrl.value, 'video');
      if (processedVideoUrl.value) {
        videoUrlToPlay.value = processedVideoUrl.value;
        ElMessage.success('视频加载成功');
      } else {
        videoUrlToPlay.value = '';
        ElMessage.error(`${errorMsg}。请检查网络连接或视频地址`);
      }
    } catch (blobError) {
      console.error('Blob加载异常：', blobError);
      videoUrlToPlay.value = '';
      ElMessage.error(`${errorMsg}。Blob加载也失败：${blobError.message}`);
    } finally {
      isLoading.value = false;
    }
  } else {
    ElMessage.error(errorMsg);
    videoUrlToPlay.value = '';
  }
};

// 视频加载完成
const onVideoLoaded = () => {
  if (videoEl.value) {
    videoDuration.value = videoEl.value.duration || 0;
    isLoading.value = false;
    isBuffering.value = false;
    // 初始化音量
    volume.value = videoEl.value.volume || 1.0;
    isMuted.value = videoEl.value.muted || false;
    console.log('视频元数据加载完成，时长：', formatTime(videoDuration.value));
  }
};

// 视频时间更新
const onTimeUpdate = () => {
  if (videoEl.value) {
    currentTime.value = videoEl.value.currentTime || 0;
    currentProgress.value = currentTime.value;
  }
};

// 视频缓冲中
const onVideoWaiting = () => {
  isBuffering.value = true;
};

// 视频可以播放
const onVideoCanPlay = () => {
  isBuffering.value = false;
};

// 播放/暂停切换
const togglePlay = () => {
  if (!videoEl.value) return;
  
  if (videoEl.value.paused) {
    videoEl.value.play().then(() => {
      isPlaying.value = true;
    }).catch(e => {
      ElMessage.error('播放失败：' + e.message);
    });
  } else {
    videoEl.value.pause();
    isPlaying.value = false;
  }
};

// 静音切换
const toggleMute = () => {
  if (!videoEl.value) return;
  videoEl.value.muted = !videoEl.value.muted;
  isMuted.value = videoEl.value.muted;
  if (!isMuted.value) {
    videoEl.value.volume = volume.value;
  }
};

// 音量调节
const setVolume = (vol) => {
  if (!videoEl.value) return;
  volume.value = Math.max(0, Math.min(1, vol));
  videoEl.value.volume = volume.value;
  videoEl.value.muted = volume.value === 0;
  isMuted.value = volume.value === 0;
};

// 音量增加
const increaseVolume = () => {
  setVolume(volume.value + 0.1);
};

// 音量减少
const decreaseVolume = () => {
  setVolume(volume.value - 0.1);
};

// 播放速度改变
const onPlaybackRateChange = (rate) => {
  if (videoEl.value) {
    videoEl.value.playbackRate = rate;
    playbackRate.value = rate;
  }
};

// 进度条改变
const onProgressChange = (value) => {
  if (videoEl.value) {
    videoEl.value.currentTime = value;
    currentTime.value = value;
    currentProgress.value = value;
  }
};

// 快进/快退（秒数）
const seek = (seconds) => {
  if (!videoEl.value) return;
  const newTime = Math.max(0, Math.min(videoDuration.value, videoEl.value.currentTime + seconds));
  videoEl.value.currentTime = newTime;
  currentTime.value = newTime;
  currentProgress.value = newTime;
  // 显示快进/快退提示
  showSeekHint(seconds > 0 ? `快进 ${Math.abs(seconds)}秒` : `快退 ${Math.abs(seconds)}秒`);
};

// 显示快进/快退提示
const showSeekHint = (text) => {
  // 这个功能可以通过一个提示组件实现，暂时用console
  console.log(text);
};

// 跳转到指定百分比
const seekToPercentage = (percentage) => {
  if (!videoEl.value || !videoDuration.value) return;
  const targetTime = (videoDuration.value * percentage) / 100;
  videoEl.value.currentTime = targetTime;
  currentTime.value = targetTime;
  currentProgress.value = targetTime;
  ElMessage.info(`跳转到 ${percentage}%`);
};

// 全屏切换
const toggleFullscreen = () => {
  if (!videoWrapper.value) return;
  
  if (!document.fullscreenElement) {
    // 进入全屏
    if (videoWrapper.value.requestFullscreen) {
      videoWrapper.value.requestFullscreen();
    } else if (videoWrapper.value.webkitRequestFullscreen) {
      videoWrapper.value.webkitRequestFullscreen();
    } else if (videoWrapper.value.mozRequestFullScreen) {
      videoWrapper.value.mozRequestFullScreen();
    } else if (videoWrapper.value.msRequestFullscreen) {
      videoWrapper.value.msRequestFullscreen();
    }
  } else {
    // 退出全屏
    if (document.exitFullscreen) {
      document.exitFullscreen();
    } else if (document.webkitExitFullscreen) {
      document.webkitExitFullscreen();
    } else if (document.mozCancelFullScreen) {
      document.mozCancelFullScreen();
    } else if (document.msExitFullscreen) {
      document.msExitFullscreen();
    }
  }
};

// 监听全屏状态
const handleFullscreenChange = () => {
  isFullscreen.value = !!(
    document.fullscreenElement ||
    document.webkitFullscreenElement ||
    document.mozFullScreenElement ||
    document.msFullscreenElement
  );
};

// ✅ 新增：键盘快捷键处理
const handleKeyboard = (e) => {
  // 如果焦点在输入框，不处理快捷键
  const activeElement = document.activeElement;
  if (activeElement && (
    activeElement.tagName === 'INPUT' ||
    activeElement.tagName === 'TEXTAREA' ||
    activeElement.isContentEditable
  )) {
    // 空格键在输入框中不处理
    if (e.code === 'Space' && activeElement.tagName === 'INPUT') {
      return;
    }
    // 其他快捷键在输入框中也不处理
    if (e.code !== 'Space') {
      return;
    }
  }

  // 阻止默认行为
  e.preventDefault();
  e.stopPropagation();

  switch (e.code) {
    case 'Space': // 空格：播放/暂停
      togglePlay();
      showKeyboardHintMessage('空格：播放/暂停');
      break;
    
    case 'ArrowLeft': // 左键：快退5秒
      seek(-5);
      break;
    
    case 'ArrowRight': // 右键：快进5秒
      seek(5);
      break;
    
    case 'ArrowUp': // 上键：音量增加
      increaseVolume();
      showKeyboardHintMessage(`音量：${Math.round(volume.value * 100)}%`);
      break;
    
    case 'ArrowDown': // 下键：音量减少
      decreaseVolume();
      showKeyboardHintMessage(`音量：${Math.round(volume.value * 100)}%`);
      break;
    
    case 'KeyF': // F键：全屏
      toggleFullscreen();
      showKeyboardHintMessage(isFullscreen.value ? '退出全屏' : '进入全屏');
      break;
    
    case 'KeyM': // M键：静音
      toggleMute();
      showKeyboardHintMessage(isMuted.value ? '已静音' : '取消静音');
      break;
    
    case 'KeyK': // K键：播放/暂停（YouTube风格）
      togglePlay();
      showKeyboardHintMessage('K：播放/暂停');
      break;
    
    case 'Digit0': // 0键：跳转到开头
      seekToPercentage(0);
      break;
    
    case 'Digit1': // 1键：跳转到10%
      seekToPercentage(10);
      break;
    
    case 'Digit2': // 2键：跳转到20%
      seekToPercentage(20);
      break;
    
    case 'Digit3': // 3键：跳转到30%
      seekToPercentage(30);
      break;
    
    case 'Digit4': // 4键：跳转到40%
      seekToPercentage(40);
      break;
    
    case 'Digit5': // 5键：跳转到50%
      seekToPercentage(50);
      break;
    
    case 'Digit6': // 6键：跳转到60%
      seekToPercentage(60);
      break;
    
    case 'Digit7': // 7键：跳转到70%
      seekToPercentage(70);
      break;
    
    case 'Digit8': // 8键：跳转到80%
      seekToPercentage(80);
      break;
    
    case 'Digit9': // 9键：跳转到90%
      seekToPercentage(90);
      break;
    
    case 'Comma': // 逗号：快退1帧（如果支持）
      if (videoEl.value) {
        seek(-0.1);
      }
      break;
    
    case 'Period': // 句号：快进1帧（如果支持）
      if (videoEl.value) {
        seek(0.1);
      }
      break;
    
    case 'KeyI': // I键：显示/隐藏快捷键提示
      showKeyboardHint.value = !showKeyboardHint.value;
      break;
  }
};

// 显示键盘快捷键提示消息
let hintMessageTimer = null;

const showKeyboardHintMessage = (message) => {
  hintMessage.value = message;
  showHintMessage.value = true;
  
  // 清除之前的定时器
  if (hintMessageTimer) {
    clearTimeout(hintMessageTimer);
  }
  
  // 2秒后隐藏
  hintMessageTimer = setTimeout(() => {
    showHintMessage.value = false;
  }, 2000);
};

// 显示快捷键帮助
const showKeyboardHelp = () => {
  ElMessageBox.alert(
    `
    <div style="text-align: left; line-height: 2;">
      <p><strong>播放控制：</strong></p>
      <p>空格 / K：播放/暂停</p>
      <p>← →：快退/快进 5秒</p>
      <p>↑ ↓：音量增加/减少</p>
      <p>M：静音/取消静音</p>
      <p>F：全屏/退出全屏</p>
      <p><strong>快速跳转：</strong></p>
      <p>0-9：跳转到 0%-90%</p>
      <p><strong>精确控制：</strong></p>
      <p>，：快退 0.1秒</p>
      <p>。：快进 0.1秒</p>
      <p>I：显示/隐藏此提示</p>
    </div>
    `,
    '键盘快捷键',
    {
      dangerouslyUseHTMLString: true,
      confirmButtonText: '知道了'
    }
  );
};

// 格式化时间
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = Math.floor(seconds % 60);
  
  if (h > 0) {
    return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  }
  return `${m}:${s.toString().padStart(2, '0')}`;
};

// ✅ 修复：清理旧的video元素，避免WebMediaPlayer过多
function cleanupVideoElement() {
  if (videoEl.value) {
    try {
      // 停止播放
      videoEl.value.pause();
      // 清空src，释放资源
      videoEl.value.src = '';
      videoEl.value.srcObject = null;
      // 重新加载，释放WebMediaPlayer
      videoEl.value.load();
      console.log('已清理旧的video元素');
    } catch (e) {
      console.error('清理video元素失败：', e);
    }
  }
  
  // 清理旧的blob URL
  if (processedVideoUrl.value) {
    try {
      URL.revokeObjectURL(processedVideoUrl.value);
      processedVideoUrl.value = '';
    } catch (e) {
      console.error('清理blob URL失败：', e);
    }
  }
  
  // 重置状态
  videoUrlToPlay.value = '';
  currentTime.value = 0;
  videoDuration.value = 0;
  currentProgress.value = 0;
  isPlaying.value = false;
  isBuffering.value = false;
}

// 路由监听
watch(() => route.query, async (newQuery) => {
  // ✅ 修复1：先清理旧的video元素，避免WebMediaPlayer过多
  cleanupVideoElement();
  
  isLoading.value = true;
  hasTriedBlob.value = false;
  
  try {
    if (newQuery.videoUrl) {
      const isFullUrl = newQuery.videoUrl.startsWith('http');
      // 处理视频URL
      let videoFileName = newQuery.videoUrl;
      // 去掉 videoFileName 中多余的 /video/ 前缀和斜杠
      if (videoFileName.startsWith('/video/')) {
        videoFileName = videoFileName.replace('/video/', '');
      }
      // 去掉开头的斜杠（防止出现 //）
      videoFileName = videoFileName.replace(/^\//, '');
      
      originalVideoUrl.value = isFullUrl
        ? newQuery.videoUrl
        : `http://localhost:8088/gangwei/api/video/${videoFileName}`;
      
      console.log('最终请求URL：', originalVideoUrl.value);
      
      // ✅ 修复2：默认使用Blob方式加载，避免COEP问题
      try {
        const blobUrl = await loadResourceWithCoepBypass(originalVideoUrl.value, 'video');
        if (blobUrl) {
          processedVideoUrl.value = blobUrl;
          videoUrlToPlay.value = blobUrl;
          console.log('使用Blob方式加载视频成功');
        } else {
          // Blob加载失败，尝试直接使用原始URL
          console.warn('Blob加载失败，尝试直接使用原始URL');
          videoUrlToPlay.value = originalVideoUrl.value;
        }
      } catch (blobError) {
        console.error('Blob加载错误：', blobError);
        // Blob加载失败，尝试直接使用原始URL
        videoUrlToPlay.value = originalVideoUrl.value;
      }
    } else {
      originalVideoUrl.value = '';
      videoUrlToPlay.value = '';
      ElMessage.warning('未获取到视频地址，请选择正确的章节');
    }
  } catch (e) {
    videoUrlToPlay.value = '';
    ElMessage.error('视频加载失败：' + e.message);
    console.error('视频加载异常：', e);
  } finally {
    isLoading.value = false;
  }
}, { immediate: true });
// 音频重采样
class AudioResampler {
  constructor(inputSampleRate, outputSampleRate, channels) {
    this.inputSampleRate = inputSampleRate;
    this.outputSampleRate = outputSampleRate;
    this.channels = channels;
    this.buffer = [];
  }

  resample(buffer) {
    if (this.inputSampleRate === this.outputSampleRate) {
      return buffer;
    }

    const ratio = this.outputSampleRate / this.inputSampleRate;
    const newLength = Math.round(buffer.length * ratio);
    const result = new Float32Array(newLength);
    const stepSize = buffer.length / newLength;

    for (let i = 0; i < newLength; i++) {
      const index = i * stepSize;
      const low = Math.floor(index);
      const high = Math.ceil(index);
      const remainder = index - low;
      
      if (high >= buffer.length) {
        result[i] = buffer[low];
      } else {
        result[i] = buffer[low] * (1 - remainder) + buffer[high] * remainder;
      }
    }

    return result;
  }
}

// ✅ 修复2：提前激活AudioContext（解决浏览器安全策略+初始化延迟）
function activateAudioContext() {
  if (audioContext) return;
  // 提前激活，避免WS连接后再初始化
  audioContext = new (window.AudioContext || window.webkitAudioContext)();
  if (audioContext.state === 'suspended') {
    audioContext.resume();
  }
  console.log('AudioContext已激活，状态：', audioContext.state);
}

// ✅ 修复3：优化音频处理器初始化（去掉延迟，立即初始化）
function initAudioProcessor() {
  if (!videoEl.value || isAudioSourceCreated.value) return true;

  const video = videoEl.value;
  activateAudioContext(); // 确保AudioContext已激活

  // 1. 创建音频源节点（关键：不中断原始音频）
  sourceNode = audioContext.createMediaElementSource(video);

  // 2. 创建脚本处理器（调整缓冲区大小）
  scriptProcessor = audioContext.createScriptProcessor(4096, 1, 1);
  audioResampler = new AudioResampler(audioContext.sampleRate, BACKEND_CONFIG.sampleRate, 1);

  // 3. 音频处理逻辑（优化分帧+累积缓冲区）
  scriptProcessor.onaudioprocess = (e) => {
    if (!subtitleRunning.value || !ws || ws.readyState !== WebSocket.OPEN || isSending) return;

    try {
      isSending = true;
      // 获取音频数据
      const float32 = e.inputBuffer.getChannelData(0);
      // 重采样到16k
      const resampled = audioResampler.resample(float32);
      // 转换为16bit PCM
      const int16 = convertFloat32ToInt16(resampled);

      // ✅ 修复4：累积音频数据，直到达到帧大小
      audioBufferAccumulator = concatInt16Arrays(audioBufferAccumulator, int16);
      
      // 当累积数据≥帧大小时，分帧发送
      while (audioBufferAccumulator.length >= BACKEND_CONFIG.frameSize) {
        const chunk = audioBufferAccumulator.slice(0, BACKEND_CONFIG.frameSize);
        ws.send(chunk.buffer);
        console.log('发送音频帧：', chunk.length, '字节，累计剩余：', audioBufferAccumulator.length - BACKEND_CONFIG.frameSize);
        // 保留剩余数据
        audioBufferAccumulator = audioBufferAccumulator.slice(BACKEND_CONFIG.frameSize);
      }
    } catch (err) {
      console.error('音频处理失败：', err);
      updateConnectionStatus('danger', '音频发送失败：' + err.message);
    } finally {
      setTimeout(() => {
        isSending = false;
      }, 10); // ✅ 修复5：减少发送延迟，提高频率
    }
  };

  // 关键：并联连接，保留原始音频输出
  const gainNode = audioContext.createGain();
  gainNode.gain.value = 0; // 处理器分支无输出
  sourceNode.connect(scriptProcessor);
  scriptProcessor.connect(gainNode);
  gainNode.connect(audioContext.destination);

  // 音频源 → 直接输出（保留声音）
  sourceNode.connect(audioContext.destination);

  isAudioSourceCreated.value = true;
  console.log('音频处理器初始化完成，AudioContext状态：', audioContext.state);
  return true;
}

// ✅ 修复6：Int16数组拼接工具函数
function concatInt16Arrays(a, b) {
  const result = new Int16Array(a.length + b.length);
  result.set(a, 0);
  result.set(b, a.length);
  return result;
}

// 转换音频格式
function convertFloat32ToInt16(float32Array) {
  const int16Array = new Int16Array(float32Array.length);
  for (let i = 0; i < float32Array.length; i++) {
    const val = Math.max(-1, Math.min(1, float32Array[i]));
    int16Array[i] = val < 0 ? val * 0x8000 : val * 0x7FFF;
  }
  return int16Array;
}

// ✅ 修复7：WS连接成功后立即发送空帧（避免百度超时）
function sendInitAudioFrame() {
  if (!ws || ws.readyState !== WebSocket.OPEN) return;
  // 发送空的6400字节帧（触发百度接收音频，避免超时）
  const emptyFrame = new Int16Array(BACKEND_CONFIG.frameSize);
  ws.send(emptyFrame.buffer);
  console.log('发送初始化空音频帧，避免百度超时');
}

// ✅ 修复8：增强WebSocket连接（立即初始化音频+发送空帧）
function connectBackendWebSocket() {
  // 先关闭已有连接
  if (ws) {
    try {
      ws.close(1000, '重新连接');
    } catch (e) {}
    ws = null;
  }
  
  // 重置状态
  currentReconnectTimes = 0;
  audioBufferAccumulator = new Int16Array(0); // 重置音频缓冲区
  updateConnectionStatus('info', '正在连接语音识别服务...');
  activateAudioContext(); // 提前激活AudioContext

  const createConnection = () => {
    try {
      ws = new WebSocket(BACKEND_CONFIG.wsUrl);
      
      ws.onopen = () => {
        console.log('后端WebSocket连接成功');
        isWsReady = true;
        currentReconnectTimes = 0;
        // 清除重连定时器
        if (reconnectTimer) clearTimeout(reconnectTimer);
        
        // ✅ 修复9：立即初始化音频处理器（去掉500ms延迟）
        initAudioProcessor();
        // ✅ 修复10：立即发送初始化空帧，避免百度超时
        sendInitAudioFrame();
        
        updateConnectionStatus('success', '语音识别服务连接成功');
        ElMessage.success('已连接到语音识别服务');
      };
      
      // 关键：接收后端转发的字幕结果 + 并发错误处理
      ws.onmessage = (e) => {
        try {
          const result = e.data;
          console.log('收到字幕结果：', result);
          // 处理并发超限错误
          if (result.includes('3304') || result.includes('请求超限') || result.includes('3004') || result.includes('SN invalid')) {
            updateConnectionStatus('danger', '识别请求超限！当前使用人数过多，请稍后再试');
            ElMessageBox.warning(
              '识别请求超限（错误码3304/3004）\n1. 免费版仅支持1人同时识别\n2. 请关闭当前字幕，1分钟后重试\n3. 如需多人使用，请升级百度ASR付费版',
              '并发超限提示'
            ).then(() => {
              safeStopSubtitle();
            });
            return;
          }
          if (result && result.trim()) {
            currentSubtitle.value = result;
          }
        } catch (e) {
          console.error('解析字幕失败：', e);
          currentSubtitle.value = '识别失败';
          updateConnectionStatus('danger', '解析字幕失败：' + e.message);
        }
      };
      
      ws.onclose = (e) => {
        console.log('后端WebSocket连接关闭：', e.code, e.reason);
        isWsReady = false;
        connectionStatus.value = null;
        
        // 智能重连（仅用户主动开启且非手动关闭时重连）
        if (subtitleRunning.value && e.code !== 1000 && currentReconnectTimes < maxReconnectTimes) {
          currentReconnectTimes++;
          updateConnectionStatus('warning', `连接断开，正在重连...（${currentReconnectTimes}/${maxReconnectTimes}）`);
          reconnectTimer = setTimeout(() => {
            if (subtitleRunning.value) createConnection();
          }, 2000 * currentReconnectTimes); // 指数退避重连
        } else if (currentReconnectTimes >= maxReconnectTimes) {
          updateConnectionStatus('danger', '重连失败，已停止尝试');
          ElMessage.error('语音识别服务连接失败，请检查后端服务或稍后重试');
          safeStopSubtitle();
        }
      };
      
      ws.onerror = (e) => {
        console.error('后端WebSocket错误：', e);
        isWsReady = false;
        updateConnectionStatus('danger', 'WebSocket连接错误：' + (e.message || '未知错误'));
        ElMessage.error('WebSocket连接错误，请检查后端服务是否启动');
      };
    } catch (e) {
      updateConnectionStatus('danger', '创建WebSocket连接失败：' + e.message);
      ElMessage.error('创建WebSocket连接失败：' + e.message);
      if (subtitleRunning.value && currentReconnectTimes < maxReconnectTimes) {
        currentReconnectTimes++;
        reconnectTimer = setTimeout(createConnection, 2000 * currentReconnectTimes);
      }
    }
  };
  
  createConnection();
}

// 安全检查（防止重复请求）
function checkSubtitleSafety() {
  if (isSubtitleProcessing.value) {
    ElMessage.warning('操作中，请稍候...');
    return false;
  }
  if (!videoEl.value) {
    // ElMessage.error('视频未加载完成');
    return false;
  }
  if (videoEl.value.error) {
    ElMessage.error('视频播放异常，请重新加载视频');
    return false;
  }
  return true;
}

// 安全启动AI字幕
function safeStartSubtitle() {
  if (!checkSubtitleSafety()) return false;
  
  try {
    isSubtitleProcessing.value = true; // 锁定按钮
    recognitionLock.value = true;
    
    if (videoEl.value.paused) {
      videoEl.value.play().then(() => {
        connectBackendWebSocket();
        isSubtitleProcessing.value = false; // 解锁按钮
      }).catch(e => {
        ElMessage.error('请先手动播放视频再开启字幕');
        recognitionLock.value = false;
        isSubtitleProcessing.value = false; // 解锁按钮
        return false;
      });
    } else {
      connectBackendWebSocket();
      isSubtitleProcessing.value = false; // 解锁按钮
    }
    
    subtitleRunning.value = true;
    return true;
  } catch (e) {
    recognitionLock.value = false;
    isSubtitleProcessing.value = false; // 解锁按钮
    console.error('启动AI字幕失败：', e);
    updateConnectionStatus('danger', '启动字幕失败：' + e.message);
    return false;
  }
}

// 安全停止AI字幕
function safeStopSubtitle() {
  if (!checkSubtitleSafety() || !subtitleRunning.value) return false;
  
  try {
    isSubtitleProcessing.value = true; // 锁定按钮
    recognitionLock.value = true;
    
    // 清除重连定时器
    if (reconnectTimer) {
      clearTimeout(reconnectTimer);
      reconnectTimer = null;
    }
    
    // 关闭WebSocket
    if (ws) {
      ws.close(1000, '用户主动停止');
      ws = null;
    }
    
    // 重置音频缓冲区
    audioBufferAccumulator = new Int16Array(0);
    
    // 断开音频处理器
    if (scriptProcessor) {
      scriptProcessor.disconnect();
    }
    
    // 保留音频源连接，确保声音不消失
    if (sourceNode && audioContext) {
      sourceNode.connect(audioContext.destination);
    }
    
    // 重置状态
    currentSubtitle.value = '';
    subtitleRunning.value = false;
    connectionStatus.value = null;
    isSubtitleProcessing.value = false; // 解锁按钮
    
    return true;
  } catch (e) {
    recognitionLock.value = false;
    isSubtitleProcessing.value = false; // 解锁按钮
    console.error('停止AI字幕失败：', e);
    updateConnectionStatus('danger', '停止字幕失败：' + e.message);
    return false;
  }
}

// 切换字幕状态
function toggleSubtitle() {
  if (subtitleRunning.value) {
    const success = safeStopSubtitle();
    if (success) {
      ElMessage.success('AI字幕已关闭');
    }
  } else {
    const success = safeStartSubtitle();
    if (success) {
      ElMessage.success('AI字幕已开启');
    } else {
      ElMessage.error('开启字幕失败，请检查视频是否正常播放');
    }
  }
  recognitionLock.value = false;
}

// 弹幕逻辑
function sendDanmaku() {
  if (!danmakuText.value.trim()) {
    ElMessage.warning('请输入弹幕内容');
    return;
  }
  
  const currentTime = videoEl.value ? Math.floor(videoEl.value.currentTime) : 0;
  const danmaku = {
    id: Date.now() + Math.random().toString(36).substr(2, 9),
    text: danmakuText.value.trim(),
    time: currentTime,
    line: lineIndex % danmakuLines
  };
  
  danmakuList.value.push(danmaku);
  showDanmaku(danmaku);
  danmakuText.value = '';
  lineIndex++;
}

function showDanmaku(danmaku) {
  if (!danmakuContainer.value || displayedDanmakuIds.value.has(danmaku.id)) {
    return;
  }

  displayedDanmakuIds.value.add(danmaku.id);

  const el = document.createElement('div');
  el.className = 'danmaku-item';
  el.innerText = danmaku.text;
  
  el.style.cssText = `
    position: absolute;
    top: ${danmaku.line * 35 + 20}px;
    right: -${danmaku.text.length * 18}px;
    color: #ffffff;
    font-size: 18px;
    font-weight: bold;
    text-shadow: 0 0 4px #000000;
    white-space: nowrap;
    z-index: 10;
    pointer-events: none;
    will-change: transform;
    transform: translateZ(0);
    transition: transform 10s linear;
  `;

  danmakuContainer.value.appendChild(el);

  setTimeout(() => {
    el.style.transform = `translateX(-${danmakuContainer.value.offsetWidth + el.offsetWidth}px) translateZ(0)`;
  }, 10);

  setTimeout(() => {
    el.remove();
    displayedDanmakuIds.value.delete(danmaku.id);
  }, 10000);
}

// 视频事件处理
function onVideoPlay() {
  isPlaying.value = true;
  isBuffering.value = false;
  
  if (danmakuTimer) clearInterval(danmakuTimer);
  
  danmakuTimer = setInterval(() => {
    if (!videoEl.value) return;
    const currentTime = Math.floor(videoEl.value.currentTime);
    const currentDanmakus = danmakuList.value.filter(d => 
      d.time === currentTime && !displayedDanmakuIds.value.has(d.id)
    );
    currentDanmakus.forEach(showDanmaku);
  }, 100);
  
  if (subtitleRunning.value && !recognitionLock.value) {
    // 恢复AudioContext
    if (audioContext && audioContext.state === 'suspended') {
      audioContext.resume();
    }
    // 重新连接WS（如果已断开）
    if (!ws || ws.readyState !== WebSocket.OPEN) {
      connectBackendWebSocket();
    }
  }
}

function onVideoPause() {
  isPlaying.value = false;
  
  if (danmakuTimer) clearInterval(danmakuTimer);
  
  if (subtitleRunning.value && !recognitionLock.value && scriptProcessor) {
    try {
      scriptProcessor.disconnect();
      if (ws) {
        ws.close(1000, '视频暂停');
      }
      // 清除重连定时器
      if (reconnectTimer) clearTimeout(reconnectTimer);
    } catch (e) {}
  }
}

function onVideoEnded() {
  isPlaying.value = false;
  onVideoPause();
  safeStopSubtitle();
  displayedDanmakuIds.value.clear();
  ElMessage.info('视频播放完成');
}

// 生命周期
onMounted(() => {
  // 检查浏览器支持
  if (!window.WebSocket) {
    ElMessage.error('当前浏览器不支持WebSocket，无法使用AI字幕');
  }
  
  if (!window.AudioContext && !window.webkitAudioContext) {
    ElMessage.error('当前浏览器不支持Web Audio API，无法使用AI字幕');
  }
  
  // 提前激活AudioContext（需要用户交互）
  document.addEventListener('click', activateAudioContext, { once: true });
  
  // 监听全屏状态变化
  document.addEventListener('fullscreenchange', handleFullscreenChange);
  document.addEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.addEventListener('mozfullscreenchange', handleFullscreenChange);
  document.addEventListener('MSFullscreenChange', handleFullscreenChange);
  
  // 鼠标移动显示/隐藏控制栏
  if (videoWrapper.value) {
    let hideControlsTimer = null;
    videoWrapper.value.addEventListener('mousemove', () => {
      showControls.value = true;
      clearTimeout(hideControlsTimer);
      hideControlsTimer = setTimeout(() => {
        if (isPlaying.value) {
          showControls.value = false;
        }
      }, 3000);
    });
  }

  // ✅ 新增：添加键盘事件监听
  document.addEventListener('keydown', handleKeyboard);
  
  // 显示快捷键提示（首次加载时）
  setTimeout(() => {
    if (videoUrlToPlay.value) {
      ElMessage.info('提示：按 I 键查看键盘快捷键帮助');
    }
  }, 2000);
});

onUnmounted(() => {
  // ✅ 修复：彻底清理video元素和所有资源
  cleanupVideoElement();
  
  // 清除所有定时器和连接
  if (reconnectTimer) {
    clearTimeout(reconnectTimer);
    reconnectTimer = null;
  }
  if (danmakuTimer) {
    clearInterval(danmakuTimer);
    danmakuTimer = null;
  }
  
  safeStopSubtitle();
  onVideoPause();
  
  // 彻底清理video元素
  if (videoEl.value) {
    try {
      videoEl.value.pause();
      videoEl.value.removeAttribute('src');
      videoEl.value.src = '';
      videoEl.value.srcObject = null;
      videoEl.value.load();
      // 等待一下确保资源释放
      setTimeout(() => {
        if (videoEl.value) {
          videoEl.value = null;
        }
      }, 100);
    } catch (e) {
      console.error('清理video元素失败：', e);
    }
  }
  
  displayedDanmakuIds.value.clear();
  recognitionLock.value = false;
  isSubtitleProcessing.value = false;
  
  // 清理音频相关资源
  if (scriptProcessor) {
    try {
      scriptProcessor.disconnect();
    } catch (e) {}
    scriptProcessor = null;
  }
  if (sourceNode) {
    try {
      sourceNode.disconnect();
    } catch (e) {}
    sourceNode = null;
  }
  if (audioContext) {
    try {
      audioContext.close();
    } catch (e) {}
    audioContext = null;
  }
  isAudioSourceCreated.value = false;
  
  // 清理所有blob URL
  if (processedVideoUrl.value) {
    try {
      URL.revokeObjectURL(processedVideoUrl.value);
    } catch (e) {
      console.error('清理blob URL失败：', e);
    }
    processedVideoUrl.value = '';
  }
  
  // 移除事件监听
  document.removeEventListener('fullscreenchange', handleFullscreenChange);
  document.removeEventListener('webkitfullscreenchange', handleFullscreenChange);
  document.removeEventListener('mozfullscreenchange', handleFullscreenChange);
  document.removeEventListener('MSFullscreenChange', handleFullscreenChange);
  
  // ✅ 移除键盘事件监听
  document.removeEventListener('keydown', handleKeyboard);
  
  console.log('组件已完全卸载，所有资源已清理');
});
</script>

<style scoped>
.video-page-wrapper {
  width: 100%;
  padding: 20px;
  box-sizing: border-box;
  background: #f5f5f5;
  min-height: calc(100vh - 60px);
}

.video-container {
  width: 100%;
  max-width: 1200px;
  margin: 0 auto;
}

/* 加载状态 */
.loading-tip {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  height: 600px;
  gap: 16px;
  color: #666;
  background: #fff;
  border-radius: 8px;
}

.empty-tip {
  padding: 50px 0;
  text-align: center;
  background: #fff;
  border-radius: 8px;
}

/* 视频播放器区域 */
.video-player-wrapper {
  background: #000;
  border-radius: 8px;
  overflow: hidden;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.15);
}

.video-wrapper {
  position: relative;
  width: 100%;
  padding-top: 56.25%; /* 16:9 比例 */
  background: #000;
}

.video-player {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  object-fit: contain;
  outline: none;
}

/* 自定义控制栏 */
.video-controls {
  position: absolute;
  bottom: 0;
  left: 0;
  right: 0;
  background: linear-gradient(to top, rgba(0, 0, 0, 0.8), transparent);
  padding: 15px;
  z-index: 10;
  transition: opacity 0.3s;
}

.progress-bar-wrapper {
  margin-bottom: 10px;
}

.progress-slider {
  width: 100%;
}

.time-info {
  display: flex;
  justify-content: space-between;
  color: #fff;
  font-size: 12px;
  margin-top: 5px;
}

.controls-bar {
  display: flex;
  justify-content: space-between;
  align-items: center;
  color: #fff;
}

.controls-left,
.controls-right {
  display: flex;
  align-items: center;
  gap: 10px;
}

/* 弹幕容器 */
.danmaku-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  z-index: 5;
  overflow: hidden;
}

.danmaku-item {
  position: absolute !important;
  color: #fff !important;
  font-weight: bold !important;
  text-shadow: 0 0 4px #000 !important;
  transition: transform 10s linear !important;
  transform: translateZ(0) !important;
  white-space: nowrap;
}

/* AI字幕 */
.subtitle-layer {
  position: absolute;
  bottom: 80px;
  left: 50%;
  transform: translateX(-50%);
  color: #fff;
  font-size: 24px;
  font-weight: bold;
  text-shadow: 0 0 8px rgba(0, 0, 0, 0.8);
  background: rgba(0, 0, 0, 0.6);
  padding: 12px 24px;
  border-radius: 8px;
  z-index: 12;
  max-width: 80%;
  text-align: center;
  line-height: 1.5;
}

/* 连接状态提示 */
.connection-status {
  position: absolute;
  top: 20px;
  left: 20px;
  z-index: 20;
}

/* 缓冲提示 */
.buffering-tip {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  display: flex;
  flex-direction: column;
  align-items: center;
  gap: 10px;
  color: #fff;
  z-index: 15;
  background: rgba(0, 0, 0, 0.6);
  padding: 20px;
  border-radius: 8px;
}

/* 视频信息 */
.video-info {
  padding: 15px 20px;
  background: #fff;
  border-top: 1px solid #eee;
}

.video-info h3 {
  margin: 0;
  font-size: 18px;
  color: #333;
}

/* 控制面板 */
.control-panel {
  margin-top: 20px;
}

.card-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  font-weight: 600;
}

.control-buttons {
  display: flex;
  flex-direction: column;
  gap: 15px;
}

.danmaku-input-group {
  display: flex;
  gap: 10px;
  align-items: center;
}

.subtitle-control {
  display: flex;
  align-items: center;
  gap: 15px;
}

.subtitle-status {
  margin-left: 10px;
}

.keyboard-help {
  margin-top: 10px;
  text-align: center;
}

/* 响应式设计 */
@media (max-width: 768px) {
  .video-page-wrapper {
    padding: 10px;
  }

  .video-wrapper {
    padding-top: 56.25%;
  }

  .subtitle-layer {
    font-size: 18px;
    bottom: 60px;
    padding: 8px 16px;
  }

  .controls-bar {
    flex-wrap: wrap;
  }

  .danmaku-input-group {
    flex-direction: column;
  }
}

/* 全屏样式 */
:fullscreen .video-wrapper,
:-webkit-full-screen .video-wrapper,
:-moz-full-screen .video-wrapper,
:-ms-fullscreen .video-wrapper {
  padding-top: 0;
  height: 100vh;
}

:fullscreen .video-player,
:-webkit-full-screen .video-player,
:-moz-full-screen .video-player,
:-ms-fullscreen .video-player {
  height: 100%;
}

/* ✅ 修复：全屏时倍速选择器z-index */
:fullscreen .video-speed-select,
:-webkit-full-screen .video-speed-select,
:-moz-full-screen .video-speed-select,
:-ms-fullscreen .video-speed-select {
  z-index: 99999 !important;
}

/* 快捷键提示覆盖层 */
.keyboard-hint-overlay {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.85);
  color: #fff;
  padding: 30px;
  border-radius: 12px;
  z-index: 1000;
  min-width: 300px;
  box-shadow: 0 4px 20px rgba(0, 0, 0, 0.5);
}

.keyboard-hint-content h4 {
  margin: 0 0 20px 0;
  font-size: 20px;
  text-align: center;
  color: #409eff;
}

.hint-list {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.hint-list div {
  display: flex;
  align-items: center;
  gap: 8px;
  font-size: 14px;
}

.hint-list kbd {
  background: #333;
  color: #fff;
  padding: 4px 8px;
  border-radius: 4px;
  font-family: monospace;
  font-size: 12px;
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.3);
}

/* 快捷键操作提示 */
.hint-message {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  background: rgba(0, 0, 0, 0.8);
  color: #fff;
  padding: 15px 30px;
  border-radius: 8px;
  font-size: 16px;
  z-index: 1001;
  pointer-events: none;
  box-shadow: 0 4px 12px rgba(0, 0, 0, 0.5);
}

/* 淡入淡出动画 */
.fade-enter-active,
.fade-leave-active {
  transition: opacity 0.3s;
}

.fade-enter-from,
.fade-leave-to {
  opacity: 0;
}
</style>