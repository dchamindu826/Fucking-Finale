import axios from 'axios';

const api = axios.create({
  // 🔥 FIX: Live Domain එක වෙනුවට කෙලින්ම Server IP එකයි Port එකයි දාන්න!
  baseURL: 'http://72.62.249.211:5000/api', 
});

// 🔥 NEW FIX: Frontend eken API yaddi Token eka aniwaren yawana eka 🔥
api.interceptors.request.use((config) => {
    // LocalStorage eke thiyena token eka gannawa
    const token = localStorage.getItem('token') || localStorage.getItem('userToken');
    
    // Token eka thiyenawanam eka Header ekata attach karanawa
    if (token) {
        config.headers.Authorization = `Bearer ${token}`;
    }
    return config;
}, (error) => {
    return Promise.reject(error);
});


// 🔥 Global Image URL Fixer (මුළු සිස්ටම් එකේම පින්තූර හදන මැජික් එක) 🔥
api.interceptors.response.use((response) => {
    if (response.data) {
        // Backend එකෙන් එන Data ටික String එකක් කරලා පරණ IP එක හොයනවා
        let stringData = JSON.stringify(response.data);
        if (stringData.includes('http://72.62.249.211:5000')) {
            // පරණ IP එක වෙනුවට අලුත් Domain එක දානවා
            stringData = stringData.replace(/http:\/\/72\.62\.249\.211:5000/g, 'https://imacampus.online');
            response.data = JSON.parse(stringData);
        }
    }
    return response;
}, (error) => {
    return Promise.reject(error);
});

export default api;