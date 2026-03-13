import axios from 'axios';
import type { AxiosError } from 'axios';

import { toast } from 'react-toastify';

const apiClient = axios.create({
  baseURL: '/api',
  timeout: 30000,
  withCredentials: true,
  headers: { 'Content-Type': 'application/json' },
});

/* ── Request: attach tenant / locale / fingerprint ── */
apiClient.interceptors.request.use((config) => {
  if (typeof window !== 'undefined') {
    const locale = window.location.pathname.split('/')[1] || 'de';
    const visitorId = localStorage.getItem('fingerprint') || '';

    config.headers.set('x-lang', locale);
    config.headers.set('x-user-identifier', visitorId);
  }

  return config;
});

/* ── Response: handle 401 + toast errors ── */
apiClient.interceptors.response.use(
  (response) => response,
  async (error: AxiosError<{ message?: string | string[] }>) => {
    /* — 401: session expired (proxy already tried refresh) — */
    if (error.response?.status === 401) {
      try {
        await fetch('/api/clear-cookies', { method: 'PUT' });
      } catch {
        /* ignore */
      }

      // Notify other tabs
      try {
        const bc = new BroadcastChannel('auth');

        bc.postMessage({ type: 'LOGOUT' });
        bc.close();
      } catch {
        /* BroadcastChannel not supported */
      }

      // Hard redirect
      if (typeof window !== 'undefined') {
        const locale = window.location.pathname.split('/')[1] || 'de';

        window.location.assign(`/${locale}/login`);
      }

      return Promise.reject(error);
    }

    /* — Other errors: show toast — */
    if (error.response && error.response.status >= 400) {
      const data = error.response.data;
      const message = Array.isArray(data?.message) ? data.message[0] : data?.message;

      if (message) {
        toast.error(message);
      }
    }

    return Promise.reject(error);
  },
);

/* ── Cross-tab logout listener ── */
if (typeof window !== 'undefined' && 'BroadcastChannel' in window) {
  const channel = new BroadcastChannel('auth');

  channel.onmessage = (event) => {
    if (event.data?.type === 'LOGOUT') {
      const locale = window.location.pathname.split('/')[1] || 'de';

      window.location.assign(`/${locale}/login`);
    }
  };
}

export default apiClient;
