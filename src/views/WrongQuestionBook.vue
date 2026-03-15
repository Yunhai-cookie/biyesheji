<template>
  <div class="wrong-book-page">
    <div class="page-inner">
      <!-- 页面头部 -->
      <el-page-header 
        content="错题本" 
        @back="$router.push('/')"
        class="page-header"
      >
        <template #extra>
          <el-button type="text" @click="$router.push('/')">
            <el-icon><HomeFilled /></el-icon>
            返回首页
          </el-button>
        </template>
      </el-page-header>

      <!-- 核心内容区 -->
      <div class="module-content">
        <!-- 1. 题型选择区 -->
        <div class="subject-selector" v-if="!isAnswering">
          <h3 class="selector-title">请选择要刷的错题题型</h3>
          <div class="subject-btn-group">
            <el-button
              v-for="subject in subjectList"
              :key="subject"
              :class="['subject-btn', { active: currentSubject === subject }]"
              @click="currentSubject = subject"
              :disabled="wrongQuestionList[subject].length === 0"
            >
              {{ subject }} <el-badge :value="wrongQuestionList[subject].length" />
            </el-button>
          </div>

          <el-button 
            type="primary" 
            size="large"
            class="start-btn"
            @click="startAnswer"
            :loading="loading"
            :disabled="wrongQuestionList[currentSubject].length === 0"
          >
            <el-icon><VideoPlay /></el-icon>
            开始刷错题
          </el-button>
        </div>

        <!-- 答题进度可视化 -->
        <div class="progress-container" v-if="isAnswering && currentQuestions.length > 0">
          <div class="progress-text">
            错题模式 | 
            当前进度：{{ currentIndex + 1 }}/{{ currentQuestions.length }} 题 
            总耗时：{{ formatTime(totalTimerSeconds) }}
          </div>
          <el-progress 
            :percentage="((currentIndex + 1) / currentQuestions.length) * 100" 
            :stroke-width="8" 
            :status="currentIndex + 1 === currentQuestions.length ? 'success' : 'normal'"
            :show-text="false"
          />
        </div>

        <!-- 错题展示区 -->
        <div class="question-container" v-if="isAnswering && currentQuestion">
          <!-- 题目头部 -->
          <div class="question-header">
            <h4 class="question-title">
              【{{ currentIndex + 1 }}/{{ currentQuestions.length }}】{{ currentQuestion.title }}
            </h4>
            <div class="question-meta">
              <el-tag size="medium">{{ currentSubject }}</el-tag>
              <el-tag type="warning" size="medium">
                {{ currentQuestion.difficulty === '简单' ? '易' : currentQuestion.difficulty === '中等' ? '中' : '难' }}
              </el-tag>
              <span class="timer">{{ formatTime(questionUsedSeconds[Number(currentQuestion.id)] || 0) }}</span>
            </div>
          </div>

          <!-- 题目选项 -->
          <div class="options-container">
            <div
              v-for="(option, key) in getQuestionOptions(currentQuestion)"
              :key="key"
              class="option-item"
              :class="{
                selected: userAnswers[currentQuestion.id] === key,
                correct: showResult && key === currentQuestion.correctAnswer,
                wrong: showResult && userAnswers[currentQuestion.id] === key && key !== currentQuestion.correctAnswer
              }"
              @click="selectOption(key)"
            >
              <span class="option-label">{{ key }}：</span>
              <span class="option-content">{{ option }}</span>
            </div>
          </div>

          <!-- 操作按钮 -->
          <div class="question-actions">
            <el-button
              type="primary"
              @click="prevQuestion"
              :disabled="currentIndex === 0"
            >
              <el-icon><ArrowLeft /></el-icon>
              上一题
            </el-button>
            <el-button
              type="primary"
              @click="nextQuestion"
              :disabled="currentIndex === currentQuestions.length - 1"
            >
              <el-icon><ArrowRight /></el-icon>
              下一题
            </el-button>
            <el-button
              type="warning"
              @click="resetAnswer"
            >
              <el-icon><Refresh /></el-icon>
              重新答题
            </el-button>
          </div>

          <!-- 单题结果 -->
          <div class="single-result" v-if="showResult">
            <el-divider content-position="left">题目解析</el-divider>
            <el-table
              :data="[{
                id: currentQuestion.id,
                correctAnswer: currentQuestion.correctAnswer,
                userAnswer: userAnswers[currentQuestion.id] || '未作答',
                fullCorrectRate: currentQuestion.fullCorrectRate + '%',
                errorOption: currentQuestion.errorOption || '-',
                timer: formatTime(questionUsedSeconds[Number(currentQuestion.id)] || 0),
                knowledgePoint: currentQuestion.knowledgePoint || '-'
              }]"
              border
              size="small"
            >
              <el-table-column prop="id" label="题号" align="center" width="80" />
              <el-table-column prop="correctAnswer" label="正确答案" align="center" width="100" />
              <el-table-column prop="userAnswer" label="你的答案" align="center" width="100" />
              <el-table-column prop="fullCorrectRate" label="全站正确率" align="center" width="120" />
              <el-table-column prop="errorOption" label="易错项" align="center" width="100" />
              <el-table-column prop="timer" label="做题计时" align="center" width="120" />
              <el-table-column prop="knowledgePoint" label="考点" align="center" min-width="150" />
            </el-table>

            <div class="analysis-container">
              <h5>解析：</h5>
              <div class="analysis-content">{{ currentQuestion.analysis || '暂无解析' }}</div>
            </div>
          </div>
        </div>

        <!-- 空状态（无错题） -->
        <el-empty 
          image-size="150"
          description="当前题型暂无错题，继续加油！"
          class="empty-content"
          v-if="!isAnswering && wrongQuestionList[currentSubject].length === 0"
        >
          <el-button type="primary" size="large" @click="$router.push('/exam-practice')">
            去刷题
          </el-button>
        </el-empty>

        <!-- 加载中状态 -->
        <el-skeleton
          v-if="loading && !isAnswering"
          class="skeleton-loading"
          :rows="10"
          animated
        />
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage } from 'element-plus'
import { 
  HomeFilled, VideoPlay, ArrowLeft, ArrowRight, Refresh
} from '@element-plus/icons-vue'
import { questionApi } from '@/api/questionApi'
import { recordApi } from '@/api/recordApi'

// ========== 基础配置 ==========
const userId = ref(localStorage.getItem("userId") || "test_user_001") 
const subjectList = ref(["常识判断", "言语理解", "数量关系", "判断推理", "资料分析"])

// ========== 响应式状态 ==========
const currentSubject = ref("常识判断")
const isAnswering = ref(false)
const currentQuestions = ref([])
const currentIndex = ref(0)
const currentQuestion = computed(() => currentQuestions.value[currentIndex.value])
const userAnswers = ref({})
const showResult = ref(false)
const loading = ref(false)

// ========== 错题本核心数据（固定结构） ==========
const wrongQuestionList = ref({
  "常识判断": [],
  "言语理解": [],
  "数量关系": [],
  "判断推理": [],
  "资料分析": []
})

// 存储原始错题记录（含standard_subject）
const wrongRecords = ref([])

// ========== 计时器相关 ==========
const questionTimers = ref({})
const questionUsedSeconds = ref({})
const totalTimerSeconds = ref(0)
let totalTimerInterval = null

// ========== 工具函数 ==========
// 格式化时间：秒 → 分:秒
const formatTime = (seconds) => {
  const s = Math.max(0, Number(seconds) || 0)
  const min = String(Math.floor(s / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return `${min}:${sec}`
}

// 获取题目选项
const getQuestionOptions = (question) => {
  if (!question) return {}
  return {
    A: question.optionA || '-',
    B: question.optionB || '-',
    C: question.optionC || '-',
    D: question.optionD || '-'
  }
}

// ========== 计时器控制 ==========
const startQuestionTimer = (questionId) => {
  const id = Number(questionId)
  stopQuestionTimer(id)
  questionUsedSeconds.value[id] = questionUsedSeconds.value[id] || 0
  
  questionTimers.value[id] = setInterval(() => {
    questionUsedSeconds.value[id]++
    totalTimerSeconds.value = Object.values(questionUsedSeconds.value).reduce((sum, s) => sum + (Number(s) || 0), 0)
  }, 1000)
}

const stopQuestionTimer = (questionId) => {
  const id = Number(questionId)
  if (questionTimers.value[id]) {
    clearInterval(questionTimers.value[id])
    delete questionTimers.value[id]
  }
}

const stopAllQuestionTimers = () => {
  Object.keys(questionTimers.value).forEach(id => stopQuestionTimer(id))
  clearInterval(totalTimerInterval)
}

// 映射函数：把后端任意格式的 subject 映射到我们固定的 5 大模块
function mapSubject(raw = '') {
  const t = raw.trim()
  if (t.includes('常识')) return '常识判断'
  if (t.includes('言语')) return '言语理解'
  if (t.includes('数量')) return '数量关系'
  if (t.includes('判断') || t.includes('推理')) return '判断推理'
  if (t.includes('资料')) return '资料分析'
  // 兜底
  return '常识判断'
}

const syncWrongQuestionList = async () => {
  loading.value = true
  try {
    // 1. 清空本地缓存
    Object.keys(wrongQuestionList.value).forEach(k => (wrongQuestionList.value[k] = []))
    wrongRecords.value = []

    // 2. 调后端：只传 subject（userId 已在请求头）
    const { data } = await recordApi.getWrongQuestions()   // ← 不传任何参数
    wrongRecords.value = Array.isArray(data) ? data : []

    // 3. 归类（你已有）
    wrongRecords.value.forEach(r => {
      const subject = mapSubject(r.subject)
      const qId = Number(r.questionId)
      if (
        subjectList.value.includes(subject) &&
        !Number.isNaN(qId) &&
        qId > 0 &&
        !wrongQuestionList.value[subject].includes(qId)
      ) {
        wrongQuestionList.value[subject].push(qId)
      }
    })

    // 4. 本地缓存（你已有）
    localStorage.setItem('wrongQuestionList', JSON.stringify(wrongQuestionList.value))
    const counts = subjectList.value
      .map(s => `${s}：${wrongQuestionList.value[s].length}题`)
      .join(' | ')
    ElMessage.success(`错题本同步成功！${counts}`)
  } catch (err) {
    console.error('同步错题本失败：', err)
    ElMessage.warning('同步失败，已使用本地缓存')
  } finally {
    loading.value = false
  }
}

// ========== 核心重构：开始刷错题 ==========
const startAnswer = async () => {
  loading.value = true
  try {
    // 1. 获取当前题型的错题ID
    const wrongIds = wrongQuestionList.value[currentSubject.value] || []
    if (wrongIds.length === 0) {
      ElMessage.warning("当前题型暂无错题！")
      loading.value = false
      return
    }

    // 2. 获取所有题目（用于展示题目内容）
    const { data } = await questionApi.getQuestionList() 
    const allQuestions = Array.isArray(data) ? data : []

    // 3. 筛选出当前题型的错题（精准匹配ID）
    const wrongQuestions = allQuestions.filter(q => {
      const qId = Number(q.id)
      return wrongIds.includes(qId)
    })

    if (wrongQuestions.length === 0) {
      ElMessage.warning("错题ID在题目库中不存在，已清空！")
      wrongQuestionList.value[currentSubject.value] = []
      localStorage.setItem("wrongQuestionList", JSON.stringify(wrongQuestionList.value))
      loading.value = false
      return
    }

    // 4. 初始化答题状态
    currentQuestions.value = wrongQuestions
    currentIndex.value = 0
    userAnswers.value = {}
    showResult.value = false
    isAnswering.value = true

    // 5. 重置计时器
    stopAllQuestionTimers()
    questionUsedSeconds.value = {}
    totalTimerSeconds.value = 0

    // 6. 启动当前题计时器
    startQuestionTimer(currentQuestions.value[0].id)

  } catch (error) {
    console.error("获取错题失败：", error)
    ElMessage.error("获取错题失败，请重试！")
  } finally {
    loading.value = false
  }
}

// ========== 核心逻辑：选择答案 ==========
const selectOption = async (key) => {
  if (!currentQuestion.value) return
  
  const questionId = Number(currentQuestion.value.id)
  userAnswers.value[currentQuestion.value.id] = key
  stopQuestionTimer(questionId)
  showResult.value = true

  // 答对：移出错题本
  if (key === currentQuestion.value.correctAnswer) {
    try {
      // 1. 通知后端更新答题状态
      await recordApi.updateAnswerRecord({
        questionId: questionId,
        userId: userId.value,
        isCorrect: true
      })

      // 2. 本地移除该错题ID
      wrongQuestionList.value[currentSubject.value] = wrongQuestionList.value[currentSubject.value].filter(
        id => id !== questionId
      )

      // 3. 更新本地缓存
      localStorage.setItem("wrongQuestionList", JSON.stringify(wrongQuestionList.value))

      // 4. 保存答题记录
      await recordApi.saveAnswerRecord({
        questionId: questionId,
        userAnswer: key,
        correctAnswer: currentQuestion.value.correctAnswer,
        answerMode: currentSubject.value,
        timerSeconds: questionUsedSeconds.value[questionId] || 0,
        isCorrect: true
      })

      ElMessage.success("回答正确！该题已移出错题本～")
    } catch (error) {
      console.error("更新错题状态失败：", error)
      ElMessage.error("回答正确，但同步后端失败，请手动刷新错题本！")
    }
  } else {
    // 答错：加入错题本（如果不存在）
    if (!wrongQuestionList.value[currentSubject.value].includes(questionId)) {
      wrongQuestionList.value[currentSubject.value].push(questionId)
      localStorage.setItem("wrongQuestionList", JSON.stringify(wrongQuestionList.value))
      
      try {
        await recordApi.saveAnswerRecord({
          questionId: questionId,
          userAnswer: key,
          correctAnswer: currentQuestion.value.correctAnswer,
          answerMode: currentSubject.value,
          timerSeconds: questionUsedSeconds.value[questionId] || 0,
          isCorrect: false
        })
      } catch (error) {
        console.error("保存答题记录失败：", error)
      }
    }
    ElMessage.warning("回答错误，再仔细看看解析哦～")
  }
}

// ========== 辅助逻辑：上一题/下一题/重新答题 ==========
const prevQuestion = () => {
  if (currentIndex.value <= 0) return
  
  stopQuestionTimer(currentQuestion.value.id)
  currentIndex.value--
  startQuestionTimer(currentQuestions.value[currentIndex.value].id)
  showResult.value = false
}

const nextQuestion = () => {
  if (currentIndex.value >= currentQuestions.value.length - 1) {
    ElMessage.info("已完成所有错题练习！")
    return
  }
  
  stopQuestionTimer(currentQuestion.value.id)
  currentIndex.value++
  startQuestionTimer(currentQuestions.value[currentIndex.value].id)
  showResult.value = false
}

const resetAnswer = () => {
  stopAllQuestionTimers()
  questionTimers.value = {}
  questionUsedSeconds.value = {}
  totalTimerSeconds.value = 0
  
  isAnswering.value = false
  showResult.value = false
  currentQuestions.value = []
  userAnswers.value = {}
}

// ========== 生命周期 ==========
onMounted(async () => {
  await syncWrongQuestionList()
})

onUnmounted(() => {
  stopAllQuestionTimers()
})
</script>

<style scoped>
.wrong-book-page {
  min-height: 100vh;
  background-color: #f5f7fa;
}

.page-inner {
  max-width: 1200px;
  margin: 0 auto;
  padding: 20px;
}

.page-header {
  margin-bottom: 20px;
}

.module-content {
  background: #fff;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 2px 12px 0 rgba(0, 0, 0, 0.05);
}

.subject-selector {
  margin-bottom: 30px;
}

.selector-title {
  font-size: 18px;
  color: #333;
  margin-bottom: 16px;
  font-weight: 600;
}

.subject-btn-group {
  display: flex;
  flex-wrap: wrap;
  gap: 12px;
}

.subject-btn {
  padding: 8px 20px;
  border-radius: 4px;
}

.subject-btn.active {
  background-color: #409eff;
  color: #fff;
  border-color: #409eff;
}

.start-btn {
  margin-top: 20px;
}

.progress-container {
  margin: 20px 16px;
  padding: 0 8px;
}

.progress-text {
  margin-bottom: 8px;
  font-size: 14px;
  color: #666;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.question-container {
  margin-top: 20px;
}

.question-header {
  margin-bottom: 20px;
}

.question-title {
  font-size: 16px;
  color: #333;
  font-weight: 600;
}

.question-meta {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-top: 8px;
}

.timer {
  color: #f56c6c;
  font-weight: 600;
  margin-left: auto;
}

.options-container {
  margin-bottom: 30px;
}

.option-item {
  padding: 12px 16px;
  border: 1px solid #e6e6e6;
  border-radius: 4px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
}

.option-item:hover {
  border-color: #409eff;
}

.option-item.selected {
  background-color: #ecf5ff;
  border-color: #409eff;
}

.option-item.correct {
  background-color: #f0f9eb;
  border-color: #67c23a;
}

.option-item.wrong {
  background-color: #fef0f0;
  border-color: #f56c6c;
}

.option-label {
  font-weight: 600;
  margin-right: 8px;
}

.question-actions {
  display: flex;
  gap: 12px;
  margin-bottom: 30px;
}

.single-result {
  margin-top: 20px;
}

.analysis-container {
  margin: 16px 0;
}

.analysis-content {
  color: #666;
  line-height: 1.6;
}

.empty-content {
  margin: 50px 0;
}

.skeleton-loading {
  margin: 20px 0;
}
</style>