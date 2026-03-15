<template>
  <div class="register-container">
    <div class="register-card">
      <div class="register-header">
        <h2>公务员备考系统</h2>
        <p>账号注册</p>
      </div>
      <div class="form-item">
        <label>用户名</label>
        <input 
          type="text" 
          placeholder="请输入用户名（3-20位）" 
          v-model="registerForm.username"
          class="input-box"
          @blur="checkUsernameExist"
          @keyup.enter="handleRegister"
        >
        <span v-if="usernameTip" class="tip-text" :style="{color: usernameTipType === 'error' ? 'red' : 'green'}">
          {{ usernameTip }}
        </span>
      </div>
      <div class="form-item">
        <label>密码</label>
        <input 
          type="password" 
          placeholder="请输入密码（6-16位）" 
          v-model="registerForm.password"
          class="input-box"
          @keyup.enter="handleRegister"
        >
      </div>
      <div class="form-item">
        <label>确认密码</label>
        <input 
          type="password" 
          placeholder="请再次输入密码" 
          v-model="registerForm.confirmPassword"
          class="input-box"
          @keyup.enter="handleRegister"
        >
      </div>
      <button class="register-btn" @click="handleRegister" :disabled="loading">
        <span v-if="loading">注册中...</span>
        <span v-else>注册</span>
      </button>
      <p class="login-link" @click="$router.push('/login')">
        已有账号？立即登录
      </p>
    </div>
  </div>
</template>

<script setup>
import { reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import { register, checkUsername } from '../api/userApi';

// 路由实例
const router = useRouter();
// 注册表单
const registerForm = reactive({
  username: '',
  password: '',
  confirmPassword: ''
});
// 加载状态
const loading = ref(false);
// 用户名提示
const usernameTip = ref('');
const usernameTipType = ref(''); // error / success

/**
 * 检查用户名是否存在（对接后端接口）
 */
const checkUsernameExist = async () => {
  const username = registerForm.username.trim();
  if (!username) {
    usernameTip.value = '';
    return;
  }
  if (username.length < 3 || username.length > 20) {
    usernameTip.value = '用户名长度需在3-20位之间';
    usernameTipType.value = 'error';
    return;
  }

  try {
    const res = await checkUsername(username);
    if (res.code === 200) {
      if (res.data) { // 用户名已存在
        usernameTip.value = '用户名已被占用';
        usernameTipType.value = 'error';
      } else { // 用户名可用
        usernameTip.value = '用户名可用';
        usernameTipType.value = 'success';
      }
    }
  } catch (error) {
    usernameTip.value = '检查用户名失败，请重试';
    usernameTipType.value = 'error';
  }
};

/**
 * 注册处理（对接后端接口）
 */
const handleRegister = async () => {
  // 1. 基础校验（你原有）
  const username = registerForm.username.trim()
  const password = registerForm.password.trim()
  const confirmPwd = registerForm.confirmPassword.trim()
  if (!username || username.length < 3 || username.length > 20) {
    alert('用户名长度需在3-20位之间'); return
  }
  if (!password || password.length < 6 || password.length > 16) {
    alert('密码长度需在6-16位之间'); return
  }
  if (password !== confirmPwd) {
    alert('两次密码不一致'); return
  }

  // 2. 生成唯一 userId（前端现场生成）
  const userId = `user_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`

  // 3. 调用后端（把 userId 带上）
  try {
    const res = await register({
      username,
      password,
      userId          // ← 新增字段
    })
    if (res.code === 200) {
      // 4. 成功：存本地 & 跳转
      localStorage.setItem('userId', userId)   // ← 关键
      localStorage.setItem('userInfo', JSON.stringify(res.data))
      alert('注册成功！')
      router.push('/login')
    } else {
      alert(res.msg || '注册失败')
    }
  } catch (e) {
    alert(e?.msg || '网络异常')
  }
}
</script>

<style scoped>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

.register-container {
  width: 100%;
  min-height: 100vh;
  background: linear-gradient(135deg, #165DFF 0%, #0F4CD8 100%);
  display: flex;
  align-items: center;
  justify-content: center;
  padding: 20px;
}

.register-card {
  width: 100%;
  max-width: 420px;
  background: #fff;
  border-radius: 12px;
  padding: 40px 30px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.1);
}

.register-header {
  text-align: center;
  margin-bottom: 30px;
}

.register-header h2 {
  color: #165DFF;
  font-size: 24px;
  font-weight: 700;
  margin-bottom: 8px;
}

.register-header p {
  color: #666;
  font-size: 14px;
}

.form-item {
  margin-bottom: 20px;
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

.input-box:focus {
  border-color: #165DFF;
}

.tip-text {
  display: block;
  font-size: 12px;
  margin-top: 5px;
}

.register-btn {
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

.register-btn:disabled {
  background: #999;
  cursor: not-allowed;
}

.register-btn:hover:not(:disabled) {
  background: #0F4CD8;
}

.login-link {
  text-align: center;
  display: block;
  color: #165DFF;
  font-size: 14px;
  cursor: pointer;
}

.login-link:hover {
  color: #0F4CD8;
  text-decoration: underline;
}

@media (max-width: 480px) {
  .register-card {
    padding: 30px 20px;
  }
}
</style>