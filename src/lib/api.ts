import axios from 'axios';

// Get configuration from Supabase client constants or environment
const SUPABASE_URL = "https://eitiuxustgakpoggzlrz.supabase.co";
const SUPABASE_ANON_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImVpdGl1eHVzdGdha3BvZ2d6bHJ6Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzE4MTMzMDksImV4cCI6MjA4NzM4OTMwOX0.-MoShFyhQiwgSghrGWVdhjYEErQzLXxcz34WTdE1iFo";

const api = axios.create({
  baseURL: `${SUPABASE_URL}/rest/v1`,
  headers: {
    'Content-Type': 'application/json',
    'apikey': SUPABASE_ANON_KEY,
  }
});

// Request Interceptor: Attach the JWT token to every request
api.interceptors.request.use(
  (config) => {
    // Priority 1: Check localStorage 'token' (manually managed)
    // Priority 2: Could check Supabase storage, but 'token' should be kept in sync
    const token = localStorage.getItem('token');
    
    if (token) {
      config.headers.Authorization = `Bearer ${token}`;
    }
    
    // Debugging: Log outgoing requests in development
    if (process.env.NODE_ENV !== 'production') {
      console.log(`[API Request] ${config.method?.toUpperCase()} ${config.url}`, {
        hasToken: !!token,
        url: config.url
      });
    }
    
    return config;
  },
  (error) => {
    console.error('[API Request Error]', error);
    return Promise.reject(error);
  }
);

// Response Interceptor: Handle auth errors and global logging
api.interceptors.response.use(
  (response) => {
    return response;
  },
  (error) => {
    // Debugging: Log API responses with errors
    const status = error.response?.status;
    const data = error.response?.data;
    const url = error.config?.url;
    
    if (status === 401 || status === 403) {
      console.warn(`[API Auth Error] ${status} on ${url}`, {
        message: data?.message || error.message,
        hint: "Token may be expired, invalid, or missing permissions."
      });
      
      // We don't force logout here to prevent loops during refresh
      // useAuth's onAuthStateChange will handle real session terminations
    } else {
      console.error(`[API Error] ${status || 'Network'} on ${url}`, data || error.message);
    }
    
    return Promise.reject(error);
  }
);

export default api;

