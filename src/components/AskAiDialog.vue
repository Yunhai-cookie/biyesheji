<template>
  <el-dialog title="AI问答" v-model="visible" width="600px">
    <el-form :model="form" label-width="80px">
      <el-form-item label="问题">
        <el-input v-model="form.question" type="textarea" rows="3" placeholder="请输入要解析的公务员考试题目"></el-input>
      </el-form-item>
      <el-form-item label="选项">
        <el-input v-model="form.options" type="textarea" rows="2" placeholder="请输入题目选项（可选）"></el-input>
      </el-form-item>
    </el-form>

    <!-- AI回答展示 -->
    <div v-if="aiAnswer" class="ai-answer">
      <h4>AI解析结果：</h4>
      <div v-html="formatAnswer(aiAnswer)"></div>
    </div>

    <!-- Element Plus 兼容的 footer slot 写法 -->
    <template #footer>
      <div class="dialog-footer">
        <el-button @click="visible = false">取消</el-button>
        <el-button type="primary" @click="submitAsk" :loading="loading">问问AI</el-button>
      </div>
    </template>
  </el-dialog>
</template>

<script>
// 导入AI接口
import { aiApi } from '@/api/recordApi' 
import { ElMessage } from 'element-plus'

export default {
  name: 'AskAiDialog',
  // 核心修复1：声明props接收父组件传递的题目和选项
  props: {
    // 父组件传递的题目
    question: {
      type: String,
      default: ''
    },
    // 父组件传递的选项
    options: {
      type: String,
      default: ''
    }
  },
  data() {
    return {
      visible: false,
      loading: false,
      form: {
        question: '',
        options: ''
      },
      aiAnswer: ''
    }
  },
  // 核心修复2：监听props变化，同步到form中
  watch: {
    // 监听父组件传递的question，同步到form
    question: {
      immediate: true, // 初始化时立即同步
      handler(newVal) {
        this.form.question = newVal
      }
    },
    // 监听父组件传递的options，同步到form
    options: {
      immediate: true,
      handler(newVal) {
        this.form.options = newVal
      }
    }
  },
  methods: {
    // 核心修复3：修改open方法，仅打开弹窗，不清空form（保留父组件传递的参数）
    open() {
      this.visible = true
      this.aiAnswer = '' // 仅清空上次解析结果，不清空题目/选项
      this.loading = false
    },
    async submitAsk() {
      // 前端参数校验
      if (!this.form.question.trim()) {
        ElMessage.warning('请输入问题内容')
        return
      }

      this.loading = true
      this.aiAnswer = ''
      try {
        // 调用AI接口，传递form中的参数
        const res = await aiApi.ask({
          question: this.form.question,
          options: this.form.options
        })
        this.aiAnswer = res.data
        ElMessage.success('AI解析成功')
      } catch (error) {
        console.error('【AI调用错误详情】', error)
        if (!error.message) {
          ElMessage.error('AI调用失败，请重试')
        }
      } finally {
        this.loading = false
      }
    },
    // 格式化回答（换行转br）
    formatAnswer(answer) {
      return answer ? answer.replace(/\n/g, '<br>').replace(/\t/g, '&nbsp;&nbsp;&nbsp;&nbsp;') : ''
    }
  }
}
</script>

<style scoped>
.ai-answer {
  margin-top: 20px;
  padding: 10px;
  background: #f5f5f5;
  border-radius: 4px;
  line-height: 1.6;
}
.dialog-footer {
  text-align: right;
}
</style>