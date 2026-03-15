// 引入Axios
import axios from 'axios'

// 创建Axios实例，配置基础路径
const request = axios.create({
  baseURL: 'http://localhost:8088/gangwei', // 后端项目的根路径
  timeout: 10000, // 请求超时时间
  headers: {
    'Content-Type': 'application/json;charset=utf-8'
  }
})

// 刷题模块接口封装
export const questionApi = {
  // 1. 根据题型查询题目列表
  getQuestionList: (subjectType) => {
    return request.get('/question/list', {
      params: { subjectType } // 传递题型参数
    })
  },

  // 2. 随机获取指定数量的题目
  getRandomQuestions: (subjectType, count = 10) => {
    return request.get('/question/random', {
      params: { subjectType, count }
    })
  },

  // 3. 根据ID查询题目详情
  getQuestionDetail: (id) => {
    return request.get('/question/detail', {
      params: { id }
    })
  }
}