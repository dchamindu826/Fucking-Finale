import axios from 'axios';

const api = axios.create({
  // ඔයාගේ අලුත් Base URL එක
  baseURL: 'https://imacampus.online/api', 
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