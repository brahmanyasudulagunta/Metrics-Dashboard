import axios from 'axios';

const API_URL = '';
console.log('Using API_URL:', API_URL || '(relative)');
export default API_URL;

// Global axios interceptor: auto-logout on 401 (expired/invalid token)
axios.interceptors.response.use(
    (response) => response,
    (error) => {
        if (error.response?.status === 401) {
            localStorage.removeItem('token');
            if (window.location.pathname !== '/login') {
                window.location.href = '/login';
            }
        }
        return Promise.reject(error);
    }
);
