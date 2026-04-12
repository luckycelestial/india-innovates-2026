import { useState, useCallback, useEffect } from 'react';
import api from '../services/api';

/**
 * Custom hook to manage API fetch state and lifecycle
 * @param {string | null} url The endpoint to fetch from. If null, won't execute automatically.
 * @param {import('axios').AxiosRequestConfig} [options] Axios request config
 * @param {boolean} [immediate=true] Whether to run immediately on mount (if url is provided)
 */
export function useFetch(url, options = {}, immediate = true) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(immediate && !!url);
  const [error, setError] = useState(null);

  // Stabilize options reference to prevent infinite re-render loops
  const optionsRef = useState(options)[0];

  const execute = useCallback(async (overrideOptions = {}) => {
    if (!url) return null;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(url, { ...optionsRef, ...overrideOptions });
      const responseData = response.data;
      
      // Some endpoints return { items: [] }, normalize it or return directly
      const normalizedData = (typeof responseData === 'object' && 'items' in responseData && !Array.isArray(responseData)) 
        ? responseData.items 
        : responseData;
        
      setData(normalizedData);
      return normalizedData;
    } catch (err) {
      const msg = err.response?.data?.detail
        ? Array.isArray(err.response.data.detail)
          ? err.response.data.detail.map(d => d.msg || String(d)).join('; ')
          : String(err.response.data.detail)
        : err.message || 'Fetch failed';
      setError(msg);
      setData(null);
      return null;
    } finally {
      setLoading(false);
    }
  }, [url, optionsRef]);

  useEffect(() => {
    if (immediate && url) {
      execute();
    }
  }, [execute, immediate, url]);

  return { data, setData, loading, error, execute };
}

/**
 * Custom hook for POST/PUT/DELETE mutations with retry logic
 * @param {'post'|'put'|'delete'|'patch'} method 
 */
export function useMutation(method = 'post') {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (url, body = null, config = {}, maxRetries = 3) => {
    setLoading(true);
    setError(null);
    let lastErr = null;

    for (let attempt = 0; attempt < maxRetries; attempt++) {
      try {
        const args = ['delete', 'get'].includes(method.toLowerCase()) 
          ? [url, config] 
          : [url, body, config];
        
        const response = await api[method.toLowerCase()](...args);
        setLoading(false);
        return response.data;
      } catch (err) {
        lastErr = err;
        // Retry on network errors or 5xx errors, but not on 4xx client errors
        const isNetworkError = !err.response || err.code === 'ECONNABORTED';
        const isServerError = err.response?.status >= 500;
        const shouldRetry = isNetworkError || isServerError;

        if (shouldRetry && attempt < maxRetries - 1) {
          // Wait with exponential backoff: 500ms, 1000ms, 2000ms
          await new Promise(resolve => setTimeout(resolve, Math.pow(2, attempt) * 500));
          continue;
        }

        // No more retries or don't retry this type of error
        const msg = err.response?.data?.detail
          ? Array.isArray(err.response.data.detail)
            ? err.response.data.detail.map(d => d.msg || String(d)).join('; ')
            : String(err.response.data.detail)
          : 'Unable to submit. Please check your connection and try again.';
        
        setError(msg);
        setLoading(false);
        throw new Error(msg);
      }
    }
  }, [method]);

  return { mutate, loading, error };
}
