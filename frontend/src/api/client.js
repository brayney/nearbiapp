import axios from 'axios';

const configuredUrl = import.meta.env.VITE_API_URL || '/api';
const baseURL = configuredUrl.endsWith('/api') ? configuredUrl : `${configuredUrl.replace(/\/+$/, '')}/api`;

const api = axios.create({
  baseURL,
  withCredentials: true, // send httpOnly cookies (accessToken/refreshToken)
  timeout: 20000,
});

// Attach bearer token if we have one in memory (cookie is the primary
// mechanism, but keeping this lets the same client work for any client
// that stores the token itself, e.g. a future mobile wrapper).
let accessToken = null;
export function setAccessToken(token) {
  accessToken = token;
}

api.interceptors.request.use((config) => {
  if (accessToken) config.headers.Authorization = `Bearer ${accessToken}`;
  return config;
});

let isRefreshing = false;
let queue = [];

function processQueue(error, token = null) {
  queue.forEach(({ resolve, reject }) => (error ? reject(error) : resolve(token)));
  queue = [];
}

api.interceptors.response.use(
  (res) => res,
  async (error) => {
    const original = error.config;
    const status = error.response?.status;

    // Avoid refresh loops for login / register / logout / refresh routes.
    const disallowedRefreshRoutes = ['/auth/login', '/auth/register', '/auth/logout', '/auth/refresh'];
    const isRefreshBlocked = disallowedRefreshRoutes.some((route) => original?.url?.includes(route));

    if (status === 401 && !original._retry && !isRefreshBlocked) {
      if (isRefreshing) {
        return new Promise((resolve, reject) => {
          queue.push({ resolve, reject });
        }).then((token) => {
          original.headers.Authorization = `Bearer ${token}`;
          return api(original);
        });
      }

      original._retry = true;
      isRefreshing = true;

      try {
        const { data } = await api.post('/auth/refresh');
        setAccessToken(data.accessToken);
        processQueue(null, data.accessToken);
        original.headers.Authorization = `Bearer ${data.accessToken}`;
        return api(original);
      } catch (refreshError) {
        processQueue(refreshError, null);
        setAccessToken(null);
        window.dispatchEvent(new CustomEvent('auth:logout'));
        return Promise.reject(refreshError);
      } finally {
        isRefreshing = false;
      }
    }

    return Promise.reject(error);
  }
);

export default api;
