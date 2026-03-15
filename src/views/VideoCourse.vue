<template>
  <div class="video-course-page">
    <!-- 页面头部 -->
    <el-page-header 
      content="视频网课学习" 
      @back="$router.push('/')" 
      style="margin-bottom: 20px;"
    />

    <!-- 课程列表 -->
    <div class="course-list">
      <el-card 
        v-for="course in courseList" 
        :key="course.id"
        class="course-card"
        @click="openChapterDialog(course)"
      >
        <!-- 课程封面（修改：用data-src存储原始URL，src绑定处理后的URL） -->
        <div class="course-cover">
          <img 
            :data-src="`http://localhost:8088/gangwei${course.coverUrl}`"
            :src="processedCovers[course.id] || 'https://picsum.photos/300/180'" 
            :alt="course.title"
            class="cover-img"
            @error="handleImageError(course.id)"
          >
        </div>
        <!-- 课程信息 -->
        <div class="course-info">
          <h3 class="course-title">{{ course.title }}</h3>
          <p class="course-desc">{{ course.desc }}</p>
        </div>
      </el-card>
    </div>

    <!-- 章节选择弹窗 -->
    <el-dialog 
      v-model="chapterDialogVisible" 
      title="选择学习章节" 
      width="500px"
      destroy-on-close
    >
      <el-list border class="chapter-list">
        <el-list-item 
          v-for="chapter in chapterList" 
          :key="chapter.id"
          class="chapter-item"
        >
          <div class="chapter-info">
            <span class="chapter-title">{{ chapter.title }}</span>
            <span class="chapter-duration">
              时长：{{ formatTime(chapter.duration) }}
            </span>
          </div>
          <el-button 
            type="primary" 
            size="small"
            @click="goToPlayPage(chapter)"
          >
            立即播放
          </el-button>
        </el-list-item>
      </el-list>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue';
import { ElMessage } from 'element-plus';
import { useRouter } from 'vue-router';
import axios from 'axios';

const router = useRouter();

// 响应式数据
const courseList = ref([]); // 课程列表
const chapterDialogVisible = ref(false); // 章节弹窗显示状态
const currentCourse = ref({}); // 当前选中的课程
const chapterList = ref([]); // 章节列表
const processedCovers = ref({}); // 存储处理后的封面URL（解决COEP）

// ========== 新增：COEP图片加载绕过函数 ==========
async function loadImageWithCoepBypass(originalUrl, courseId) {
  try {
    // 1. 通过fetch请求图片（绕过COEP拦截）
    const response = await fetch(originalUrl, {
      mode: 'cors', // 强制CORS模式
      headers: {
        'Accept': 'image/jpeg, image/png, image/jpg'
      }
    });
    
    // 2. 校验响应是否成功
    if (!response.ok) throw new Error('图片请求失败');
    
    // 3. 转为Blob对象并生成本地URL
    const blob = await response.blob();
    const localUrl = URL.createObjectURL(blob);
    
    // 4. 存储处理后的URL
    processedCovers.value[courseId] = localUrl;
    
    return localUrl;
  } catch (e) {
    console.error(`加载封面${courseId}失败：`, e);
    // 失败时使用默认封面
    processedCovers.value[courseId] = 'https://picsum.photos/300/180';
    return processedCovers.value[courseId];
  }
}

// ========== 新增：图片加载错误处理 ==========
const handleImageError = (courseId) => {
  processedCovers.value[courseId] = 'https://picsum.photos/300/180';
  ElMessage.warning(`课程${courseId}封面加载失败，显示默认封面`);
};

// 初始化加载课程列表
onMounted(async () => {
  try {
    const res = await axios.get('http://localhost:8088/gangwei/api/course/list');
    if (res.data.code === 200) {
      courseList.value = res.data.data;
      
      // ========== 新增：批量处理封面图片（解决COEP） ==========
      for (const course of courseList.value) {
        if (course.coverUrl) {
          const originalUrl = `http://localhost:8088/gangwei${course.coverUrl}`;
          await loadImageWithCoepBypass(originalUrl, course.id);
        }
      }
    } else {
      ElMessage.error(res.data.msg || '加载课程列表失败');
    }
  } catch (error) {
    ElMessage.error('加载课程列表失败，请检查后端服务是否启动');
    console.error('课程列表加载失败：', error);
  }
});

// 打开章节选择弹窗
const openChapterDialog = async (course) => {
  if (!course || !course.id) {
    ElMessage.warning('课程信息异常，请重试');
    return;
  }
  
  currentCourse.value = course;
  try {
    const res = await axios.get(`http://localhost:8088/gangwei/api/course/chapters/${course.id}`);
    if (res.data.code === 200) {
      chapterList.value = res.data.data;
      // 新增：打印章节的videoUrl，检查是否为空
      console.log('章节列表的videoUrl：', chapterList.value.map(item => item.videoUrl));
      chapterDialogVisible.value = true;
    } else {
      ElMessage.error(res.data.msg || '加载章节列表失败');
    }
  } catch (error) {
    ElMessage.error('加载章节列表失败');
    console.error('章节列表加载失败：', error);
  }
};
// 跳转到视频播放页
const goToPlayPage = (chapter) => {
  if (!chapter || !chapter.id) {
    ElMessage.warning('章节信息异常，请重试');
    return;
  }
  
  // 新增：校验videoUrl是否存在
  if (!chapter.videoUrl) {
    ElMessage.error('该章节无视频地址，请联系管理员');
    chapterDialogVisible.value = false;
    return;
  }
  
  chapterDialogVisible.value = false;
  router.push({
    path: '/video-play',
    query: {
      chapterId: chapter.id,
      videoUrl: chapter.videoUrl, // 确保传递有效值
      courseId: currentCourse.value.id,
      chapterTitle: chapter.title
    }
  });
};

// 格式化时长（秒转分:秒）
const formatTime = (seconds) => {
  if (!seconds || isNaN(seconds)) return '0:00';
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}:${s < 10 ? '0' + s : s}`;
};
</script>

<style scoped>
.video-course-page {
  padding: 20px;
  background: #f5f5f5;
  min-height: calc(100vh - 80px);
}

.course-list {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
}

.course-card {
  width: 300px;
  cursor: pointer;
  transition: transform 0.3s ease;
}

.course-card:hover {
  transform: translateY(-5px);
}

.course-cover {
  width: 100%;
  height: 180px;
  overflow: hidden;
}

.cover-img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.course-info {
  padding: 10px 0;
}

.course-title {
  font-size: 18px;
  font-weight: 600;
  margin: 0 0 8px 0;
}

.course-desc {
  font-size: 14px;
  color: #666;
  margin: 0;
}

.chapter-list {
  max-height: 400px;
  overflow-y: auto;
}

.chapter-item {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 10px 0;
}

.chapter-info {
  display: flex;
  flex-direction: column;
  gap: 5px;
}

.chapter-title {
  font-size: 16px;
  font-weight: 500;
}

.chapter-duration {
  font-size: 12px;
  color: #999;
}
.course-info {
  text-align: center;   /* 可选：让整个 info 块居中 */
}
.course-title {
  text-align: center;   /* 标题居中 */
}
</style>