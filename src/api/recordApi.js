// src/api/recordApi.js（修复用户ID传递 + AI接口适配 + 类型校验最终版）
import axios from 'axios'
import { ElMessage } from 'element-plus'

// ========== 核心修复1：初始化用户ID（与前端逻辑保持一致） ==========
const initUserId = () => {
  let userId = localStorage.getItem('userId')
  if (!userId) {
    // 生成与前端一致的用户ID规则
    const timestamp = new Date().getTime()
    const random = Math.floor(Math.random() * 10000)
    userId = `user_${timestamp}_${random}`
    localStorage.setItem('userId', userId)
    ElMessage.success(`已初始化新账号，用户ID：${userId}`)
  }
  return userId
}

// 创建基础请求实例（通用接口，保持原有10秒超时）
const request = axios.create({
  baseURL: 'http://localhost:8088/gangwei',
  timeout: 10000,
  headers: { 'Content-Type': 'application/json;charset=utf-8' }
})

// ========== 单独创建AI接口请求实例（延长超时到70秒） ==========
const aiRequest = axios.create({
  baseURL: 'http://localhost:8088/gangwei',
  timeout: 70000, // AI接口超时70秒（大于后端60秒+重试）
  headers: { 'Content-Type': 'application/json;charset=utf-8' }
})

// ========== 核心修复2：强制传递正确的用户ID到请求头（通用+AI实例都加） ==========
// 通用请求拦截器（原有逻辑不变）
request.interceptors.request.use(
  (config) => {
    // 确保用户ID存在（不存在则自动初始化）
    const userId = initUserId()
    // 强制写入请求头（与后端约定的 X-User-Id 一致）
    config.headers['X-User-Id'] = userId
    console.log('【请求头携带用户ID】', userId) // 调试：确认传递的ID正确

    // ========== 参数类型校验（保留原有逻辑，优化布尔值处理） ==========
    if (config.method === 'post' || config.method === 'put') {
      if (config.data) {
        const newData = JSON.parse(JSON.stringify(config.data))
        const convertObj = (obj) => {
          Object.keys(obj).forEach(key => {
            // 数字字段强制转数字
            const numberKeys = ['questionId', 'timerSeconds', 'current', 'size', 'id', 'userId', 'subjectId', 'lastQuestionId']
            if (numberKeys.includes(key)) {
              obj[key] = Number(obj[key]) || 0
            }
            // 布尔值字段：后端接收 1/0，前端布尔值自动转换
            const booleanKeys = ['isCorrect']
            if (booleanKeys.includes(key)) {
              obj[key] = obj[key] ? 1 : 0 // 核心：布尔值转 1/0，适配后端Integer类型
            } else if (obj[key] === true || obj[key] === false) {
              delete obj[key] // 非预期布尔字段直接删除
            }
            // 递归处理嵌套对象
            if (typeof obj[key] === 'object' && obj[key] !== null) {
              convertObj(obj[key])
            }
          })
        }
        convertObj(newData)
        config.data = newData
      }
    }

    return config
  },
  (error) => {
    ElMessage.error('请求拦截异常：' + error.message)
    return Promise.reject(error)
  }
)

// AI请求实例的拦截器（仅新增用户ID传递，复用参数校验逻辑）
aiRequest.interceptors.request.use(
  (config) => {
    const userId = initUserId()
    config.headers['X-User-Id'] = userId
    console.log('【AI请求头携带用户ID】', userId)

    // 复用原有参数校验逻辑
    if (config.method === 'post' || config.method === 'put') {
      if (config.data) {
        const newData = JSON.parse(JSON.stringify(config.data))
        const convertObj = (obj) => {
          Object.keys(obj).forEach(key => {
            const numberKeys = ['questionId', 'timerSeconds', 'current', 'size', 'id', 'userId', 'subjectId', 'lastQuestionId']
            if (numberKeys.includes(key)) {
              obj[key] = Number(obj[key]) || 0
            }
            const booleanKeys = ['isCorrect']
            if (booleanKeys.includes(key)) {
              obj[key] = obj[key] ? 1 : 0
            } else if (obj[key] === true || obj[key] === false) {
              delete obj[key]
            }
            if (typeof obj[key] === 'object' && obj[key] !== null) {
              convertObj(obj[key])
            }
          })
        }
        convertObj(newData)
        config.data = newData
      }
    }

    return config
  },
  (error) => {
    ElMessage.error('AI请求拦截异常：' + error.message)
    return Promise.reject(error)
  }
)

// 通用响应拦截器（原有逻辑不变）
request.interceptors.response.use(
  (response) => {
    const res = response.data
    // 特殊处理笔记查询404
    if (response.config.url.includes('/api/note/get') && (res.code === 404 || res.data === null)) {
      return { code: 200, msg: '暂无笔记', data: null }
    }
    // 统一处理非200状态码
    if (res.code !== 200) {
      ElMessage.error(res.msg || '请求失败')
      return Promise.reject(res)
    }
    return res
  },
  (error) => {
    console.error('接口异常：', error)
    if (error.response) {
      const status = error.response.status
      if (status === 400) {
        ElMessage.error('参数错误：数据类型不匹配，请检查！')
      } else if (status === 401) {
        ElMessage.error('未授权：用户登录状态失效！')
        // 清除无效用户ID，重新初始化
        localStorage.removeItem('userId')
        initUserId()
      } else if (status === 404) {
        ElMessage.warning('请求的接口不存在，请检查后端接口地址！')
      } else if (status === 500) {
        ElMessage.error('服务器内部错误，请联系管理员！')
      } else {
        ElMessage.error(`请求失败：${status} - ${error.response.statusText}`)
      }
    } else if (error.request) {
      ElMessage.error('网络异常：无法连接到服务器，请检查网络！')
    } else {
      ElMessage.error('请求错误：' + error.message)
    }
    return Promise.reject(error)
  }
)

// ========== AI接口专用响应拦截器（优化错误提示，区分AI特有错误） ==========
aiRequest.interceptors.response.use(
  (response) => {
    const res = response.data
    // 统一处理非200状态码（AI接口专属提示）
    if (res.code !== 200) {
      // 区分AI接口的具体错误类型
      let errorMsg = res.msg || 'AI请求失败'
      if (errorMsg.includes('超时')) {
        errorMsg = 'AI思考时间较长，请点击「问问AI」重试'
      } else if (errorMsg.includes('认证失败')) {
        errorMsg = 'AI接口密钥错误，请联系管理员'
      } else if (errorMsg.includes('网络异常')) {
        errorMsg = '服务器无法访问AI接口，请检查网络'
      }
      ElMessage.error(errorMsg)
      return Promise.reject({ type: 'business', message: errorMsg, data: res })
    }
    return res
  },
  (error) => {
    console.error('AI接口异常：', error)
    let errorMsg = 'AI调用失败'
    // 区分不同错误类型
    if (error.code === 'ECONNABORTED') {
      errorMsg = 'AI请求超时：服务器处理时间过长，请重试'
    } else if (error.response) {
      const status = error.response.status
      if (status === 400) {
        errorMsg = 'AI参数错误：题目/选项格式不正确'
      } else if (status === 404) {
        errorMsg = 'AI接口不存在：请检查后端AI接口地址'
      } else if (status === 500) {
        errorMsg = 'AI服务器错误：' + (error.response.data?.msg || '后端调用Ark API失败')
      } else {
        errorMsg = `AI请求失败：${status} - ${error.response.statusText}`
      }
    } else if (error.request) {
      errorMsg = '网络异常：无法连接到服务器，请检查网络！'
    } else {
      errorMsg = 'AI请求配置错误：' + error.message
    }
    ElMessage.error(errorMsg)
    // 返回结构化错误，方便前端区分
    return Promise.reject({ 
      type: error.code === 'ECONNABORTED' ? 'timeout' : (error.response ? 'server' : 'network'),
      message: errorMsg,
      originalError: error
    })
  }
)

/* 智能组卷 */
export const smartPaperApi = {
  create: data => request.post('/api/smart-paper/create', data)
}

/* 考试 */
export const examApi = {
  submit: data => request.post('/api/exam/submit', data),
  recordPage: (current, size) => request.get('/api/exam/record/page', { params: { current, size } }),
  detail: examId => request.get(`/api/exam/detail/${examId}`)
}

// ========== 接口封装（优化参数传递，确保用户ID一致） ==========
export const recordApi = {
  saveAnswerRecord: (record) => {
    const validRecord = {
      questionId: Number(record.questionId) || 0,
      userAnswer: String(record.userAnswer || ''),
      correctAnswer: String(record.correctAnswer || ''),
      answerMode: String(record.answerMode || ''),
      timerSeconds: Number(record.timerSeconds) || 0,
      isCorrect: record.isCorrect ? 1 : 0 // 明确转 1/0，避免布尔值
    }
    console.log('【保存答题记录】用户ID=', localStorage.getItem('userId'), '参数=', validRecord)
    return request.post('/api/answer/save', validRecord)
  },
  updateAnswerRecord: (record) => {
    const payload = {
      questionId: Number(record.questionId) || 0,
      isCorrect: 1 // 答对固定传1
    }
    return request.post('/api/answer/update', payload)
  },
  getAnswerPage: (current, size) => request.get('/api/answer/page', { 
    params: { 
      current: Number(current) || 1, 
      size: Number(size) || 10 
    } 
  }),
  // 错题查询：自动携带当前用户ID请求头，无需传参
  getWrongQuestions: () => {
    console.log('【查询错题本】用户ID=', localStorage.getItem('userId'))
    return request.get('/api/answer/wrong')
  },
  getCorrectRate: () => request.get('/api/answer/subject-rate'),
  getExamStats: () => request.get('/api/answer/stats'),
  // 背题进度：修复参数类型
  getBackProgress: (subject) => request.get('/api/answer/back-progress', { 
    params: { subject: String(subject || '') } 
  }),
  saveBackProgress: (data) => {
    const validData = {
      subject: String(data.subject || ''),
      lastQuestionId: Number(data.lastQuestionId) || 0,
      doneList: Array.isArray(data.doneList) ? data.doneList.map(id => Number(id) || 0) : []
    }
    return request.post('/api/answer/back-progress', validData)
  }
}

export const noteApi = {
  saveNote: (params) => {
    const validParams = {
      questionId: Number(params.questionId) || 0,
      noteContent: String(params.noteContent || '')
    }
    return request.post('/api/note/save', validParams)
  },
  getNote: (questionId) => request.get('/api/note/get', { 
    params: { questionId: Number(questionId) || 0 } 
  }),
  getAllNotes: () => request.get('/api/note/list')
}

// ========== AI接口封装（适配后端/api/ai/ask，使用专用超时实例） ==========
export const aiApi = {
  // AI问答接口：适配后端参数格式，使用70秒超时的aiRequest实例
  ask: (data) => {
    // 参数校验与格式化
    const validData = {
      question: String(data.question || ''),
      options: String(data.options || '')
    }
    console.log('【AI问答请求】用户ID=', localStorage.getItem('userId'), '参数=', validData)
    // 核心修改：使用aiRequest（70秒超时）而非request（10秒超时）
    return aiRequest.post('/api/ai/ask', validData)
  }
}