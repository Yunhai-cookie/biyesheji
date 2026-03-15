import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import ElementPlus from 'element-plus'
import 'element-plus/dist/index.css'

// 导入Font Awesome字体图标（保留你原有的配置）
import '@fortawesome/fontawesome-free/css/all.min.css'

// ===================== 新增：修复 ResizeObserver 循环警告 =====================
// 防抖函数，避免ResizeObserver频繁触发
const debounce = (fn, delay) => {
  let timer = null
  return function () {
    const context = this
    const args = arguments
    clearTimeout(timer)
    timer = setTimeout(() => {
      fn.apply(context, args)
    }, delay)
  }
}

// 重写ResizeObserver，添加防抖处理
if (window.ResizeObserver) {
  const _ResizeObserver = window.ResizeObserver
  window.ResizeObserver = class ResizeObserver extends _ResizeObserver {
    constructor(callback) {
      // 16ms防抖，匹配浏览器刷新率，避免循环触发
      super(debounce(callback, 16))
    }
  }
}
// ===================== 修复代码结束 =====================

// 创建并挂载Vue应用（保持你的链式调用风格）
const app = createApp(App)
app.use(router)        // 注册路由
app.use(ElementPlus)   // 全局注册Element Plus组件
app.mount('#app')      // 挂载到#app节点