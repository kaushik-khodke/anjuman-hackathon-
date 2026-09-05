/**
 * Central API configuration.
 * Local dev default: http://localhost:8000
 * Production: Set VITE_API_URL in your hosting environment (e.g. Vercel/Netlify)
 */
export const API_BASE_URL =
  import.meta.env.VITE_API_URL ||
  import.meta.env.VITE_BACKEND_URL ||
  (typeof window !== 'undefined' && (window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1') ? 'http://127.0.0.1:8000' : 'https://medithon.onrender.com');
