// src/api/axios.js
import axios from 'axios';

const api = axios.create({
  // මෙන්න මේක මාරු කරන්න ඔයාගේ VPS IP එකට
  baseURL: 'http://72.62.249.211:5000/api', 
});

export default api;