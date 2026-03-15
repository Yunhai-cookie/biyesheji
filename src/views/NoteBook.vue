<template>
  <div class="note-book-page">
    <div class="page-inner">
      <!-- 1. 页面头部 -->
      <el-page-header content="笔记本" @back="$router.push('/')" class="page-header">
        <template #extra>
          <el-button type="primary" @click="exportNotes" style="margin-right: 8px;">
            <el-icon><UploadFilled /></el-icon>
            导出笔记
          </el-button>
          <el-button type="text" @click="$router.push('/')">
            <el-icon><HomeFilled /></el-icon>
            返回首页
          </el-button>
        </template>
      </el-page-header>

      <!-- 2. 题型选择区 -->
      <div class="module-content">
        <div class="subject-selector" v-if="!isDetail">
          <h3 class="selector-title">请选择题型</h3>
          <div class="subject-btn-group">
            <el-button
              v-for="subject in subjectList"
              :key="subject"
              :class="['subject-btn', { active: currentSubject === subject }]"
              @click="currentSubject = subject"
              :disabled="noteList[subject].length === 0"
            >
              {{ subject }}
              <el-badge :value="noteList[subject].length" class="item-badge" />
            </el-button>
          </div>
        </div>

        <!-- 3. 笔记列表 -->
        <div v-loading="loading" v-if="!isDetail">
          <el-table
            :data="noteList[currentSubject]"
            stripe
            border
            size="small"
            style="width: 100%; margin-top: 20px"
            max-height="600"
          >
            <el-table-column prop="questionId" label="题号" align="center" width="80" />
            <el-table-column prop="title" label="题目" show-overflow-tooltip min-width="220" />
            <el-table-column prop="noteContent" label="我的笔记" show-overflow-tooltip min-width="200" />
            <el-table-column prop="updateTime" label="更新时间" align="center" width="160" />
            <el-table-column label="操作" align="center" width="120" fixed="right">
              <template #default="scope">
                <el-button type="primary" link @click="viewDetail(scope.row)">查看</el-button>
              </template>
            </el-table-column>
          </el-table>
        </div>

        <!-- 4. 题目详情弹窗（只读） -->
        <el-dialog
          v-model="detailVisible"
          :title="`题目详情 - ID ${current.note?.questionId}`"
          width="700px"
          top="5vh"
          :close-on-click-modal="false"
        >
          <div v-if="current.note">
            <!-- 题目信息 -->
            <el-descriptions :column="2" border size="small">
              <el-descriptions-item label="题型">{{ current.subject }}</el-descriptions-item>
              <el-descriptions-item label="难度">{{ current.question?.difficulty || '-' }}</el-descriptions-item>
              <el-descriptions-item label="正确答案">{{ current.question?.correctAnswer || '-' }}</el-descriptions-item>
              <el-descriptions-item label="全站正确率">{{ current.question?.fullCorrectRate || '-' }}%</el-descriptions-item>
              <el-descriptions-item label="考点" :span="2">{{ current.question?.knowledgePoint || '-' }}</el-descriptions-item>
            </el-descriptions>

            <!-- 题目内容 -->
            <div style="margin-top:16px;font-weight:600;">题目内容：</div>
            <div style="line-height:1.8;">{{ current.question?.title }}</div>

            <!-- 选项 -->
            <div style="margin-top:12px;font-weight:600;">选项：</div>
            <div v-for="(opt, key) in getOptions(current.question)" :key="key" style="line-height:1.8;">
              <span style="font-weight:600;">{{ key }}：</span>{{ opt }}
            </div>

            <!-- 解析 -->
            <div style="margin-top:12px;font-weight:600;">解析：</div>
            <div style="line-height:1.8;">{{ current.question?.analysis || '暂无解析' }}</div>

            <!-- 我的笔记 -->
            <div style="margin-top:16px;font-weight:600;">我的笔记：</div>
            <el-input
              v-model="current.note.noteContent"
              type="textarea"
              :rows="4"
              readonly
              style="margin-top:6px;"
            />
          </div>
        </el-dialog>

        <!-- 5. 空状态 -->
        <el-empty
          v-if="!isDetail && noteList[currentSubject].length === 0"
          image-size="150"
          description="当前题型暂无笔记，继续加油！"
          class="empty-content"
        >
          <el-button type="primary" size="large" @click="$router.push('/exam-practice')">
            去刷题
          </el-button>
        </el-empty>
      </div>
    </div>
  </div>
</template>

<script setup>
import { ref, reactive, onMounted } from 'vue'
import { ElMessage } from 'element-plus'
import { HomeFilled, UploadFilled } from '@element-plus/icons-vue'
import { noteApi } from '@/api/recordApi'
import { questionApi } from '@/api/questionApi'
import * as XLSX from 'xlsx'

/* ---------- 基础数据 ---------- */
const subjectList = ['常识判断', '言语理解', '数量关系', '判断推理', '资料分析']
const currentSubject = ref('常识判断')
const loading = ref(false)
const detailVisible = ref(false)
const isDetail = ref(false) // 这里仅用于控制是否显示详情，无需复杂路由

/* ---------- 笔记列表 ---------- */
const noteList = reactive({
  '常识判断': [],
  '言语理解': [],
  '数量关系': [],
  '判断推理': [],
  '资料分析': []
})

/* 当前查看的题目 & 笔记 */
const current = reactive({
  subject: '',
  question: null,
  note: null
})

/* ---------- 工具 ---------- */
const getOptions = q => ({
  A: q?.optionA || '-',
  B: q?.optionB || '-',
  C: q?.optionC || '-',
  D: q?.optionD || '-'
})

/* ---------- 获取笔记 ---------- */
const loadNotes = async () => {
  loading.value = true
  try {
    // 1. 调后端：获取当前用户全部笔记（userId 在请求头）
    const { data } = await noteApi.getAllNotes()
    const raw = Array.isArray(data) ? data : []

    // 2. 获取所有题目（用于回显标题、选项等）
    const { data: allQuestions } = await questionApi.getQuestionList()
    const qMap = new Map((allQuestions || []).map(q => [Number(q.id), q]))

    // 3. 清空旧数据
    subjectList.forEach(s => (noteList[s] = []))

    // 4. 归类
    raw.forEach(item => {
      const q = qMap.get(Number(item.questionId))
      if (!q) return
      const subject = item.subject || '常识判断'  
      if (!subjectList.includes(subject)) return
      noteList[subject].push({
        questionId: item.questionId,
        title: q.title,
        noteContent: item.noteContent,
        updateTime: item.updateTime || item.createTime,
        question: q,
        note: item
      })
    })

    ElMessage.success(`共找到 ${raw.length} 条笔记`)
  } catch (e) {
    console.error(e)
    ElMessage.error('加载笔记失败')
  } finally {
    loading.value = false
  }
}

/* 映射任意 subject 到 5 大模块 */
const mapSubject = raw => {
  const t = (raw || '').toString().trim()
  if (t.includes('常识')) return '常识判断'
  if (t.includes('言语')) return '言语理解'
  if (t.includes('数量')) return '数量关系'
  if (t.includes('判断') || t.includes('推理')) return '判断推理'
  if (t.includes('资料')) return '资料分析'
  return '常识判断'
}

/* ---------- 查看详情 ---------- */
const viewDetail = row => {
  current.subject = mapSubject(row.question?.subject || row.question?.knowledgePoint || '')
  current.question = row.question
  current.note = row.note
  detailVisible.value = true
}

/* ---------- 导出笔记 ---------- */
const exportNotes = () => {
  const list = noteList[currentSubject.value]
  if (!list.length) return ElMessage.warning('暂无笔记可导出')
  const head = ['题号', '题型', '题目', '笔记内容', '更新时间']
  const body = list.map(r => [
    r.questionId,
    mapSubject(r.question?.subject || ''),
    r.title,
    r.noteContent,
    r.updateTime
  ])
  const sheet = XLSX.utils.aoa_to_sheet([head, ...body])
  const book = XLSX.utils.book_new()
  XLSX.utils.book_append_sheet(book, sheet, `${currentSubject.value}_笔记`)
  XLSX.writeFile(book, `${currentSubject.value}_笔记_${new Date().toLocaleDateString().replace(/\//g, '-')}.xlsx`)
  ElMessage.success('导出成功')
}

/* ---------- 生命周期 ---------- */
onMounted(() => {
  loadNotes()
})
</script>

<style scoped>
/* 直接复用错题本样式，保持统一 */
@import '@/styles/wrong-book.css';

</style>