import apiClient from './axiosClient.js';

/**
 * Auth API calls
 */
export const authApi = {
  register: (data) => apiClient.post('/auth/register', data),
  login: (data) => apiClient.post('/auth/login', data),
  logout: () => apiClient.post('/auth/logout'),
  refresh: () => apiClient.post('/auth/refresh'),
  getProfile: () => apiClient.get('/auth/profile'),
};

/**
 * Rooms API calls
 */
export const roomsApi = {
  create: () => apiClient.post('/rooms'),
  join: (roomId) => apiClient.post(`/rooms/${roomId}/join`),
  leave: (roomId) => apiClient.post(`/rooms/${roomId}/leave`),
  get: (roomId) => apiClient.get(`/rooms/${roomId}`),
  assignRole: (roomId, userId, role) => apiClient.patch(`/rooms/${roomId}/role`, { userId, role }),
  transferHost: (roomId, userId) => apiClient.patch(`/rooms/${roomId}/transfer`, { userId }),
  removeMember: (roomId, userId) => apiClient.delete(`/rooms/${roomId}/member`, { data: { userId } }),
};
