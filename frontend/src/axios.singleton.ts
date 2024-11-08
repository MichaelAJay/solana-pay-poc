import axios from 'axios';

const axiosInstance = axios.create({
    baseURL: 'http://localhost:3030',
    timeout: 1000,
    headers: { 'Content-Type': 'application/json' }
});

export default axiosInstance;