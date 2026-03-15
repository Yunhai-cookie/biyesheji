import axios from 'axios';

// 创建axios实例，对接后端8088端口（包含上下文路径/gangwei）
const request = axios.create({
  baseURL: 'http://localhost:8088/gangwei', // 关键修复：添加/gangwei
  timeout: 5000,
  headers: {
    'Content-Type': 'application/json;charset=utf-8'
  },
  withCredentials: true // 允许跨域携带Cookie
});

// 请求拦截器
request.interceptors.request.use(
  (config) => {
    return config;
  },
  (error) => {
    console.error('请求异常：', error);
    return Promise.reject(error);
  }
);

// 响应拦截器
request.interceptors.response.use(
  (response) => {
    const res = response.data;
    return res;
  },
  (error) => {
    console.error('响应异常：', error);
    return Promise.reject({
      code: 500,
      msg: '网络异常，请检查后端服务是否启动（端口8088）'
    });
  }
);

export default request;