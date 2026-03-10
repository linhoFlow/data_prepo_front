import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:5000/api';

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

// Intercept tier-related errors (403 = blocked, 429 = rate limit)
api.interceptors.response.use(
    (response) => {
        // Check if the response contains a "locked" payload (for advanced visuals)
        if (response.data?.locked) {
            // Dispatch a custom event so the UI can show the conversion modal
            window.dispatchEvent(new CustomEvent('tier-blocked', {
                detail: {
                    trigger: response.data.trigger || 'advanced_visuals',
                    reason: response.data.reason,
                    upgrade_hint: response.data.upgrade_hint,
                    current_tier: response.data.current_tier,
                }
            }));
        }
        return response;
    },
    async (error) => {
        let data = error.response?.data;

        // Si le serveur renvoie un Blob (fréquent pour les exports) mais que c'est une erreur
        if (data instanceof Blob) {
            try {
                const text = await data.text();
                data = JSON.parse(text);
            } catch (e) {
                console.error("Failed to parse error blob as JSON:", e);
            }
        }

        if (error.response?.status === 401) {
            console.error(">>> [AUTH ERROR] 401 Unauthorized detected. Session expired.");
            localStorage.removeItem('dataprep_token');
            localStorage.removeItem('dataprep_user');

            // Éviter le rechargement infini si on est déjà sur une page de login
            const isLoginPage = window.location.pathname.includes('login');
            if (!isLoginPage) {
                window.location.reload();
            }
        }

        if (error.response?.status === 403 || error.response?.status === 429) {
            window.dispatchEvent(new CustomEvent('tier-blocked', {
                detail: {
                    trigger: data?.trigger || 'feature_blocked',
                    reason: data?.reason || data?.error || data?.message,
                    upgrade_hint: data?.upgrade_hint,
                    current_tier: data?.current_tier,
                    blocked_feature: data?.blocked_feature,
                }
            }));
        }

        // Pour les autres erreurs (500, etc.), on attache les data parsées à l'erreur pour PreprocessingPipeline
        if (error.response) {
            error.response.data = data;
        }

        return Promise.reject(error);
    }
);

export const authApi = {
    login: (email: string, password: string) => api.post('/auth/login', { email, password }),
    register: (name: string, email: string, password: string) => api.post('/auth/register', { name, email, password }),
    guestLogin: () => api.post('/auth/guest'),
};

export const datasetsApi = {
    upload: (file: File) => {
        const formData = new FormData();
        formData.append('file', file);
        formData.append('filename', file.name); // ✅ Envoi explicite du nom original

        // On supprime le header Content-Type par défaut pour cette requête spécifique
        // afin que le navigateur génère automatiquement le boundary correct
        return api.post('/datasets/upload', formData, {
            headers: { 'Content-Type': false }, // Axios 1.x tip: false supprime le default
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
    analyzeMissing: (datasetId: string) => api.get(`/datasets/${datasetId}/analyze-missing`),
    getFunnel: (datasetId: string, column: string) => api.get(`/datasets/${datasetId}/funnel`, { params: { column } }),
    getWaterfall: (datasetId: string, initial: number, transforms: string[]) => api.get(`/datasets/${datasetId}/waterfall`, { params: { initial, transforms: JSON.stringify(transforms) } }),
    getGauge: (datasetId: string) => api.get(`/datasets/${datasetId}/gauge`),
    process: (datasetId: string, type: string, params: any) => api.post(`/datasets/${datasetId}/process`, { type, params }),
    autopilot: (datasetId: string, params?: { objective?: string; algorithm?: string | string[]; nlp?: string; is_guest?: boolean }) =>
        api.post(`/datasets/${datasetId}/autopilot`, params),
    export: (datasetId: string, format: string, filename?: string) =>
        api.get(`/datasets/${datasetId}/export`, {
            params: { format, filename },
            responseType: 'blob',
            timeout: 60000
        }),
    getOne: (id: string) => api.get(`/datasets/${id}`),
};

export const sessionsApi = {
    create: (data: any) => api.post('/sessions/', data),
    getAll: () => api.get('/sessions/'),
    getOne: (id: string) => api.get(`/sessions/${id}`),
    update: (id: string, data: any) => api.put(`/sessions/${id}`, data),
    delete: (id: string) => api.delete(`/sessions/${id}`),
};

export const chatApi = {
    sendMessage: (message: string, conversationId?: string) =>
        api.post('/chat/message', { message, conversation_id: conversationId }),
    getHistory: () => api.get('/chat/history'),
    deleteConversation: (conversationId: string) =>
        api.delete(`/chat/history/${conversationId}`),
};

export const adminApi = {
    getUsers: () => api.get('/admin/users'),
    updateUserTier: (userId: string, tier: string) => api.post(`/admin/users/${userId}/tier`, { tier }),
    deleteUser: (userId: string) => api.delete(`/admin/users/${userId}`),
    getStats: () => api.get('/admin/stats'),
    // Managers
    getManagers: () => api.get('/admin/managers'),
    toggleManagerStatus: (userId: string) => api.post(`/admin/managers/${userId}/status`),
    updateManagerRole: (userId: string, role: string) => api.post(`/admin/managers/${userId}/role`, { role }),
    deleteManager: (userId: string) => api.delete(`/admin/managers/${userId}`),
};

export default api;
