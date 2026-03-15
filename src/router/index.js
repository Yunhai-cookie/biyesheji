import { createRouter, createWebHashHistory } from 'vue-router'
import Home from '../views/Home.vue'
import Login from '../views/Login.vue'
import Register from '../views/Register.vue'
// 新增：导入智能选岗组件
import JobRecommend from '../views/JobRecommend.vue'
// 新增：导入网课相关组件
import VideoCourse from '../views/VideoCourse.vue' // 课程列表页
import VideoPlay from '../views/VideoPlay.vue' // 视频播放页
import ExamPractice from '@/views/ExamPractice.vue'
// 新增：导入错题本组件
import WrongQuestion from '@/views/WrongQuestion.vue'
import WrongQuestionBook from '@/views/WrongQuestionBook.vue'
import NoteBook from '@/views/NoteBook.vue'   // ✅ 这里变量名 = NoteBook

// 定义空页面（其他功能保留）
const EmptyPage = {
  template: `<div class="empty-page">
    <div class="container">
      <el-page-header content="页面开发中" @back="$router.push('/')" />
      <el-empty description="该功能页面正在开发中..." style="margin-top: 50px;" />
    </div>
  </div>`,
  style: `
    .empty-page {
      padding: 30px 0;
      min-height: 500px;
    }
  `
}

const routes = [
  {
    path: '/',
    name: 'Home',
    component: Home
  },
  {
    path: '/features',
    name: 'Features',
    component: Home
  },
  {
    path: '/login',
    name: 'Login',
    component: Login
  },
  { 
    path: '/register', 
    name: 'Register',
    component: Register
  },
  {
    path: '/exam-practice',
    name: 'ExamPractice',
    component: ExamPractice
  },
  // 新增：错题本路由（核心添加项）
  // {
  //   path: '/wrong',
  //   name: 'WrongQuestion',
  //   component: WrongQuestion
  // },
  // 关键修改：替换为实际的视频网课列表组件
  {
    path: '/video-course',
    name: 'VideoCourse',
    component: VideoCourse
  },
  // 新增：视频播放页路由
  {
    path: '/video-play',
    name: 'VideoPlay',
    component: VideoPlay
  },
  // 关键修改：替换为JobRecommend组件
  {
    path: '/job-recommend',
    name: 'JobRecommend',
    component: JobRecommend
  },
  {
    path: '/mock-exam',
    name: 'MockExam',
    component: EmptyPage
  },
  {
    path: '/ai-intv',
    name: 'AIIntv',
    component: EmptyPage
  },
  {
    path: '/wrong-question-book',
    name: 'WrongQuestionBook',
    component: WrongQuestionBook
  },
  {
    path: '/note-book',
    name: 'NoteBook',
    component: NoteBook
  },
  {
    path: '/smart-paper',
    name: 'SmartPaper',
    component: () => import('@/views/SmartPaper.vue')
  },
  {
    path: '/smart-exam/:id',
    name: 'SmartExam',
    component: () => import('@/views/SmartExam.vue')
  },
  {
    path: '/exam-record',
    name: 'ExamRecord',
    component: () => import('@/views/ExamRecord.vue')
  },
  // 底部导航对应的空页面
  { path: '/resources/:type', component: EmptyPage },
  { path: '/member', component: EmptyPage },
  { path: '/plan', component: EmptyPage },
  { path: '/analysis', component: EmptyPage },
  { path: '/service', component: EmptyPage },
  { path: '/about', component: EmptyPage },
  { path: '/partner', component: EmptyPage },
  { path: '/recruit', component: EmptyPage },
  { path: '/privacy', component: EmptyPage }
]

const router = createRouter({
  history: createWebHashHistory(),
  routes,
  scrollBehavior(to) {
    if (to.hash) {
      return {
        el: to.hash,
        behavior: 'smooth'
      }
    }
    return { top: 0 }
  }
})

export default router