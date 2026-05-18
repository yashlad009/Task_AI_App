import axios from 'axios';

// Set global timeout to 60s — Render free tier can take up to 50s to wake up
axios.defaults.timeout = 60000;

export const API_BASE_URL = 'https://task-ai-app.onrender.com';

export const ENDPOINTS = {
  // Auth
  sendOtp: `${API_BASE_URL}/auth/send-otp`,
  verifyAndRegister: `${API_BASE_URL}/auth/verify-and-register`,
  login: `${API_BASE_URL}/auth/login`,
  updateUser: `${API_BASE_URL}/auth/update`,
  getAllUsers: `${API_BASE_URL}/auth/users`,

  // Tasks
  addTask: `${API_BASE_URL}/tasks/add`,
  getTasksByUser: (userId: string) => `${API_BASE_URL}/tasks/user/${userId}`,
  completeTask: (id: string) => `${API_BASE_URL}/tasks/${id}/complete`,
  deleteTask: (id: string) => `${API_BASE_URL}/tasks/${id}`,
  getAllTasks: `${API_BASE_URL}/tasks/all`,

  // Milestones
  addMilestone: `${API_BASE_URL}/milestones/add`,
  getMilestonesByUser: (userId: string) => `${API_BASE_URL}/milestones/user/${userId}`,
  updateMilestoneProgress: (id: string) => `${API_BASE_URL}/milestones/${id}/update`,
  deleteMilestone: (id: string) => `${API_BASE_URL}/milestones/${id}`,

  // Important Tasks
  addImportantTask: `${API_BASE_URL}/api/important/add`,
  getImportantTasks: (userId: string) => `${API_BASE_URL}/api/important/user/${userId}`,

  // Analytics
  getAnalytics: (userId: string) => `${API_BASE_URL}/analytics/user/${userId}`,

  // AI Chat
  aiChat: (userId: string) => `${API_BASE_URL}/api/ai/chat/${userId}`,

  // Queries
  sendQuery: `${API_BASE_URL}/queries/send`,
  getMyQueries: (email: string) => `${API_BASE_URL}/queries/my-queries/${email}`,
  getAllQueries: `${API_BASE_URL}/queries/all`,
  replyQuery: (id: string) => `${API_BASE_URL}/queries/reply/${id}`,
};
