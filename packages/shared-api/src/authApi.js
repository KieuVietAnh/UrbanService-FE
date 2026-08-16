import { axiosClient } from './axiosClient.js';

export const authApi = {
  login(email, password) {
    return axiosClient.post('/api/auth/login', {
      email,
      password,
    });
  },

  register(fullName, email, password, phone) {
    return axiosClient.post('/api/auth/register', {
      fullname: fullName,
      email,
      password,
      phone,
    });
  },

  googleLogin(idToken) {
    return axiosClient.post('/api/auth/google-login', { idToken });
  },

  refreshToken(refreshToken) {
    return axiosClient.post('/api/auth/refresh-token', { refreshToken });
  },

  sendForgotPasswordOtp(email) {
    return axiosClient.post('/api/auth/forgot-password/send-otp', { email });
  },

  resetForgottenPassword(email, otp, newPassword) {
    return axiosClient.post('/api/auth/forgot-password/reset', {
      email,
      otp,
      newPassword,
    });
  },

  sendOtp() {
    return axiosClient.post('/api/auth/email-verification/send-otp');
  },

  verifyOtp(otp) {
    return axiosClient.post('/api/auth/email-verification/verify', { otp });
  },

  logout() {
    // Backend does not provide a logout endpoint, so just resolve here.
    return Promise.resolve({ success: true });
  },
};
