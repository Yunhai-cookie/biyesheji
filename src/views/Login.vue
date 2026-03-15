<template>
  <div class="login-container">
    <div class="login-card">
      <div class="login-header">
        <h2>公务员备考系统</h2>
        <p>账号登录</p>
      </div>
      <div class="form-item">
        <label>用户名</label>
        <input 
          type="text" 
          placeholder="请输入用户名" 
          v-model="loginForm.username"
          class="input-box"
          @keyup.enter="handleLogin"
          :class="{ 'input-error': usernameError }"
        >
        <span class="error-tip" v-if="usernameError">{{ usernameError }}</span>
      </div>
      <div class="form-item">
        <label>密码</label>
        <input 
          type="password" 
          placeholder="请输入密码" 
          v-model="loginForm.password"
          class="input-box"
          @keyup.enter="handleLogin"
          :class="{ 'input-error': passwordError }"
        >
        <span class="error-tip" v-if="passwordError">{{ passwordError }}</span>
      </div>
      <button class="login-btn" @click="handleLogin" :disabled="loading">
        <span v-if="loading">登录中...</span>
        <span v-else>登录</span>
      </button>
      <p class="register-link" @click="$router.push('/register')">
        没有账号？立即注册
      </p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
// 替换alert为Element Plus消息提示（更友好）
import { ElMessage } from 'element-plus';
import { login } from '../api/userApi';

// 路由实例
const router = useRouter();

// 登录表单
const loginForm = reactive({
  username: '',
  password: ''
});

// 加载状态
const loading = ref(false);

// 表单错误提示（替代alert，更优雅）
const usernameError = ref('');
const passwordError = ref('');

/**
 * 表单校验（细化规则）
 */
const validateForm = () => {
  let isValid = true;
  // 用户名校验
  if (!loginForm.username.trim()) {
    usernameError.value = '请输入用户名';
    isValid = false;
  } else if (loginForm.username.trim().length < 3) {
    usernameError.value = '用户名长度不能少于3位';
    isValid = false;
  } else {
    usernameError.value = '';
  }

  // 密码校验
  if (!loginForm.password.trim()) {
    passwordError.value = '请输入密码';
    isValid = false;
  } else if (loginForm.password.trim().length < 6) {
    passwordError.value = '密码长度不能少于6位';
    isValid = false;
  } else {
    passwordError.value = '';
  }

  return isValid;
};

/**
 * 登录处理（对接后端接口，严格校验）
 */
const handleLogin = async () => {
  // 清空之前的错误提示
  usernameError.value = '';
  passwordError.value = '';

  // 前端表单校验
  if (!validateForm()) {
    return; // 校验失败，不提交
  }

  try {
    loading.value = true;
    // 调用后端登录接口
    const res = await login(loginForm);
    
    // 严格判断后端返回码（仅200为成功）
    if (res && res.code === 200) { 
      ElMessage.success('登录成功！即将跳转首页');
      // 存储用户信息到本地（脱敏后）
      const userInfo = { ...res.data };
      delete userInfo.password; // 确保密码不存储
      localStorage.setItem('userId', res.data.userId) 
      localStorage.setItem('userInfo', JSON.stringify(userInfo));
      // 延迟跳转，提升用户体验
      setTimeout(() => {
        router.push('/');
      }, 1000);
    } else { 
      // 后端返回失败（用户名/密码错误、用户禁用等）
      ElMessage.error(res?.msg || '登录失败，请检查账号密码');
    }
  } catch (error) {
    // 捕获网络异常/接口报错
    console.error('登录接口异常：', error);
    ElMessage.error(
      error?.response?.data?.msg || 
      error?.msg || 
      '登录失败，请检查网络或后端服务是否启动'
    );
  } finally {
    loading.value = false;
  }
};
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.login-container {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #165DFF 0%, #0F4CD8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.login-card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 12px;
  padding: 40px 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.login-header {
  text-align: center;
  margin-bottom: 30px;
}

.login-header h2 {
  color: #165DFF;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
}

.login-header p {
  color: #666;
  font-size: 14px;
}

.form-item {
  margin-bottom: 20px;
  position: relative;
}

.form-item label {
  display: block;
  margin-bottom: 8px;
  color: #333;
  font-size: 14px;
}

.input-box {
  width: 100%;
  padding: 12px 15px;
  border: 1px solid #e5e7eb;
  border-radius: 6px;
  font-size: 14px;
  outline: none;
  transition: border-color 0.3s;
}

/* 错误状态样式 */
.input-error {
  border-color: #ff4d4f !important;
}

.input-box:focus {
  border-color: #165DFF;
}

/* 错误提示文字 */
.error-tip {
  display: block;
  color: #ff4d4f;
  font-size: 12px;
  margin-top: 4px;
  line-height: 1.2;
}

.login-btn {
  width: 100%;
  padding: 12px;
  background: #165DFF;
  color: #fff;
  border: none;
  border-radius: 6px;
  font-size: 16px;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.3s;
  margin-bottom: 15px;
}

.login-btn:disabled {
  background: #999;
  cursor: not-allowed;
}

.login-btn:hover:not(:disabled) {
  background: #0F4CD8;
}

.register-link {
  text-align: center;
  display: block;
  color: #165DFF;
  font-size: 14px;
  cursor: pointer;
}

.register-link:hover {
  color: #0F4CD8;
  text-decoration: underline;
}

@media (max-width: 480px) {
  .login-card {
    padding: 30px 20px;
  }
}
</style>