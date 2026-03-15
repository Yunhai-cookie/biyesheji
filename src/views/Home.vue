<template>
  <div class="app-container">
    <!-- 顶部导航栏 -->
    <header class="header">
      <div class="container header-content">
        <div class="logo">
          <i class="fas fa-graduation-cap"></i>
          <span>公务员备考系统</span>
        </div>
        <nav class="nav-menu">
          <!-- 首页锚点跳转 -->
          <router-link to="/#home" class="nav-link" active-class="active">首页</router-link>
          <!-- 功能模块锚点跳转 -->
          <router-link to="/#features" class="nav-link" active-class="active">功能模块</router-link>
          <router-link to="/about" class="nav-link" active-class="active">关于我们</router-link>
          <router-link to="/contact" class="nav-link" active-class="active">联系客服</router-link>
        </nav>
        <div class="user-actions">
          <!-- 登录/注册按钮 - 已登录显示用户名，未登录显示登录/注册 -->
          <div v-if="userInfo" class="user-info">
            <span class="username">{{ userInfo.username }}</span>
            <el-button type="text" class="logout-btn" @click="handleLogout">退出</el-button>
          </div>
          <router-link v-else to="/login" class="login-btn">登录/注册</router-link>
        </div>
      </div>
    </header>

    <!-- 英雄区 -->
    <section class="hero" id="home">
      <div class="container">
        <h1>一站式公务员备考解决方案</h1>
        <p>整合刷题、网课、选岗、模考、AI面试五大核心功能，依托大数据与人工智能技术，为你的公考之路保驾护航</p>
        <router-link to="/#features" class="hero-btn">开始备考</router-link>
      </div>
    </section>

    <!-- 功能模块区 -->
    <section class="features" id="features">
      <div class="container">
        <div class="section-title">
          <h2>核心功能模块</h2>
          <p>全方位覆盖公务员备考全流程，满足不同阶段的学习需求，让备考更高效、更科学</p>
        </div>
        <div class="features-grid">
          <!-- 刷题功能模块 -->
          <div class="feature-card" @click="$router.push('/exam-practice')">
            <div class="feature-icon">
              <i class="fas fa-pencil-alt"></i>
            </div>
            <h3>刷题功能模块</h3>
            <p>在线完成习题，支持一题一反馈或整卷反馈模式，记录答题对错、做题计时，AI辅助答题，提供详细解析与笔记编辑功能。</p>
            <router-link to="/exam-practice" class="feature-link">
              进入刷题 <i class="fas fa-arrow-right"></i>
            </router-link>
          </div>

          <!-- 视频网课模块 -->
          <div class="feature-card" @click="$router.push('/video-course')">
            <div class="feature-icon">
              <i class="fas fa-video"></i>
            </div>
            <h3>视频网课模块</h3>
            <p>在线学习网课，支持课程管理，视频倍速播放、弹幕互动、静音控制，AI智能字幕实时翻译/转写，提升学习效率。</p>
            <router-link to="/video-course" class="feature-link">
              观看网课 <i class="fas fa-arrow-right"></i>
            </router-link>
          </div>

          <!-- 智能选岗模块 -->
          <div class="feature-card" @click="$router.push('/job-recommend')">
            <div class="feature-icon">
              <i class="fas fa-chart-line"></i>
            </div>
            <h3>智能选岗模块</h3>
            <p>大数据分析岗位数据，智能推荐报考岗位，整合岗位分数线，多维度筛选，信息可视化展示，助力精准选岗。</p>
            <router-link to="/job-recommend" class="feature-link">
              智能选岗 <i class="fas fa-arrow-right"></i>
            </router-link>
          </div>

         <!-- 模考组卷模块 -->
          <div class="feature-card" @click="$router.push('/smart-paper')">
            <div class="feature-icon">
              <i class="fas fa-file-alt"></i>
            </div>
            <h3>模考组卷模块</h3>
            <p>基于题库智能组卷，模拟真实考试环境，自动统计成绩、分析错题，支持多用户并发组卷与在线考试。</p>
            <router-link to="/smart-paper" class="feature-link">
              开始模考 <i class="fas fa-arrow-right"></i>
            </router-link>
          </div>

          <!-- AI面试模块 -->
          <div class="feature-card" @click="$router.push('/ai-intv')">
            <div class="feature-icon">
              <i class="fas fa-robot"></i>
            </div>
            <h3>AI面试模块</h3>
            <p>AI虚拟面试官，语音识别转文字，语义分析智能评分，多维度面试行为分析，提升面试应答能力。</p>
            <router-link to="/ai-intv" class="feature-link">
              模拟面试 <i class="fas fa-arrow-right"></i>
            </router-link>
          </div>
          <div class="home-page">

      
          <el-button type="warning" size="large" @click="$router.push('/wrong-question-book')" style="margin-left: 16px;">
            刷错题本
          </el-button>
          <el-button type="primary" size="large" @click="$router.push('/note-book')">
            <el-icon><Notebook /></el-icon>
            做题笔记
          </el-button>
          <!-- 新增考试记录入口（样式、尺寸、间距与其他按钮统一） -->
          <el-button type="info" size="large" @click="$router.push('/exam-record')" style="margin-left: 16px;">
            <el-icon><Document /></el-icon>
            考试记录
          </el-button>
        </div>
        </div>
      </div>
    </section>

    <!-- 底部 -->
    <footer class="footer">
      <div class="container">
        <div class="footer-content">
          <div class="footer-col">
            <h4>备考资源</h4>
            <ul>
              <li><router-link to="/resources/xingce">行测题库</router-link></li>
              <li><router-link to="/resources/shenlun">申论范文</router-link></li>
              <li><router-link to="/resources/interview">面试真题</router-link></li>
              <li><router-link to="/resources/scores">历年分数线</router-link></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>功能服务</h4>
            <ul>
              <li><router-link to="/member">会员中心</router-link></li>
              <li><router-link to="/plan">学习计划</router-link></li>
              <li><router-link to="/analysis">成绩分析</router-link></li>
              <li><router-link to="/service">客服支持</router-link></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>关于我们</h4>
            <ul>
              <li><router-link to="/about">公司简介</router-link></li>
              <li><router-link to="/partner">合作伙伴</router-link></li>
              <li><router-link to="/recruit">招贤纳士</router-link></li>
              <li><router-link to="/privacy">隐私政策</router-link></li>
            </ul>
          </div>
          <div class="footer-col">
            <h4>联系我们</h4>
            <ul>
              <li><a href="tel:400-123-4567"><i class="fas fa-phone"></i> 400-123-4567</a></li>
              <li><a href="mailto:service@gwy.com"><i class="fas fa-envelope"></i> service@gwy.com</a></li>
              <li><span><i class="fas fa-map-marker-alt"></i> 北京市海淀区中关村大街</span></li>
            </ul>
          </div>
        </div>
        <div class="copyright">
          © 2026 公务员备考系统 版权所有 | 京ICP备12345678号
        </div>
      </div>
    </footer>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { useRouter } from 'vue-router'
import { ElMessage } from 'element-plus'
// 导入Font Awesome样式
import '@fortawesome/fontawesome-free/css/all.min.css'

const router = useRouter()
// 获取本地存储的用户信息
const userInfo = ref(JSON.parse(localStorage.getItem('userInfo') || null))

// 退出登录
const handleLogout = () => {
  localStorage.removeItem('userInfo')
  userInfo.value = null
  ElMessage.success('退出成功！')
  router.push('/')
}

// 修复锚点滚动逻辑：过滤非法hash值
onMounted(() => {
  const hash = window.location.hash
  // 关键修复：只处理合法的锚点（以#开头，且后面不是/）
  if (hash && hash !== '#/' && hash.startsWith('#')) {
    const target = document.querySelector(hash)
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' })
    }
  }
})
</script>

<style lang="scss" scoped>
// 全局样式
.app-container {
  width: 100%;
  min-height: 100vh;
  background-color: #f5f7fa;
  color: #333;
  line-height: 1.6;
}

.container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0 20px;
}

// 顶部导航栏
.header {
  background-color: #165DFF;
  color: white;
  padding: 15px 0;
  box-shadow: 0 2px 10px rgba(0,0,0,0.1);
  position: sticky;
  top: 0;
  z-index: 100;

  .header-content {
    display: flex;
    justify-content: space-between;
    align-items: center;

    .logo {
      display: flex;
      align-items: center;
      font-size: 24px;
      font-weight: bold;

      i {
        margin-right: 10px;
        font-size: 28px;
      }
    }

    .nav-menu {
      display: flex;
      gap: 30px;

      .nav-link {
        font-size: 16px;
        padding: 8px 0;
        border-bottom: 2px solid transparent;
        transition: all 0.3s ease;
        color: white;
        text-decoration: none;

        &.active,
        &:hover {
          border-bottom: 2px solid white;
        }
      }
    }

    .user-actions {
      .login-btn {
        background-color: white;
        color: #165DFF;
        padding: 8px 20px;
        border-radius: 4px;
        font-weight: 500;
        transition: all 0.3s ease;
        text-decoration: none;

        &:hover {
          background-color: #e8f0ff;
        }
      }

      .user-info {
        display: flex;
        align-items: center;
        gap: 15px;
        color: white;

        .username {
          font-weight: 500;
        }

        .logout-btn {
          color: white;
          padding: 5px 10px;

          &:hover {
            background-color: rgba(255,255,255,0.1);
            border-radius: 4px;
          }
        }
      }
    }
  }
}

// 英雄区
.hero {
  padding: 60px 0;
  text-align: center;
  background: linear-gradient(135deg, #165DFF 0%, #0F4CD8 100%);
  color: white;

  h1 {
    font-size: 42px;
    margin-bottom: 20px;
    font-weight: 700;
  }

  p {
    font-size: 18px;
    max-width: 800px;
    margin: 0 auto 30px;
    opacity: 0.9;
  }

  .hero-btn {
    background-color: white;
    color: #165DFF;
    padding: 12px 30px;
    border-radius: 4px;
    font-size: 16px;
    font-weight: 600;
    transition: all 0.3s ease;
    display: inline-block;
    text-decoration: none;

    &:hover {
      background-color: #e8f0ff;
      transform: translateY(-2px);
    }
  }
}

// 功能模块区
.features {
  padding: 80px 0;

  .section-title {
    text-align: center;
    margin-bottom: 60px;

    h2 {
      font-size: 32px;
      color: #165DFF;
      margin-bottom: 15px;
    }

    p {
      font-size: 16px;
      color: #666;
      max-width: 700px;
      margin: 0 auto;
    }
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
    gap: 30px;
  }

  .feature-card {
    background-color: white;
    border-radius: 8px;
    padding: 30px;
    box-shadow: 0 5px 15px rgba(0,0,0,0.08);
    transition: all 0.3s ease;
    border-top: 4px solid #165DFF;
    cursor: pointer;

    &:hover {
      transform: translateY(-8px);
      box-shadow: 0 10px 25px rgba(0,0,0,0.12);
    }

    .feature-icon {
      font-size: 40px;
      color: #165DFF;
      margin-bottom: 20px;
    }

    h3 {
      font-size: 22px;
      margin-bottom: 15px;
      color: #333;
    }

    p {
      color: #666;
      margin-bottom: 20px;
      line-height: 1.7;
    }

    .feature-link {
      display: inline-block;
      color: #165DFF;
      font-weight: 500;
      padding: 8px 0;
      border-bottom: 2px solid transparent;
      transition: all 0.3s ease;
      text-decoration: none;

      &:hover {
        border-bottom: 2px solid #165DFF;
      }
    }
  }
}

// 底部
.footer {
  background-color: #165DFF;
  color: white;
  padding: 40px 0 20px;
  margin-top: 60px;

  .footer-content {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
    gap: 30px;
    margin-bottom: 30px;

    .footer-col {
      h4 {
        font-size: 18px;
        margin-bottom: 20px;
        position: relative;
        padding-bottom: 10px;

        &::after {
          content: '';
          position: absolute;
          left: 0;
          bottom: 0;
          width: 40px;
          height: 2px;
          background-color: white;
        }
      }

      ul {
        list-style: none;
        padding: 0;
        margin: 0;

        li {
          margin-bottom: 10px;

          a, span {
            opacity: 0.8;
            transition: all 0.3s ease;
            color: white;
            text-decoration: none;

            &:hover {
              opacity: 1;
              margin-left: 5px;
            }
          }

          i {
            margin-right: 8px;
          }
        }
      }
    }
  }

  .copyright {
    text-align: center;
    padding-top: 20px;
    border-top: 1px solid rgba(255,255,255,0.2);
    font-size: 14px;
    opacity: 0.8;
  }
}

// 响应式适配
@media (max-width: 768px) {
  .header-content {
    flex-direction: column;
    gap: 15px;
  }

  .nav-menu {
    gap: 15px;
    flex-wrap: wrap;
    justify-content: center;
  }

  .hero h1 {
    font-size: 32px;
  }

  .hero p {
    font-size: 16px;
  }

  .section-title h2 {
    font-size: 28px;
  }

  .features {
    padding: 50px 0;
  }
}

@media (max-width: 480px) {
  .hero {
    padding: 40px 0;
  }

  .hero h1 {
    font-size: 26px;
  }

  .feature-card {
    padding: 20px;
  }
}
</style>