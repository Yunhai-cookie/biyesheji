<template>
  <div class="module-page">
   <div class="page-inner">
      <!-- 页面头部 -->
      <el-page-header 
        content="刷题练习模块" 
        @back="$router.push('/')"
        class="page-header"
      >
        <template #extra>
          <el-button type="warning" @click="logout" style="margin-right: 8px;">
            <el-icon><User /></el-icon>
            退出当前账号
          </el-button>
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
          <h3 class="selector-title">请选择题型</h3>
          <div class="subject-btn-group">
            <el-button
              v-for="subject in subjectList"
              :key="subject"
              :class="['subject-btn', { active: currentSubject === subject }]"
              @click="currentSubject = subject"
            >
              {{ subject }}
            </el-button>
          </div>
        </div>

        <!-- 2. 模式选择区 -->
        <div class="mode-selector" v-if="!isAnswering && currentSubject">
          <h3 class="selector-title">答题模式选择</h3>
          <el-radio-group v-model="answerMode" class="mode-radio-group">
            <el-radio label="back">背题模式（即时显示答案）</el-radio>
            <el-radio label="practice">刷题模式（交卷后显示答案）</el-radio>
          </el-radio-group>

          <!-- 刷题模式题数设置 -->
          <div class="practice-setting" v-if="answerMode === 'practice'">
            <el-form label-width="120px" inline>
              <el-form-item label="指定答题数量：">
                <el-input-number
                  v-model="practiceQuestionNum"
                  :min="5"
                  :max="100"
                  :step="5"
                  placeholder="请输入题数"
                />
                <span class="tips">题（建议5-100题）</span>
              </el-form-item>
            </el-form>
          </div>

          <el-button 
            type="primary" 
            size="large"
            class="start-btn"
            @click="startAnswer"
            :loading="loading"
          >
            <el-icon><VideoPlay /></el-icon>
            开始答题
          </el-button>
        </div>

        <!-- 答题进度可视化 -->
        <div class="progress-container" v-if="isAnswering && currentQuestions.length > 0">
          <div class="progress-text">
            {{ answerMode === 'back' ? '背题模式' : '刷题模式' }} | 
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

        <!-- 3. 题目展示区 -->
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
              type="success"
              @click="submitPaper"
              v-if="answerMode === 'practice'"
              :disabled="isSubmitted"
            >
              <el-icon><Check /></el-icon>
              {{ isSubmitted ? '已交卷' : '交卷' }}
            </el-button>
            <el-button
              type="warning"
              @click="resetAnswer"
            >
              <el-icon><Refresh /></el-icon>
              重新答题
            </el-button>
          </div>

          <!-- 背题模式-单题结果 -->
            <div class="single-result" v-if="showResult && answerMode === 'back'">
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

              <!-- ★★★ 背题模式添加笔记 + 问问AI ★★★ -->
              <div class="note-back" style="margin-top:20px;">
                <h5 style="margin-bottom:10px;">我的笔记</h5>
                <el-button type="primary" size="small" @click="openBackNoteDialog" style="margin-right: 8px;">
                  <el-icon><Edit /></el-icon>
                  添加笔记
                </el-button>
                <!-- 新增：背题模式问问AI按钮 -->
                <el-button type="primary" size="small" @click="askAi(currentQuestion)" style="background: #409eff;">
                  <el-icon><ChatDotRound /></el-icon>
                  问问AI
                </el-button>
              </div>
              
            </div>

            <!-- ★★★ 背题模式笔记弹窗 ★★★ -->
            <el-dialog
              v-model="backNoteVisible"
              title="编辑笔记（背题模式）"
              width="600px"
              :close-on-click-modal="false"
              :destroy-on-close="false"
            >
              <div style="margin-bottom:12px;font-size:14px;">题目ID：{{ backNoteQid }}</div>
              <el-input
                v-model="backNoteContent"
                type="textarea"
                :rows="6"
                placeholder="请输入你的学习笔记..."
                maxlength="500"
                show-word-limit
              />
              <template #footer>
                <el-button @click="backNoteVisible = false">取消</el-button>
                <el-button type="primary" @click="saveBackNote">保存笔记</el-button>
              </template>
            </el-dialog>
        </div>

        <!-- 4. 刷题模式-整卷结果 -->
        <div class="total-result" v-if="showTotalResult">
          <el-card class="result-card">
            <template #header>
              <div class="result-header">
                <h3>答题结果汇总</h3>
                <el-button 
                  type="primary" 
                  icon="UploadFilled" 
                  @click="exportResult"
                  style="margin-left: 16px;"
                >
                  导出答题结果（Excel）
                </el-button>
              </div>
            </template>
            <div class="result-summary">
              <el-statistic
                title="总题数"
                :value="currentQuestions.length"
                class="summary-item"
              />
              <el-statistic
                title="做对"
                :value="correctNum"
                class="summary-item"
                value-style="color: #67C23A;"
              />
              <el-statistic
                title="做错"
                :value="wrongNum"
                class="summary-item"
                value-style="color: #F56C6C;"
              />
              <el-statistic 
                title="总耗时" 
                :value="totalTimerSeconds"  
                :formatter="formatTime"
                class="summary-item"
              />
            </div>

            <el-divider content-position="left">详细答题结果</el-divider>
            <el-table
              :data="resultTableData"
              border
              size="small"
              max-height="500"
            >
              <el-table-column prop="id" label="题号" align="center" width="80" />
              <el-table-column prop="title" label="题目" align="center" min-width="200" />
              <el-table-column prop="optionA" label="选项A" align="center" min-width="150" />
              <el-table-column prop="optionB" label="选项B" align="center" min-width="150" />
              <el-table-column prop="optionC" label="选项C" align="center" min-width="150" />
              <el-table-column prop="optionD" label="选项D" align="center" min-width="150" />
              <el-table-column prop="correctAnswer" label="正确答案" align="center" width="100" />
              <el-table-column prop="userAnswer" label="你的答案" align="center" width="100" />
              <el-table-column prop="fullCorrectRate" label="全站正确率" align="center" width="120" />
              <el-table-column prop="errorOption" label="易错项" align="center" width="100" />
              <el-table-column prop="timer" label="做题计时" align="center" width="120" />
              <el-table-column prop="analysis" label="解析" align="center" width="100">
                <template #default="scope">
                  <el-button
                    type="text"
                    @click="viewAnalysis(scope.row)"
                  >
                    查看
                  </el-button>
                </template>
              </el-table-column>
              <el-table-column prop="knowledgePoint" label="考点" align="center" min-width="150" />
              <el-table-column prop="note" label="笔记" align="center" width="150">
                <template #default="scope">
                  <el-button
                    type="text"
                    @click="editNote(scope.row)"
                  >
                    {{ scope.row.note ? '编辑' : '添加' }}
                  </el-button>
                </template>
              </el-table-column>
              <!-- 新增：问问AI列 -->
              <el-table-column label="问问AI" align="center" width="120">
                <template #default="scope">
                  <el-button
                    type="text"
                    @click="askAi(scope.row)"
                    style="color: #409eff;"
                  >
                    <el-icon><ChatDotRound /></el-icon> 问问AI
                  </el-button>
                </template>
              </el-table-column>
            </el-table>

            <el-button
              type="primary"
              @click="resetAnswer"
              class="redo-btn"
            >
              <el-icon><Refresh /></el-icon>
              重新答题
            </el-button>
          </el-card>
        </div>

        <!-- 空状态 -->
        <el-empty 
          image-size="150"
          description="当前题型暂无题目，请选择其他题型！"
          class="empty-content"
          v-if="!isAnswering && currentSubject && !hasQuestionData"
        >
          <el-button type="primary" size="large" @click="resetAnswer">
            重新选择
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

    <!-- 唯一的解析弹窗（已删除所有AI相关内容） -->
    <el-dialog
      v-model="analysisDialogVisible"
      title="题目解析"
      width="800px"
      top="5vh"
      :close-on-click-modal="false"
    >
      <div v-if="currentAnalysisQuestion" class="analysis-content">
        <div class="analysis-item">
          <span class="label">题目：</span>
          <span>{{ currentAnalysisQuestion.title }}</span>
        </div>
        <div class="analysis-item">
          <span class="label">选项：</span>
          <div class="options">
            <div>A：{{ currentAnalysisQuestion.optionA || '-' }}</div>
            <div>B：{{ currentAnalysisQuestion.optionB || '-' }}</div>
            <div>C：{{ currentAnalysisQuestion.optionC || '-' }}</div>
            <div>D：{{ currentAnalysisQuestion.optionD || '-' }}</div>
          </div>
        </div>
        <div class="analysis-item">
          <span class="label">正确答案：</span>
          <span class="correct-answer">{{ currentAnalysisQuestion.correctAnswer }}</span>
        </div>
        <div class="analysis-item">
          <span class="label">你的答案：</span>
          <span :class="currentAnalysisQuestion.userAnswer === currentAnalysisQuestion.correctAnswer ? 'right' : 'wrong'">
            {{ currentAnalysisQuestion.userAnswer || '未作答' }}
          </span>
        </div>
        <div class="analysis-item">
          <span class="label">考点：</span>
          <span>{{ currentAnalysisQuestion.knowledgePoint }}</span>
        </div>
        <div class="analysis-item">
          <span class="label">解析：</span>
          <div class="analysis-text">{{ currentAnalysisQuestion.analysis }}</div>
        </div>
        <div class="analysis-item">
          <span class="label">笔记：</span>
          <el-input
            type="textarea"
            v-model="currentAnalysisQuestion.note"
            placeholder="请输入笔记（选填）"
            rows="3"
            @blur="() => saveNoteByAnalysis(currentAnalysisQuestion)"
          />
        </div>
      </div>
      <template #footer>
        <el-button @click="analysisDialogVisible = false">关闭</el-button>
      </template>
    </el-dialog>

    <!-- AI弹窗组件（仅保留，用于表格的问问AI按钮调用） -->
    <AskAiDialog 
      id="ai-dialog-practice"
      ref="askAiDialog" 
      :question="aiQuestion" 
      :options="aiOptions" 
    />

    <!-- 笔记编辑弹窗 -->
    <el-dialog
      v-model="noteDialogVisible"
      title="编辑笔记"
      width="600px"
      :close-on-click-modal="false"
      :destroy-on-close="false"   
      @opened="onNoteDialogOpen"  
    >
      <div style="margin-bottom:12px;font-size:14px;">
        题目ID：{{ editNoteQuestionId }}
      </div>
      <el-input
        v-model="editNoteContent"
        type="textarea"
        :rows="6"
        placeholder="请输入你的学习笔记，支持多行输入..."
        maxlength="500"
        show-word-limit
      />
      <template #footer>
        <el-button @click="noteDialogVisible = false">取消</el-button>
        <el-button type="primary" @click="confirmSaveNote">保存笔记</el-button>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import {
  HomeFilled, VideoPlay, ArrowLeft, ArrowRight, Check, Refresh, UploadFilled, WarningFilled, User
} from '@element-plus/icons-vue'
import { questionApi } from '@/api/questionApi'
import { recordApi, noteApi } from '@/api/recordApi'
import * as XLSX from 'xlsx'
import AskAiDialog from '@/components/AskAiDialog.vue'
import { ChatDotRound } from '@element-plus/icons-vue'

/* ========== 用户ID持久化 ========== */
const generateUniqueUserId = () => {
  const timestamp = new Date().getTime()
  const random = Math.floor(Math.random() * 10000)
  return `user_${timestamp}_${random}`
}
const initUser = () => {
  if (!localStorage.getItem('userId')) {
    const newUserId = generateUniqueUserId()
    localStorage.setItem('userId', newUserId)
    ElMessage.success(`已初始化新账号，用户ID：${newUserId}`)
  }
}
const userId = ref(localStorage.getItem('userId'))

/* ========== 数据持久化 ========== */
const initBackModeProgress = () => {
  const saved = localStorage.getItem('backModeProgress')
  if (saved) backModeProgress.value = JSON.parse(saved)
}
const initUserNotes = () => {
  const saved = localStorage.getItem('userNotes')
  if (saved) userNotes.value = JSON.parse(saved)
}

/* ========== 响应式数据 ========== */
const subjectList = ref(['常识判断', '言语理解', '数量关系', '判断推理', '资料分析'])
const currentSubject = ref('常识判断')
const answerMode = ref('back')
const practiceQuestionNum = ref(10)
const isAnswering = ref(false)
const currentQuestions = ref([])
const currentIndex = ref(0)

const currentQuestion = computed(() => {
  if (!currentQuestions.value.length) return null
  return currentQuestions.value[currentIndex.value]
})
const userAnswers = ref({})
const showResult = ref(false)
const showTotalResult = ref(false)
const isSubmitted = ref(false)
const questionTimers = ref({})
const questionUsedSeconds = ref({})
const totalTimerSeconds = ref(0)
let totalTimerInterval = null
const userNotes = ref({})
const noteSaveSuccess = ref(false)
const correctNum = ref(0)
const wrongNum = ref(0)
const resultTableData = ref([])
const analysisDialogVisible = ref(false)
const currentAnalysisQuestion = ref(null)
const noteDialogVisible = ref(false)
const editNoteContent = ref('')
const editNoteQuestionId = ref(null)
const loading = ref(false)
const hasQuestionData = computed(() => currentQuestions.value.length > 0)
const backModeProgress = ref({})
const currentNote = ref('')

/* ========== 工具函数 ========== */
const formatTime = seconds => {
  const s = Number(seconds) || 0
  const m = Math.floor(s / 60).toString().padStart(2, '0')
  const sec = (s % 60).toString().padStart(2, '0')
  return `${m}:${sec}`
}
const shuffleArray = arr => {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
const getQuestionOptions = q => ({
  A: q.optionA || '-',
  B: q.optionB || '-',
  C: q.optionC || '-',
  D: q.optionD || '-'
})

/* ========== 背题进度 ========== */
const saveBackModeProgress = (subject, qId) => {
  const id = Number(qId)
  if (isNaN(id)) return
  if (!backModeProgress.value[subject]) backModeProgress.value[subject] = { lastQuestionId: id, doneQuestionIds: [] }
  const list = backModeProgress.value[subject].doneQuestionIds
  if (!list.includes(id)) list.push(id)
  backModeProgress.value[subject].lastQuestionId = id
  localStorage.setItem('backModeProgress', JSON.stringify(backModeProgress.value))
}

/* ========== 计时 ========== */
const startQuestionTimer = qId => {
  const id = Number(qId)
  if (isNaN(id)) return
  stopQuestionTimer(id)
  if (!questionUsedSeconds.value[id]) questionUsedSeconds.value[id] = 0
  questionTimers.value[id] = setInterval(() => {
    questionUsedSeconds.value[id]++
    totalTimerSeconds.value = Object.values(questionUsedSeconds.value).reduce((a, b) => a + (b || 0), 0)
  }, 1000)
}
const stopQuestionTimer = qId => {
  const id = Number(qId)
  if (questionTimers.value[id]) {
    clearInterval(questionTimers.value[id])
    delete questionTimers.value[id]
  }
}
const stopAllQuestionTimers = () => {
  Object.keys(questionTimers.value).forEach(id => stopQuestionTimer(Number(id)))
}

/* ========== 登录/退出 ========== */
const logout = () => {
  ElMessageBox.confirm(
    '确认退出当前账号？再次登录将生成新账号，原账号数据仍保留（需记住原ID才能恢复）！',
    '退出账号',
    { confirmButtonText: '确认', cancelButtonText: '取消', type: 'warning' }
  ).then(() => {
    localStorage.removeItem('userId')
    ElMessage.success('已退出账号，下次登录将生成新账号！')
    window.location.reload()
  })
}

/* ========== 开始答题 ========== */
const startAnswer = async () => {
  loading.value = true
  try {
    const res = await questionApi.getQuestionList(currentSubject.value)
    const all = res.data || []
    if (!all.length) {
      ElMessage.warning('暂无题目')
      loading.value = false
      return
    }
    isSubmitted.value = false
    stopAllQuestionTimers()
    totalTimerSeconds.value = 0
    clearInterval(totalTimerInterval)

    if (answerMode.value === 'practice') {
      const n = Math.min(practiceQuestionNum.value, all.length)
      currentQuestions.value = shuffleArray([...all]).slice(0, n)
      currentIndex.value = 0
    } else {
      currentQuestions.value = [...all]
      const { data } = await recordApi.getBackProgress(currentSubject.value)
      backModeProgress.value = data || { lastQuestionId: 0, doneList: [] }
      const lastId = backModeProgress.value.lastQuestionId
      if (lastId) {
        const idx = currentQuestions.value.findIndex(q => Number(q.id) === lastId)
        currentIndex.value = idx >= 0 && idx < all.length - 1 ? idx + 1 : 0
        if (currentIndex.value) ElMessage.info(`已恢复【${currentSubject.value}】背题进度，从第 ${currentIndex.value + 1} 题开始`)
      } else {
        currentIndex.value = 0
      }
    }

    all.forEach(q => {
      const id = Number(q.id)
      if (!questionUsedSeconds.value[id]) questionUsedSeconds.value[id] = 0
    })
    userAnswers.value = {}
    showResult.value = false
    showTotalResult.value = false
    isAnswering.value = true
    const first = currentQuestions.value[currentIndex.value]
    if (first?.id) startQuestionTimer(Number(first.id))
  } catch (e) {
    console.error(e)
    ElMessage.error('获取题目失败，请检查网络或后端接口！')
  } finally {
    loading.value = false
  }
}

/* ========== 选择选项 ========== */
const selectOption = async key => {
  if (!currentQuestion.value?.id) return
  const qId = Number(currentQuestion.value.id)
  userAnswers.value[qId] = key

  if (answerMode.value === 'back') {
    stopQuestionTimer(qId)
    showResult.value = true
    const isCorrect = key === currentQuestion.value.correctAnswer
    const seconds = Number(questionUsedSeconds.value[qId]) || 0
    const recordData = {
      questionId: qId,
      userAnswer: key,
      correctAnswer: currentQuestion.value.correctAnswer || '',
      answerMode: 'back',
      timerSeconds: seconds,
      isCorrect
    }
    try {
      await recordApi.saveAnswerRecord(recordData)
    } catch (e) {
      console.error('背题记录失败:', e)
    }
    const doneList = Array.from(new Set([...(backModeProgress.value.doneList || []), qId]))
    const progress = { subject: currentSubject.value, lastQuestionId: qId, doneList }
    try {
      await recordApi.saveBackProgress(progress)
      backModeProgress.value = { lastQuestionId: qId, doneList }
    } catch (e) {
      console.error('背题进度失败:', e)
    }
    saveBackModeProgress(currentSubject.value, qId)
  } else {
    showResult.value = false
  }
  /* 刷题模式自动加载笔记 */
  if (answerMode.value === 'practice') await loadCurrentNote()
}

/* ========== 上一题 / 下一题 ========== */
const prevQuestion = () => {
  if (currentIndex.value <= 0) return
  stopQuestionTimer(Number(currentQuestion.value.id))
  currentIndex.value--
  startQuestionTimer(Number(currentQuestion.value.id))
  showResult.value = false
  if (answerMode.value === 'practice') loadCurrentNote()
}
const nextQuestion = () => {
  if (currentIndex.value >= currentQuestions.value.length - 1) return ElMessage.info('已完成所有题目！')
  stopQuestionTimer(Number(currentQuestion.value.id))
  currentIndex.value++
  startQuestionTimer(Number(currentQuestion.value.id))
  showResult.value = false
  if (answerMode.value === 'practice') loadCurrentNote()
}

/* ========== 交卷 ========== */
const submitPaper = async () => {
  stopAllQuestionTimers()
  clearInterval(totalTimerInterval)
  isSubmitted.value = true
  let correct = 0,
    wrong = 0
  const resultData = []
  const promises = []
  currentQuestions.value.forEach(q => {
    const qId = Number(q.id)
    const userAns = userAnswers.value[qId] || '未作答'
    const ok = userAns === q.correctAnswer
    ok ? correct++ : wrong++
    const seconds = Number(questionUsedSeconds.value[qId]) || 0
    resultData.push({
      id: qId,
      title: q.title.length > 20 ? q.title.substring(0, 20) + '...' : q.title,
      optionA: q.optionA || '-',
      optionB: q.optionB || '-',
      optionC: q.optionC || '-',
      optionD: q.optionD || '-',
      correctAnswer: q.correctAnswer || '',
      userAnswer: userAns,
      fullCorrectRate: `${q.fullCorrectRate || 0}%`,
      errorOption: q.errorOption || '-',
      timer: formatTime(seconds),
      analysis: q.analysis || '暂无解析',
      knowledgePoint: q.knowledgePoint || '-',
      note: userNotes.value[qId] || ''
    })
    if (userAns !== '未作答') {
      promises.push(
        recordApi.saveAnswerRecord({
          questionId: qId,
          userAnswer: userAns,
          correctAnswer: q.correctAnswer || '',
          answerMode: 'practice',
          timerSeconds: seconds,
          isCorrect: ok
        })
      )
    }
  })
  if (promises.length) {
    try {
      await Promise.all(promises)
      ElMessage.success('答题记录已保存！')
    } catch (e) {
      console.error(e)
      ElMessage.warning('部分答题记录保存失败！')
    }
  }
  correctNum.value = correct
  wrongNum.value = wrong
  resultTableData.value = resultData
  showTotalResult.value = true
}

/* ========== 重新答题 ========== */
const resetAnswer = () => {
  stopAllQuestionTimers()
  clearInterval(totalTimerInterval)
  questionTimers.value = {}
  totalTimerSeconds.value = 0
  isSubmitted.value = false
  isAnswering.value = false
  showResult.value = false
  showTotalResult.value = false
  currentQuestions.value = []
  userAnswers.value = {}
}

/* ========== 笔记：保存 & 加载 & 编辑 ========== */
const saveNote = async () => {
  if (!currentQuestion.value?.id) return ElMessage.warning('请先选择一道题')
  if (!currentNote.value.trim()) return ElMessage.warning('请输入笔记内容')
  try {
    await noteApi.saveNote({
      questionId: Number(currentQuestion.value.id),
      noteContent: currentNote.value.trim()
    })
    userNotes.value[Number(currentQuestion.value.id)] = currentNote.value
    localStorage.setItem('userNotes', JSON.stringify(userNotes.value))
    noteSaveSuccess.value = true
    setTimeout(() => (noteSaveSuccess.value = false), 2000)
    ElMessage.success('笔记保存成功！')
  } catch (e) {
    console.error(e)
    ElMessage.error('笔记保存失败！')
  }
}
async function loadCurrentNote() {
  if (!currentQuestion.value?.id) return
  try {
    const { data } = await noteApi.getNote(currentQuestion.value.id)
    currentNote.value = data?.noteContent || ''
  } catch {
    currentNote.value = ''
  }
}
const editNote = async row => {
  const qId = Number(row.id)
  editNoteQuestionId.value = qId
  noteDialogVisible.value = true
  try {
    const { data } = await noteApi.getNote(qId)
    editNoteContent.value = data?.noteContent || userNotes.value[qId] || ''
  } catch {
    editNoteContent.value = userNotes.value[qId] || ''
  }
}
const confirmSaveNote = async () => {
  const qId = Number(editNoteQuestionId.value)
  try {
    await noteApi.saveNote({
      questionId: qId,
      noteContent: editNoteContent.value.trim()
    })
    userNotes.value[qId] = editNoteContent.value
    localStorage.setItem('userNotes', JSON.stringify(userNotes.value))
    const row = resultTableData.value.find(r => Number(r.id) === qId)
    if (row) row.note = editNoteContent.value
    noteDialogVisible.value = false
    ElMessage.success('笔记保存成功！')
  } catch (e) {
    console.error(e)
    ElMessage.error('笔记保存失败！')
  }
}
const backNoteVisible = ref(false)          // 弹窗显示
const backNoteContent = ref('')             // 输入框绑定
const backNoteQid = ref(null)               // 当前题号

// AI 相关变量（复用已有逻辑）
const askAiDialog = ref()
const aiQuestion = ref('')
const aiOptions = ref('')
/* 打开弹窗并加载已有笔记 */
const openBackNoteDialog = async () => {
  const qId = Number(currentQuestion.value?.id)
  if (!qId) return
  backNoteQid.value = qId
  backNoteVisible.value = true
  try {
    const { data } = await noteApi.getNote(qId)
    backNoteContent.value = data?.noteContent || userNotes.value[qId] || ''
  } catch {
    backNoteContent.value = userNotes.value[qId] || ''
  }
}

/* 保存背题笔记 */
const saveBackNote = async () => {
  const qId = backNoteQid.value
  try {
    await noteApi.saveNote({
      questionId: qId,
      noteContent: backNoteContent.value.trim()
    })
    userNotes.value[qId] = backNoteContent.value
    localStorage.setItem('userNotes', JSON.stringify(userNotes.value))
    /* 同步刷新结果表格里“笔记”列 */
    const row = resultTableData.value.find(r => Number(r.id) === qId)
    if (row) row.note = backNoteContent.value
    backNoteVisible.value = false
    ElMessage.success('笔记保存成功！')
  } catch (e) {
    console.error(e)
    ElMessage.error('笔记保存失败！')
  }
}
const viewAnalysis = (row) => {
  if (!row?.id) return ElMessage.warning('题目信息异常！')
  // 从当前题目列表中找原始题目（已包含analysis）
  const originalQuestion = currentQuestions.value.find(q => Number(q.id) === Number(row.id))
  currentAnalysisQuestion.value = {
    ...row,
    analysis: originalQuestion?.analysis || row.analysis || '暂无解析',
    title: originalQuestion?.title || row.title,
    knowledgePoint: originalQuestion?.knowledgePoint || row.knowledgePoint
  }
  analysisDialogVisible.value = true
}

const askAi = (row) => {
  aiQuestion.value = row.title || ''
  const options = []
  if (row.optionA) options.push(`A：${row.optionA}`)
  if (row.optionB) options.push(`B：${row.optionB}`)
  if (row.optionC) options.push(`C：${row.optionC}`)
  if (row.optionD) options.push(`D：${row.optionD}`)
  aiOptions.value = options.join('\n')

  let aiDialogInstance = null
  if (askAiDialog.value) {
    aiDialogInstance = askAiDialog.value
  } else {
    const dialogEl = document.getElementById('ai-dialog-practice')
    if (dialogEl) {
      aiDialogInstance = dialogEl.__vue__
    }
  }

  if (aiDialogInstance) {
    aiDialogInstance.open()
  } else {
    ElMessage.error(`
      AI弹窗加载失败！请检查：
      1. AskAiDialog.vue 文件是否在 src/components/ 目录下；
      2. 组件是否正确引入（import路径无拼写错误）；
      3. 组件标签是否写对（<AskAiDialog> 而非 <askAiDialog>）。
    `)
  }
}

/* ========== 解析弹窗保存笔记 ========== */
const saveNoteByAnalysis = async (question) => {
  if (!question?.id || !question.note.trim()) return
  try {
    await noteApi.saveNote({
      questionId: Number(question.id),
      noteContent: question.note.trim()
    })
    userNotes.value[Number(question.id)] = question.note
    localStorage.setItem('userNotes', JSON.stringify(userNotes.value))
    // 同步更新结果表格的笔记
    const row = resultTableData.value.find(r => Number(r.id) === Number(question.id))
    if (row) row.note = question.note
  } catch (e) {
    console.error('解析弹窗保存笔记失败：', e)
    ElMessage.warning('笔记保存失败！')
  }
}
/* ========== 导出 ========== */
const exportResult = () => {
  if (!resultTableData.value.length) return ElMessage.warning('暂无答题结果可导出！')
  const head = ['序号', '题目ID', '题目内容', '选项A', '选项B', '选项C', '选项D', '正确答案', '我的答案', '答题结果', '答题耗时', '全站正确率', '易错项', '考点']
  const body = resultTableData.value.map((r, i) => [
    i + 1,
    r.id,
    r.title,
    r.optionA,
    r.optionB,
    r.optionC,
    r.optionD,
    r.correctAnswer,
    r.userAnswer,
    r.userAnswer === r.correctAnswer ? '正确' : '错误',
    r.timer,
    r.fullCorrectRate,
    r.errorOption,
    r.knowledgePoint
  ])
  const sheet = XLSX.utils.aoa_to_sheet([head, ...body])
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, `${currentSubject.value}_答题结果`)
  const fname = `${currentSubject.value}_${answerMode.value === 'back' ? '背题' : '刷题'}_答题结果_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`
  XLSX.writeFile(book, fname)
  ElMessage.success(`答题结果已导出！文件名为：${fname}`)
}

/* ========== 生命周期 ========== */
onMounted(() => {
  initUser()
  initBackModeProgress()
  initUserNotes()
})
onUnmounted(() => {
  stopAllQuestionTimers()
  clearInterval(totalTimerInterval)
  localStorage.setItem('backModeProgress', JSON.stringify(backModeProgress.value))
  localStorage.setItem('userNotes', JSON.stringify(userNotes.value))
})
</script>

<style scoped>
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

.module-page {
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

.subject-selector, .mode-selector {
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

.mode-radio-group {
  margin-bottom: 20px;
}

.practice-setting {
  margin: 16px 0;
}

.tips {
  color: #999;
  margin-left: 8px;
}

.start-btn {
  margin-top: 10px;
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

.note-container {
  margin-top: 20px;
}

.note-input {
  margin-bottom: 12px;
}

.save-note-btn {
  margin-bottom: 20px;
}

.total-result {
  margin-top: 20px;
}

.result-card {
  border-radius: 8px;
}

.result-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
}

.result-summary {
  display: flex;
  flex-wrap: wrap;
  gap: 20px;
  margin-bottom: 20px;
}

.summary-item {
  flex: 1;
  min-width: 120px;
}

.redo-btn {
  margin-top: 20px;
}

.empty-content {
  margin: 50px 0;
}

.skeleton-loading {
  margin: 20px 0;
}

.dialog-analysis {
  line-height: 1.6;
  color: #666;
  margin-top: 16px;
}

.dialog-footer {
  text-align: right;
}

.dark .progress-text {
  color: #e5e5e5;
}

/* 解析弹窗样式 */
.analysis-content {
  line-height: 1.8;
}
.analysis-item {
  margin-bottom: 12px;
}
.analysis-item .label {
  font-weight: bold;
  color: #333;
  display: inline-block;
  width: 60px;
}
.options {
  display: inline-block;
  margin-left: 8px;
}
.correct-answer {
  color: #67c23a;
  font-weight: bold;
}
.analysis-text {
  margin-left: 68px;
  margin-top: 4px;
  color: #666;
  white-space: pre-wrap;
}
</style>