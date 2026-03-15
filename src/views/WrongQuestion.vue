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
          <el-button type="text" @click="$router.push('/')">
            <el-icon><HomeFilled /></el-icon>
            返回首页
          </el-button>
          <!-- 新增：错题本入口 -->
          <el-button type="text" @click="$router.push('/wrong')">
            <el-icon><WarningFilled /></el-icon>
            我的错题本
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
              <span class="timer">{{ formatTime(singleTimerSeconds) }}</span>
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

          <!-- 操作按钮：刷题模式显示上下题+交卷 -->
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
                timer: formatTime(singleTimerSeconds),
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

            <!-- 笔记输入 -->
            <div class="note-container">
              <h5>笔记：</h5>
              <el-textarea
                v-model="currentNote"
                placeholder="请输入你的学习笔记..."
                rows="3"
                class="note-input"
              />
              <el-button
                type="primary"
                size="small"
                @click="saveNote"
                class="save-note-btn"
                :loading="noteSaving"
              >
                <el-icon><UploadFilled /></el-icon>
                保存笔记
              </el-button>
              <el-message
                v-if="noteSaveSuccess"
                type="success"
                message="笔记保存成功！"
                :duration="2000"
              />
            </div>
          </div>
        </div>

        <!-- 4. 刷题模式-整卷结果 -->
        <div class="total-result" v-if="showTotalResult">
          <el-card class="result-card">
            <template #header>
              <div class="result-header">
                <h3>答题结果汇总</h3>
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
                title="正确率"
                :value="(correctNum / currentQuestions.length * 100).toFixed(2) + '%'"
                class="summary-item"
                value-style="color: #165DFF;"
              />
              <el-statistic
                title="总耗时"
                :value="formatTime(totalTimerSeconds)"
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

        <!-- 空状态（无题目） -->
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

    <!-- 解析弹窗 -->
    <el-dialog
      v-model="analysisDialogVisible"
      title="题目解析"
      width="60%"
    >
      <div v-if="currentAnalysisQuestion">
        <h4>{{ currentAnalysisQuestion.title }}</h4>
        <div class="dialog-analysis">{{ currentAnalysisQuestion.analysis || '暂无解析' }}</div>
      </div>
    </el-dialog>

    <!-- 笔记编辑弹窗 -->
    <el-dialog
      v-model="noteDialogVisible"
      title="编辑笔记"
      width="50%"
    >
      <el-textarea
        v-model="editNoteContent"
        placeholder="请输入笔记内容..."
        rows="6"
      />
      <template #footer>
        <div class="dialog-footer">
          <el-button @click="noteDialogVisible = false">取消</el-button>
          <el-button 
            type="primary" 
            @click="confirmSaveNote"
            :loading="noteSaving"
          >
            保存
          </el-button>
        </div>
      </template>
    </el-dialog>
  </div>
</template>

<script setup>
import { ref, reactive, computed, onMounted, onUnmounted } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
// 正确导入Element Plus图标（匹配官方导出列表）
import { 
  HomeFilled, VideoPlay, ArrowLeft, ArrowRight, Check, Refresh, UploadFilled, WarningFilled
} from '@element-plus/icons-vue'
// 引入封装的后端接口
import { questionApi } from '@/api/questionApi'
// 新增：引入答题记录和笔记API
import { recordApi, noteApi } from '@/api/recordApi'

// ===================== 基础配置 =====================
// 用户ID（实际项目从登录态获取，如Pinia/Vuex）
const userId = ref("test_user_001") 

// ===================== 响应式数据 =====================
const subjectList = ref(["常识判断", "言语理解", "数量关系", "判断推理", "资料分析"])
const currentSubject = ref("常识判断")
const answerMode = ref("back")
const practiceQuestionNum = ref(10)
const isAnswering = ref(false)
const currentQuestions = ref([])
const currentIndex = ref(0)
const currentQuestion = computed(() => currentQuestions.value[currentIndex.value])
const userAnswers = ref({})
const showResult = ref(false)
const showTotalResult = ref(false)
const isSubmitted = ref(false)
const singleTimerSeconds = ref(0)
const totalTimerSeconds = ref(0)
let singleTimerInterval = null
let totalTimerInterval = null
const noteSaveSuccess = ref(false)
const noteSaving = ref(false) // 笔记保存加载状态
const correctNum = ref(0)
const wrongNum = ref(0)
const resultTableData = ref([])
const analysisDialogVisible = ref(false)
const currentAnalysisQuestion = ref(null)
const noteDialogVisible = ref(false)
const editNoteContent = ref("")
const editNoteQuestionId = ref(null)
// 加载状态
const loading = ref(false)
// 判断是否有题目数据
const hasQuestionData = computed(() => {
  return currentQuestions.value.length > 0
})
// 当前题目笔记
const currentNote = ref("")

// ===================== 工具函数 =====================
/**
 * 格式化时间（秒转分:秒）
 */
const formatTime = (seconds) => {
  const min = Math.floor(seconds / 60).toString().padStart(2, '0')
  const sec = (seconds % 60).toString().padStart(2, '0')
  return `${min}:${sec}`
}

/**
 * 数组乱序（洗牌算法）
 */
const shuffleArray = (array) => {
  const newArr = [...array]
  for (let i = newArr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[newArr[i], newArr[j]] = [newArr[j], newArr[i]]
  }
  return newArr
}

/**
 * 适配后端字段：将optionA/optionB等转为前端需要的options对象
 */
const getQuestionOptions = (question) => {
  if (!question) return {}
  return {
    A: question.optionA || '-',
    B: question.optionB || '-',
    C: question.optionC || '-',
    D: question.optionD || '-'
  }
}

// ===================== 核心方法 =====================
/**
 * 开始答题（从后端获取题目）
 */
const startAnswer = async () => {
  loading.value = true
  try {
    let allQuestions = []
    
    // 调用后端接口获取对应题型的题目
    const res = await questionApi.getQuestionList(currentSubject.value)
    allQuestions = res.data || []

    if (!allQuestions.length) {
      ElMessage.warning("当前题型暂无题目！")
      loading.value = false
      return
    }

    // 初始化交卷状态
    isSubmitted.value = false

    // 处理刷题模式题数
    let targetNum = practiceQuestionNum.value
    if (answerMode.value === "practice") {
      if (targetNum > allQuestions.length) {
        targetNum = allQuestions.length
        ElMessage.info(`当前题型仅有${allQuestions.length}题，已自动调整题数！`)
      }
      currentQuestions.value = shuffleArray([...allQuestions]).slice(0, targetNum)
    } else {
      currentQuestions.value = [...allQuestions]
    }

    // 重置状态
    currentIndex.value = 0
    userAnswers.value = {}
    singleTimerSeconds.value = 0
    totalTimerSeconds.value = 0
    showResult.value = false
    showTotalResult.value = false
    isAnswering.value = true

    // 启动计时
    startSingleTimer()
    startTotalTimer()
  } catch (error) {
    console.error("获取题目失败：", error)
    ElMessage.error("获取题目失败，请检查网络或后端接口！")
  } finally {
    loading.value = false
  }
}

/**
 * 启动单题计时
 */
const startSingleTimer = () => {
  clearInterval(singleTimerInterval)
  singleTimerSeconds.value = 0
  singleTimerInterval = setInterval(() => {
    singleTimerSeconds.value++
  }, 1000)
}

/**
 * 启动总计时
 */
const startTotalTimer = () => {
  clearInterval(totalTimerInterval)
  totalTimerSeconds.value = 0
  totalTimerInterval = setInterval(() => {
    totalTimerSeconds.value++
  }, 1000)
}

/**
 * 加载题目笔记（从后端获取）
 */
const loadQuestionNote = async () => {
  if (!currentQuestion.value || !userId.value) return
  try {
    const res = await noteApi.getNote(userId.value, currentQuestion.value.id)
    currentNote.value = res.data?.noteContent || ""
  } catch (error) {
    console.error("加载笔记失败：", error)
    currentNote.value = ""
  }
}

/**
 * 保存单题答题记录（背题模式）
 */
const saveSingleAnswerRecord = async () => {
  if (!currentQuestion.value || !userId.value) return
  const userAnswer = userAnswers.value[currentQuestion.value.id]
  if (!userAnswer) return
  
  try {
    await recordApi.saveAnswerRecord({
      userId: userId.value,
      questionId: currentQuestion.value.id,
      userAnswer: userAnswer,
      correctAnswer: currentQuestion.value.correctAnswer,
      answerMode: answerMode.value,
      timerSeconds: singleTimerSeconds.value
    })
  } catch (error) {
    console.error("保存单题记录失败：", error)
  }
}

/**
 * 选择选项
 */
const selectOption = (key) => {
  userAnswers.value[currentQuestion.value.id] = key
  
  // 背题模式即时显示结果
  if (answerMode.value === "back") {
    clearInterval(singleTimerInterval)
    showResult.value = true
    loadQuestionNote() // 加载笔记
    saveSingleAnswerRecord() // 保存答题记录
  }
}

/**
 * 上一题
 */
const prevQuestion = () => {
  if (currentIndex.value > 0) {
    currentIndex.value--
    showResult.value = false
    startSingleTimer()
  }
}

/**
 * 下一题
 */
const nextQuestion = () => {
  if (currentIndex.value < currentQuestions.value.length - 1) {
    currentIndex.value++
    showResult.value = false
    startSingleTimer()
  } else {
    ElMessage.info("已完成所有题目！")
  }
}

/**
 * 保存笔记（云同步）
 */
const saveNote = async () => {
  if (!currentQuestion.value || !userId.value) return
  
  noteSaving.value = true
  try {
    await noteApi.saveNote({
      userId: userId.value,
      questionId: currentQuestion.value.id,
      noteContent: currentNote.value
    })
    ElMessage.success("笔记保存成功！")
    noteSaveSuccess.value = true
    setTimeout(() => noteSaveSuccess.value = false, 2000)
  } catch (error) {
    console.error("保存笔记失败：", error)
    ElMessage.error("笔记保存失败，请重试！")
  } finally {
    noteSaving.value = false
  }
}

/**
 * 交卷（刷题模式）
 */
const submitPaper = async () => {
  // 停止计时
  clearInterval(singleTimerInterval)
  clearInterval(totalTimerInterval)
  
  // 标记已交卷，防止重复提交
  isSubmitted.value = true

  // 统计结果
  let correct = 0
  let wrong = 0
  const resultData = []

  // 批量保存答题记录
  const savePromises = []
  currentQuestions.value.forEach(question => {
    const userAnswer = userAnswers.value[question.id] || "未作答"
    const isCorrect = userAnswer === question.correctAnswer
    if (isCorrect) correct++
    else wrong++

    // 构建结果表格数据
    resultData.push({
      id: question.id,
      title: question.title.length > 20 ? `${question.title.substring(0, 20)}...` : question.title,
      optionA: question.optionA || "-",
      optionB: question.optionB || "-",
      optionC: question.optionC || "-",
      optionD: question.optionD || "-",
      correctAnswer: question.correctAnswer,
      userAnswer: userAnswer,
      fullCorrectRate: `${question.fullCorrectRate || 0}%`,
      errorOption: question.errorOption || "-",
      timer: formatTime(singleTimerSeconds.value),
      analysis: "",
      knowledgePoint: question.knowledgePoint || "-",
      note: ""
    })

    // 保存记录（仅保存已作答的题目）
    if (userAnswer !== "未作答" && userId.value) {
      savePromises.push(recordApi.saveAnswerRecord({
        userId: userId.value,
        questionId: question.id,
        userAnswer: userAnswer,
        correctAnswer: question.correctAnswer,
        answerMode: answerMode.value,
        timerSeconds: singleTimerSeconds.value
      }))
    }
  })

  // 批量提交答题记录
  try {
    if (savePromises.length > 0) {
      await Promise.all(savePromises)
      ElMessage.success("答题记录已保存！")
    }
  } catch (error) {
    console.error("保存答题记录失败：", error)
    ElMessage.warning("部分答题记录保存失败！")
  }

  // 更新统计数据
  correctNum.value = correct
  wrongNum.value = wrong
  resultTableData.value = resultData
  showTotalResult.value = true
}

/**
 * 重新答题
 */
const resetAnswer = () => {
  // 停止计时
  clearInterval(singleTimerInterval)
  clearInterval(totalTimerInterval)
  
  // 重置交卷状态
  isSubmitted.value = false
  
  // 重置答题状态
  isAnswering.value = false
  showResult.value = false
  showTotalResult.value = false
  currentQuestions.value = []
  userAnswers.value = {}
  currentNote.value = ""
}

/**
 * 查看解析
 */
const viewAnalysis = (row) => {
  const question = currentQuestions.value.find(q => q.id === row.id)
  currentAnalysisQuestion.value = question
  analysisDialogVisible.value = true
}

/**
 * 编辑笔记（刷题模式结果页）
 */
const editNote = async (row) => {
  editNoteQuestionId.value = row.id
  noteDialogVisible.value = true
  
  // 加载已有笔记
  try {
    const res = await noteApi.getNote(userId.value, row.id)
    editNoteContent.value = res.data?.noteContent || ""
  } catch (error) {
    console.error("加载笔记失败：", error)
    editNoteContent.value = ""
  }
}

/**
 * 确认保存笔记（弹窗）
 */
const confirmSaveNote = async () => {
  if (!editNoteQuestionId.value || !userId.value) return
  
  noteSaving.value = true
  try {
    await noteApi.saveNote({
      userId: userId.value,
      questionId: editNoteQuestionId.value,
      noteContent: editNoteContent.value
    })
    
    // 更新表格显示
    const row = resultTableData.value.find(item => item.id === editNoteQuestionId.value)
    if (row) row.note = editNoteContent.value
    
    noteDialogVisible.value = false
    ElMessage.success("笔记保存成功！")
  } catch (error) {
    console.error("保存笔记失败：", error)
    ElMessage.error("笔记保存失败，请重试！")
  } finally {
    noteSaving.value = false
  }
}

// ===================== 生命周期 =====================
// 组件卸载时清理定时器
onUnmounted(() => {
  clearInterval(singleTimerInterval)
  clearInterval(totalTimerInterval)
})
</script>

<style lang="scss" scoped>
.module-page {
  width: 100%;
  height: 100%;
  background-color: #F5F7FA;
  padding: 30px;
  min-width: 1024px;

  .page-inner {
    width: 95%;
    margin: 0 auto;
    background-color: #FFFFFF;
    border-radius: 16px;
    padding: 30px;
    box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);
    min-height: calc(100vh - 140px);
  }

  .page-header {
    margin-bottom: 40px;
    padding-bottom: 20px;
    border-bottom: 1px solid #E5E7EB;

    :deep(.el-page-header__content) {
      font-size: 24px;
      font-weight: 600;
      color: #303133;
    }

    :deep(.el-page-header__extra) {
      .el-button {
        font-size: 16px;
        color: #165DFF;
        margin-left: 10px;

        &:hover {
          color: #0E42D2;
        }
      }
    }
  }

  .module-content {
    display: flex;
    flex-direction: column;
    align-items: flex-start;
    justify-content: flex-start;
    min-height: 600px;

    // 题型选择区
    .subject-selector {
      width: 100%;
      margin-bottom: 30px;

      .selector-title {
        font-size: 18px;
        font-weight: 600;
        color: #303133;
        margin-bottom: 20px;
      }

      .subject-btn-group {
        display: flex;
        flex-wrap: wrap;
        gap: 12px;

        .subject-btn {
          padding: 12px 24px;
          border-radius: 8px;
          font-size: 16px;
          transition: all 0.3s;

          &.active {
            background-color: #165DFF;
            color: #FFFFFF;
          }

          &:hover:not(.active) {
            background-color: #F0F5FF;
            color: #165DFF;
          }
        }
      }
    }

    // 模式选择区
    .mode-selector {
      width: 100%;
      margin-bottom: 30px;
      padding: 20px;
      background-color: #F9FAFC;
      border-radius: 12px;

      .selector-title {
        font-size: 18px;
        font-weight: 600;
        color: #303133;
        margin-bottom: 20px;
      }

      .mode-radio-group {
        margin-bottom: 20px;

        :deep(.el-radio) {
          margin-right: 20px;
          font-size: 16px;
        }
      }

      .practice-setting {
        margin-bottom: 20px;

        .tips {
          font-size: 14px;
          color: #909399;
          margin-left: 8px;
        }
      }

      .start-btn {
        padding: 12px 32px;
        font-size: 16px;
        border-radius: 8px;
      }
    }

    // 题目展示区
    .question-container {
      width: 100%;
      padding: 24px;
      background-color: #F9FAFC;
      border-radius: 12px;

      .question-header {
        display: flex;
        justify-content: space-between;
        align-items: flex-start;
        margin-bottom: 24px;

        .question-title {
          font-size: 18px;
          font-weight: 600;
          color: #303133;
          margin: 0;
        }

        .question-meta {
          display: flex;
          align-items: center;
          gap: 8px;

          .timer {
            font-size: 16px;
            font-weight: 600;
            color: #F56C6C;
            margin-left: 10px;
          }
        }
      }

      .options-container {
        margin-bottom: 30px;

        .option-item {
          padding: 16px;
          margin-bottom: 12px;
          border: 2px solid #E5E7EB;
          border-radius: 8px;
          cursor: pointer;
          transition: all 0.2s;
          font-size: 16px;

          &:hover {
            border-color: #165DFF;
            background-color: #F0F5FF;
          }

          &.selected {
            border-color: #165DFF;
            background-color: #F0F5FF;
          }

          &.correct {
            border-color: #67C23A;
            background-color: #F0FFF4;
          }

          &.wrong {
            border-color: #F56C6C;
            background-color: #FFF2F2;
          }

          .option-label {
            font-weight: 600;
            margin-right: 8px;
          }
        }
      }

      .question-actions {
        display: flex;
        gap: 12px;
        margin-bottom: 24px;
      }

      .single-result {
        margin-top: 20px;

        .analysis-container {
          margin: 20px 0;

          h5 {
            font-size: 16px;
            font-weight: 600;
            color: #303133;
            margin-bottom: 8px;
          }

          .analysis-content {
            font-size: 14px;
            line-height: 1.6;
            color: #606266;
            padding: 12px;
            background-color: #F8F8F8;
            border-radius: 6px;
          }
        }

        .note-container {
          margin-top: 20px;

          h5 {
            font-size: 16px;
            font-weight: 600;
            color: #303133;
            margin-bottom: 8px;
          }

          .note-input {
            margin-bottom: 12px;
          }
        }
      }
    }

    // 整卷结果区
    .total-result {
      width: 100%;
      margin-top: 20px;

      .result-card {
        border-radius: 12px;
        box-shadow: 0 2px 12px rgba(0, 0, 0, 0.05);

        .result-header {
          font-size: 18px;
          font-weight: 600;
          color: #303133;
        }

        .result-summary {
          display: flex;
          justify-content: space-around;
          padding: 20px 0;
          border-bottom: 1px solid #E5E7EB;

          .summary-item {
            text-align: center;
          }
        }

        .redo-btn {
          margin-top: 20px;
        }
      }
    }

    // 空状态
    .empty-content {
      margin-top: 50px;
      width: 100%;
      text-align: center;
    }

    // 加载中状态
    .skeleton-loading {
      width: 100%;
      margin-top: 20px;
    }
  }
}

// 解析弹窗样式
:deep(.el-dialog) {
  border-radius: 12px;

  .el-dialog__header {
    border-bottom: 1px solid #E5E7EB;
    padding-bottom: 12px;

    .el-dialog__title {
      font-size: 18px;
      font-weight: 600;
      color: #303133;
    }
  }

  .el-dialog__body {
    padding: 20px;

    h4 {
      font-size: 16px;
      font-weight: 600;
      color: #303133;
      margin-bottom: 12px;
    }

    .dialog-analysis {
      font-size: 14px;
      line-height: 1.6;
      color: #606266;
      padding: 12px;
      background-color: #F8F8F8;
      border-radius: 6px;
    }
  }

  .el-dialog__footer {
    border-top: 1px solid #E5E7EB;
    padding-top: 12px;
  }
}
</style>