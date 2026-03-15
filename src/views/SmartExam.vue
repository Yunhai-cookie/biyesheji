<template>
  <div class="exam-page">
    <el-page-header :content="`智能组卷 - 第 ${currentIndex + 1}/${totalNum} 题`">
      <template #extra>
        <el-statistic title="剩余时间" :value="leftSeconds" :formatter="formatTime" />
        <el-button type="danger" size="small" @click="handIn" style="margin-left: 12px">交卷</el-button>
      </template>
    </el-page-header>

    <el-card v-if="currentQ" shadow="never" style="margin-top: 20px">
      <div class="question-header">
        <el-tag>{{ currentQ.subjectType }}</el-tag>
        <el-tag type="warning">{{ difficultyText(currentQ.difficulty) }}</el-tag>
        <span class="timer">{{ formatTime(questionUsedSeconds[currentQ.id] || 0) }}</span>
      </div>
      <div class="title">{{ currentQ.title }}</div>
      <div class="options">
        <div
          v-for="(opt, key) in getOptions(currentQ)"
          :key="key"
          class="option-item"
          :class="{ selected: userAnswer[currentQ.id] === key }"
          @click="selectOption(key)"
        >
          <span class="key">{{ key }}：</span>{{ opt }}
        </div>
      </div>
    </el-card>

    <div class="exam-actions">
      <el-button :disabled="currentIndex === 0" @click="prev">上一题</el-button>
      <el-button :disabled="currentIndex === totalNum - 1" @click="next">下一题</el-button>
      <el-button type="primary" @click="handIn">交卷</el-button>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { ArrowLeft, ArrowRight, VideoPlay } from '@element-plus/icons-vue'
import { examApi } from '@/api/recordApi'
import { useRouter } from 'vue-router'

const router = useRouter()

/* ---------- 数据 ---------- */
const questions = ref([])
const currentIndex = ref(0)
const userAnswer = reactive({})
const questionUsedSeconds = reactive({})
const leftSeconds = ref(0)
let globalTimer = null
let questionTimer = null

const currentQ = computed(() => questions.value[currentIndex.value])
const totalNum = computed(() => questions.value.length)
const answeredNum = computed(() => Object.keys(userAnswer).length)

/* ---------- 生命周期 ---------- */
onMounted(() => {
  const paper = JSON.parse(sessionStorage.getItem('smartPaper') || '{}')
  if (!paper.questions || paper.questions.length === 0) {
    ElMessage.warning('没有可考试的题目')
    router.back()
    return
  }
  questions.value = paper.questions
  leftSeconds.value = paper.totalMinutes * 60
  startGlobalTimer()
  startQuestionTimer(currentQ.value.id)
})

onUnmounted(() => {
  clearAllTimers()
})

/* ---------- 计时器 ---------- */
const startGlobalTimer = () => {
  globalTimer = setInterval(() => {
    leftSeconds.value--
    if (leftSeconds.value <= 0) {
      clearAllTimers()
      ElMessage.warning('时间到，强制交卷')
      handIn(true)
    }
  }, 1000)
}
const startQuestionTimer = (qId) => {
  stopQuestionTimer(qId)
  questionUsedSeconds[qId] = questionUsedSeconds[qId] || 0
  questionTimer = setInterval(() => {
    questionUsedSeconds[qId]++
  }, 1000)
}
const stopQuestionTimer = (qId) => {
  if (questionTimer) {
    clearInterval(questionTimer)
    questionTimer = null
  }
}
const clearAllTimers = () => {
  if (globalTimer) clearInterval(globalTimer)
  // 防御：防止 currentQ 还未赋值
  stopQuestionTimer(currentQ.value?.id)
}

/* ---------- 答题 ---------- */
const selectOption = (key) => {
  userAnswer[currentQ.value.id] = key
}
const prev = () => {
  if (currentIndex.value === 0) return
  stopQuestionTimer(currentQ.value.id)
  currentIndex.value--
  startQuestionTimer(currentQ.value.id)
}
const next = () => {
  if (currentIndex.value === totalNum.value - 1) return
  stopQuestionTimer(currentQ.value.id)
  currentIndex.value++
  startQuestionTimer(currentQ.value.id)
}

/* ---------- 交卷 ---------- */
const handIn = async (force = false) => {
  if (!force && answeredNum.value < totalNum.value) {
    await ElMessageBox.confirm('还有未答题目，确定交卷？', '提示', { type: 'warning' })
  }
  clearAllTimers()

  const paperData = JSON.parse(sessionStorage.getItem('smartPaper') || '{}')
  if (!paperData.totalMinutes) {
    ElMessage.error('试卷数据丢失，请重新生成')
    return
  }

  let correct = 0
  questions.value.forEach(q => {
    if (userAnswer[q.id] === q.correctAnswer) correct++
  })
  const score = Math.round(correct / totalNum.value * 100)

  // 组装明细 & 累加总秒数
  const detailList = questions.value.map(q => ({
    questionId: q.id,
    userAnswer: userAnswer[q.id] || '',
    correctAnswer: q.correctAnswer,
    isCorrect: (userAnswer[q.id] === q.correctAnswer) ? 1 : 0,
    timerSeconds: questionUsedSeconds[q.id] || 0
  }))
  // 累加总秒数
  const totalUsed = detailList.reduce((sum, d) => sum + d.timerSeconds, 0)

  try {
    const examId = await examApi.submit({
      paperName: '智能组卷',
      totalNum: totalNum.value,
      totalScore: score,
      totalSeconds: Math.max(totalUsed, 1), // 真实总秒数
      details: detailList
    })
    ElMessage.success(`交卷成功！得分：${score}`)
    sessionStorage.removeItem('smartPaper')
    router.push({ name: 'ExamRecord', query: { autoShow: examId } })
  } catch (e) {
    ElMessage.error('交卷失败：' + e.message)
  }
}
/* ---------- 工具 ---------- */
const formatTime = seconds => {
  const s = Number(seconds) || 0
  if (s <= 0) return '00:00'   // ← 防御 0 / null / undefined
  const m = String(Math.floor(s / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return `${m}:${sec}`
}
const getOptions = q => ({
  A: q.optionA,
  B: q.optionB,
  C: q.optionC,
  D: q.optionD
})
const difficultyText = d => {
  if (!d) return '-'
  if (d.includes('简单')) return '简单'
  if (d.includes('中等')) return '中等'
  if (d.includes('难')) return '较难'
  return d
}
</script>

<style scoped>
.exam-page {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  min-height: 500px;
}
.question-header {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 12px;
}
.timer {
  margin-left: auto;
  font-weight: bold;
  color: #f56c6c;
}
.title {
  font-size: 16px;
  line-height: 1.8;
  margin-bottom: 20px;
}
.options {
  margin-bottom: 30px;
}
.option-item {
  padding: 12px 16px;
  border: 1px solid #e4e7ed;
  border-radius: 4px;
  margin-bottom: 12px;
  cursor: pointer;
  transition: all 0.2s;
}
.option-item:hover {
  border-color: #409eff;
}
.option-item.selected {
  background: #ecf5ff;
  border-color: #409eff;
}
.key {
  font-weight: bold;
  margin-right: 8px;
}
.exam-actions {
  text-align: center;
  margin-top: 30px;
}
</style>