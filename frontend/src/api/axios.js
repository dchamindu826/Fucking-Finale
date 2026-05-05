import axios from 'axios';

const api = axios.create({
  baseURL: 'https://imacampus.online/api', 
});

api.interceptors.request.use((config) => {
    const token = localStorage.getItem('token') || localStorage.getItem('userToken');
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});

api.interceptors.response.use((response) => {
    if (response.data) {
        let stringData = JSON.stringify(response.data);
        if (stringData.includes('http://72.62.249.211:5000')) {
            stringData = stringData.replace(/http:\/\/72\.62\.249\.211:5000/g, 'https://imacampus.online');
            response.data = JSON.parse(stringData);
        }
    }
    return response;
}, (error) => {
    // 🔥 NEW FIX: 401 ආවොත් Auto Logout කරනවා
    if (error.response && error.response.status === 401) {
        console.warn("Session Expired or Logged in from another device!");
        localStorage.removeItem('token');
        localStorage.removeItem('userToken');
        localStorage.removeItem('user');
        
        // Auto Login Page එකට යවනවා
        window.location.href = '/login'; 
    }
    return Promise.reject(error);
});

export default api;