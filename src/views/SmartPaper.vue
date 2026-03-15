<template>
  <div class="module-page">
    <el-page-header content="模考组卷模块" @back="$router.push('/')" />

    <!-- 1. 题型题量 -->
    <el-card shadow="never" style="margin-top: 20px">
      <template #header>题型题量设置</template>
      <el-form :model="form" label-width="120px" inline>
        <el-form-item v-for="s in subjects" :key="s.key" :label="s.label">
          <el-input-number v-model="form[s.key]" :min="0" :max="50" :step="5" />
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 2. 时长 -->
    <el-card shadow="never" style="margin-top: 20px">
      <template #header>考试时长</template>
      <el-form label-width="120px">
        <el-form-item label="总时长(分钟)">
          <el-input-number v-model="form.totalMinutes" :min="1" :max="180" />
          <span class="tips">留空则按 1题=1分钟 自动计算</span>
        </el-form-item>
      </el-form>
    </el-card>

    <!-- 3. 操作 -->
    <div style="margin-top: 20px; text-align: center">
      <el-button type="primary" size="large" :loading="loading" @click="createPaper">
        <el-icon><Edit /></el-icon> 生成试卷
      </el-button>
    </div>

    <!-- 4. 生成结果 -->
    <el-card v-if="paper.questions.length" shadow="never" style="margin-top: 20px">
      <template #header>试卷预览</template>
      <el-descriptions :column="5" border>
        <el-descriptions-item v-for="s in subjects" :key="s.key" :label="s.label">
          {{ counts[s.key] }} 题
        </el-descriptions-item>
      </el-descriptions>
      <div style="margin-top: 16px; text-align: center">
        <el-button type="success" size="large" @click="startExam">
          <el-icon><VideoPlay /></el-icon> 开始考试
        </el-button>
      </div>
    </el-card>
  </div>
</template>

<script setup>
import { ref, reactive, computed } from 'vue'
import { ElMessage, ElMessageBox } from 'element-plus'
import { Edit, VideoPlay } from '@element-plus/icons-vue'
import { smartPaperApi } from '@/api/recordApi'
import { useRouter } from 'vue-router'

const router = useRouter()

/* ---------- 表单 ---------- */
const subjects = [
  { key: 'commonNum',   label: '常识判断' },
  { key: 'languageNum', label: '言语理解' },
  { key: 'mathNum',     label: '数量关系' },
  { key: 'logicNum',    label: '判断推理' },
  { key: 'dataNum',     label: '资料分析' }
]
const form = reactive({
  commonNum:   5,
  languageNum: 5,
  mathNum:     5,
  logicNum:    5,
  dataNum:     5,
  totalMinutes: null
})

/* ---------- 试卷数据 ---------- */
const loading = ref(false)
const paper = reactive({ questions: [], totalNum: 0, totalMinutes: 0 })

const counts = computed(() => {
  const o = {}
  subjects.forEach(s => (o[s.key] = form[s.key]))
  return o
})

/* ---------- 生成试卷 ---------- */
const createPaper = async () => {
  const total = Object.values(counts.value).reduce((a, b) => a + b, 0)
  if (total === 0) return ElMessage.warning('请至少选择 1 题')
  loading.value = true
  try {
    const res = await smartPaperApi.create({
      ...form,
      totalMinutes: form.totalMinutes || total
    })
    paper.questions = res.data.questions
    paper.totalNum = res.data.totalNum
    paper.totalMinutes = res.data.totalMinutes
    ElMessage.success(`成功生成 ${paper.totalNum} 题，时长 ${paper.totalMinutes} 分钟`)
  } catch (e) {
    ElMessage.error('生成失败：' + e.message)
  } finally {
    loading.value = false
  }
}

/* ---------- 开始考试 ---------- */
const startExam = () => {
  if (!paper.questions.length) return
  // 把题目列表存到全局状态（pinia / sessionStorage）
  sessionStorage.setItem('smartPaper', JSON.stringify(paper))
  router.push({ name: 'SmartExam', params: { id: 0 } })  // id=0 表示新考试
}
</script>

<style scoped>
.module-page {
  padding: 20px;
  background: #fff;
  border-radius: 8px;
  min-height: 500px;
}
.tips {
  margin-left: 8px;
  color: #999;
  font-size: 12px;
}
</style>