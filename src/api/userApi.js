import request from '../utils/request';

/**
 * 用户登录
 * @param {Object} user - {username, password}
 * @returns {Promise}
 */
export const login = (user) => {
  return request.post('/user/login', user);
};

/**
 * 用户注册
 * @param {Object} user - {username, password}
 * @returns {Promise}
 */
export const register = (user) => {
  return request.post('/user/register', user);
};

/**
 * 检查用户名是否存在
 * @param {String} username - 用户名
 * @returns {Promise}
 */
export const checkUsername = (username) => {
  return request.get(`/user/checkUsername/${username}`);
};