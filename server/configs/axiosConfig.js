import http from 'http';
import https from 'https';
import axios from 'axios';

const axiosInstance = axios.create({
  httpAgent: new http.Agent({ keepAlive: false }),
  httpsAgent: new https.Agent({ keepAlive: false }),
});

export default axiosInstance;
