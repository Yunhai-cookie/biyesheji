<template>
  <div class="module-page">
    <el-page-header content="考试记录" @back="$router.push('/')" />

    <el-table :data="records" stripe style="width: 100%; margin-top: 20px">
      <el-table-column prop="createTime" label="考试时间" width="180" />
      <el-table-column prop="paperName" label="试卷名称" />
      <el-table-column prop="totalNum" label="题量" width="80" />
      <el-table-column prop="totalScore" label="得分" width="80" />
      <el-table-column prop="totalSeconds" label="耗时" width="100" :formatter="tableTimeFormatter" />
      <el-table-column label="操作" width="200">
        <template #default="scope">
          <el-button type="primary" link @click="viewDetail(scope.row)">查看解析</el-button>
          <el-button type="success" link @click="exportExam(scope.row)">导出</el-button>
        </template>
      </el-table-column>
    </el-table>

    <el-pagination
      v-model:current-page="current"
      :total="total"
      :page-size="size"
      layout="prev, pager, next"
      @current-change="loadPage"
      style="margin-top: 20px; text-align: center"
    />

    <el-dialog
      v-model="detailVisible"
      :title="`考试解析 - ${currentExam.paperName}`"
      width="800px"
      top="5vh"
      :close-on-click-modal="false"
    >
      <el-collapse v-model="activeNames" accordion>
        <el-collapse-item
          v-for="(item, idx) in detailList"
          :key="item.id"
          :name="idx"
          :title="titleLine(item, idx)"
        >
          <el-descriptions :column="2" border size="small">
            <el-descriptions-item label="题型">{{ item.subjectType }}</el-descriptions-item>
            <el-descriptions-item label="难度">{{ difficultyText(item.difficulty) }}</el-descriptions-item>
            <el-descriptions-item label="正确答案">{{ item.correctAnswer }}</el-descriptions-item>
            <el-descriptions-item label="你的答案">
              <span :class="item.isCorrect === 1 ? 'right' : 'wrong'">{{ item.userAnswer || '未作答' }}</span>
            </el-descriptions-item>
            <el-descriptions-item label="耗时">{{ formatTime(item.timerSeconds) }}</el-descriptions-item>
            <el-descriptions-item label="结果">
              <el-tag :type="item.isCorrect === 1 ? 'success' : 'danger'">{{ item.isCorrect === 1 ? '正确' : '错误' }}</el-tag>
            </el-descriptions-item>
          </el-descriptions>
          
          <div class="options-box" v-if="item.optionA || item.optionB || item.optionC || item.optionD">
            <div class="label">选项：</div>
            <div class="option-item">A：{{ item.optionA || '-' }}</div>
            <div class="option-item">B：{{ item.optionB || '-' }}</div>
            <div class="option-item">C：{{ item.optionC || '-' }}</div>
            <div class="option-item">D：{{ item.optionD || '-' }}</div>
          </div>

          <div class="analysis-box">
            <div class="label">解析：</div>
            <div class="content">{{ item.analysis || '暂无解析' }}</div>
            <el-button type="primary" size="small" @click="askAi(item)" style="margin-top: 8px">
              <el-icon><ChatDotRound /></el-icon> 问问 AI
            </el-button>
          </div>

          <div class="knowledge-box">
            <div class="label">知识点：</div>
            <div class="content">{{ item.knowledgePoint || '暂无' }}</div>
          </div>

          <div class="note-box">
            <div class="label">我的笔记：</div>
            <el-input type="textarea" :rows="3" :value="item.myNote" readonly />
          </div>
        </el-collapse-item>
      </el-collapse>
    </el-dialog>

    <!-- 新增：AI弹窗组件（仅加这一段，其余全保留） -->
    <AskAiDialog 
      id="ai-dialog"
      ref="askAiDialog" 
      :question="aiQuestion" 
      :options="aiOptions" 
    />
  </div>
</template>

<script setup>
import { ref, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { examApi } from '@/api/recordApi'
import * as XLSX from 'xlsx'
import { useRoute } from 'vue-router'
// 修复：相对路径 → 绝对路径
import AskAiDialog from '@/components/AskAiDialog.vue'
import { ChatDotRound } from '@element-plus/icons-vue'

// AI 相关变量（原有逻辑保留）
const askAiDialog = ref()
const aiQuestion = ref('')
const aiOptions = ref('')

// AI 方法（原有逻辑保留）
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
    const dialogEl = document.getElementById('ai-dialog')
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

// 原有业务逻辑（完全保留，一行不改）
const route = useRoute()
const records = ref([])
const current = ref(1)
const total = ref(0)
const size = ref(10)
const detailVisible = ref(false)
const currentExam = ref({})
const detailList = ref([])
const activeNames = ref('0')

onMounted(async () => {
  await loadPage()
  const autoId = route.query.autoShow
  if (autoId) {
    const row = records.value.find(r => r.id == autoId)
    if (row) viewDetail(row)
  }
})

const loadPage = async () => {
  try {
    const res = await examApi.recordPage(current.value, size.value)
    records.value = res.data.records
    total.value = res.data.total
    if (records.value.length) {
      console.log('[记录] 第一条 totalSeconds:', records.value[0].totalSeconds)
    }
  } catch (e) {
    ElMessage.error('加载失败：' + e.message)
  }
}

const viewDetail = async row => {
  currentExam.value = row
  try {
    const res = await examApi.detail(row.id)
    console.log('【detail接口返回】', res.data)
    detailList.value = res.data
    detailVisible.value = true
  } catch (e) {
    ElMessage.error('加载详情失败：' + e.message)
  }
}

const exportExam = async (row) => {
  try {
    const res = await examApi.detail(row.id)
    const detailList = res.data || []
    
    if (detailList.length === 0) {
      ElMessage.warning('该考试无答题记录，无法导出')
      return
    }

    const head = [
      '题号', '题型', '题目', '正确答案', '你的答案', 
      '结果', '耗时', '难度', '解析'
    ]
    const body = detailList.map((item, index) => [
      index + 1,
      item.subjectType || '未知题型',
      item.title || '无题目内容',
      item.correctAnswer || '无',
      item.userAnswer || '未作答',
      item.isCorrect === 1 ? '正确' : '错误',
      formatTime(item.timerSeconds),
      difficultyText(item.difficulty),
      item.analysis || '暂无解析'
    ])

    const worksheet = XLSX.utils.aoa_to_sheet([head, ...body])
    const workbook = XLSX.utils.book_new()
    XLSX.utils.book_append_sheet(workbook, worksheet, `${row.paperName}_解析`)
    const fileName = `${row.paperName}_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`
    XLSX.writeFile(workbook, fileName)
    ElMessage.success('导出成功！')
  } catch (e) {
    console.error('导出失败：', e)
    ElMessage.error('导出失败，请重试')
  }
}

const titleLine = (item, idx) => {
  return `【${idx + 1}】${item.title?.substring(0, 30) || '无题目'}${item.title?.length > 30 ? '...' : ''}`
}

const formatTime = (seconds) => {
  const s = Number(seconds) || 0
  if (s <= 0) return '00:00'
  const m = String(Math.floor(s / 60)).padStart(2, '0')
  const sec = String(s % 60).padStart(2, '0')
  return `${m}:${sec}`
}

const tableTimeFormatter = (row) => {
  return formatTime(row.totalSeconds)
}

const difficultyText = d => {
  if (d === null || d === undefined || d === 0) return '-'
  switch (d) {
    case 1:
    case 2:
      return '简单'
    case 3:
    case 4:
      return '中等'
    case 5:
      return '较难'
    default:
      return '未知'
  }
}
</script>

<style scoped>
.module-page {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  min-height: 500px;
}
.analysis-box, .knowledge-box, .note-box, .options-box {
  margin-top: 16px;
}
.label {
  font-weight: bold;
  margin-bottom: 6px;
}
.content {
  line-height: 1.8;
  color: #666;
}
.option-item {
  line-height: 1.6;
  margin-bottom: 4px;
}
.right {
  color: #67c23a;
}
.wrong {
  color: #f56c6c;
}
</style>