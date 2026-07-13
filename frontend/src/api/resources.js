import api from './client';

export const postsApi = {
  getFeed: (params) => api.get('/posts/feed', { params }),
  getTrending: () => api.get('/posts/trending'),
  getPost: (postId) => api.get(`/posts/${postId}`),
  createPost: (formData) =>
    api.post('/posts', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  updatePost: (postId, payload) => api.patch(`/posts/${postId}`, payload),
  deletePost: (postId) => api.delete(`/posts/${postId}`),
  archivePost: (postId) => api.patch(`/posts/${postId}/archive`),
  pinPost: (postId) => api.patch(`/posts/${postId}/pin`),
  toggleLike: (postId) => api.post(`/posts/${postId}/like`),
  toggleSave: (postId) => api.post(`/posts/${postId}/save`),
  sharePost: (postId) => api.post(`/posts/${postId}/share`),
  hidePost: (postId) => api.post(`/posts/${postId}/hide`),
  unhidePost: (postId) => api.post(`/posts/${postId}/unhide`),
  notInterested: (postId) => api.post(`/posts/${postId}/not-interested`),
  interested: (postId) => api.post(`/posts/${postId}/interested`),
  addComment: (postId, text) => api.post(`/posts/${postId}/comments`, { text }),
  addReply: (postId, commentId, text) =>
    api.post(`/posts/${postId}/comments/${commentId}/replies`, { text }),
  reportPost: (postId, reason, details) => api.post(`/posts/${postId}/report`, { reason, details }),
  getSaved: () => api.get('/posts/saved'),
  getUserPosts: (username) => api.get(`/posts/user/${username}`),
  getUserReposts: (username) => api.get(`/posts/user/${username}/reposts`),
};

export const usersApi = {
  getProfile: (username) => api.get(`/users/${username}`),
  updateProfile: (payload) => api.patch('/users/me', payload),
  updatePresence: () => api.patch('/users/me/presence'),
  updateNote: (payload) => api.patch('/users/me/note', payload),
  updatePrivacy: (payload) => api.patch('/users/me/privacy', payload),
  getPrivacy: () => api.get('/users/me/privacy'),
  updateLocation: (longitude, latitude) => api.patch('/users/me/location', { longitude, latitude }),
  uploadAvatar: (formData) =>
    api.post('/users/me/avatar', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  uploadCover: (formData) =>
    api.post('/users/me/cover', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  follow: (userId) => api.post(`/users/${userId}/follow`),
  unfollow: (userId) => api.delete(`/users/${userId}/follow`),
  getFollowers: (username) => api.get(`/users/${username}/followers`),
  getFollowing: (username) => api.get(`/users/${username}/following`),
  search: (q) => api.get('/users/search', { params: { q } }),
  getMentionSuggestions: (q) => api.get('/users/mentions', { params: { q } }),
  getNearby: (radiusKm) => api.get('/users/nearby', { params: { radiusKm } }),
};

export const messagesApi = {
  getConversations: () => api.get('/messages/conversations'),
  getConversation: (userId) => api.get(`/messages/${userId}`),
  sendMessage: (userId, formData) => api.post(`/messages/${userId}`, formData),
  markRead: (conversationId) => api.post(`/messages/${conversationId}/read`),
  updateSettings: (userId, payload) => api.patch(`/messages/${userId}/settings`, payload),
  reportConversation: (userId) => api.post(`/messages/${userId}/report`),
};

export const storiesApi = {
  getAll: () => api.get('/stories'),
  create: (formData) => api.post('/stories', formData, { headers: { 'Content-Type': 'multipart/form-data' } }),
  view: (storyId) => api.get(`/stories/${storyId}`),
  remove: (storyId) => api.delete(`/stories/${storyId}`),
};

export const notificationsApi = {
  getNotifications: () => api.get('/notifications'),
  markRead: (notificationId) => api.patch(`/notifications/${notificationId}/read`),
  markAllRead: () => api.patch('/notifications/read'),
};
