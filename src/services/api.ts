import axios from 'axios';

const API_URL = 'http://localhost:5000/api';

const api = axios.create({
    baseURL: API_URL,
    headers: {
        'Content-Type': 'application/json',
    },
});

// Add token to requests
api.interceptors.request.use((config) => {
    const token = localStorage.getItem('dataprep_token');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
});

export const authApi = {
    login: (email: string, password: string) => api.post('/auth/login', { email, password }),
    register: (name: string, email: string, password: string) => api.post('/auth/register', { name, email, password }),
    guestLogin: () => api.post('/auth/guest'),
};

export const datasetsApi = {
    upload: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        return api.post('/datasets/upload', formData, {
            headers: { 'Content-Type': 'multipart/form-data' },
            timeout: 120000, // 2 minutes for processing large files
        });
    },
    getStats: (datasetId: string, column: string) => api.get(`/datasets/${datasetId}/stats`, { params: { column } }),
    getCorrelation: (datasetId: string) => api.get(`/datasets/${datasetId}/correlation`),
    getDistribution: (datasetId: string, column: string, bins?: number) => api.get(`/datasets/${datasetId}/distribution`, { params: { column, bins } }),
    getCategories: (datasetId: string, column: string, top_n?: number) => api.get(`/datasets/${datasetId}/categories`, { params: { column, top_n } }),
    getTypes: (datasetId: string) => api.get(`/datasets/${datasetId}/types`),
    getScatter: (datasetId: string, x: string, y: string, sample?: number) => api.get(`/datasets/${datasetId}/scatter`, { params: { x, y, sample } }),
    getQuality: (datasetId: string) => api.get(`/datasets/${datasetId}/quality`),
    process: (datasetId: string, type: string, params: any) => api.post(`/datasets/${datasetId}/process`, { type, params }),
    autopilot: (datasetId: string) => api.post(`/datasets/${datasetId}/autopilot`),
    export: (id: string, format: string) => api.get(`/datasets/${id}/export`, { params: { format }, responseType: 'blob' }),
};

export const sessionsApi = {
    create: (data: any) => api.post('/sessions/', data),
    getAll: () => api.get('/sessions/'),
    getOne: (id: string) => api.get(`/sessions/${id}`),
    update: (id: string, data: any) => api.put(`/sessions/${id}`, data),
    delete: (id: string) => api.delete(`/sessions/${id}`),
};

export default api;
