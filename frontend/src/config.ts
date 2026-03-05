import axios from 'axios';

const API_URL = process.env.REACT_APP_API_URL || '';
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
