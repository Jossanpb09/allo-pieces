// Shared admin API helper for authenticated requests
import axios from "axios";

export const API = `${process.env.REACT_APP_BACKEND_URL}/api`;
export const UPLOADS_BASE = process.env.REACT_APP_BACKEND_URL;

export const getAuthHeaders = () => {
  const token = localStorage.getItem("admin_token");
  return { Authorization: `Bearer ${token}` };
};

export const adminApi = {
  get: (path, config = {}) => axios.get(`${API}${path}`, { ...config, headers: { ...getAuthHeaders(), ...(config.headers || {}) } }),
  post: (path, data, config = {}) => axios.post(`${API}${path}`, data, { ...config, headers: { ...getAuthHeaders(), ...(config.headers || {}) } }),
  put: (path, data, config = {}) => axios.put(`${API}${path}`, data, { ...config, headers: { ...getAuthHeaders(), ...(config.headers || {}) } }),
  delete: (path, config = {}) => axios.delete(`${API}${path}`, { ...config, headers: { ...getAuthHeaders(), ...(config.headers || {}) } })
};

export const resolveAssetUrl = (path) => {
  if (!path) return "";
  if (path.startsWith("http")) return path;
  return `${UPLOADS_BASE}${path}`;
};
