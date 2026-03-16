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

  const execute = useCallback(async (overrideOptions = {}) => {
    if (!url) return null;
    setLoading(true);
    setError(null);
    try {
      const response = await api.get(url, { ...options, ...overrideOptions });
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
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [url, options]);

  useEffect(() => {
    let alive = true;
    if (immediate && url) {
      execute().catch(() => {}); // catch handled in execute, suppress uncaught promise rejection
    }
    return () => { alive = false; };
  }, [execute, immediate, url]);

  return { data, setData, loading, error, execute };
}

/**
 * Custom hook for POST/PUT/DELETE mutations
 * @param {'post'|'put'|'delete'|'patch'} method 
 */
export function useMutation(method = 'post') {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const mutate = useCallback(async (url, body = null, config = {}) => {
    setLoading(true);
    setError(null);
    try {
      const args = ['delete', 'get'].includes(method.toLowerCase()) 
        ? [url, config] 
        : [url, body, config];
      
      const response = await api[method.toLowerCase()](...args);
      return response.data;
    } catch (err) {
      const msg = err.response?.data?.detail
        ? Array.isArray(err.response.data.detail)
          ? err.response.data.detail.map(d => d.msg || String(d)).join('; ')
          : String(err.response.data.detail)
        : err.message || 'Mutation failed';
      setError(msg);
      throw new Error(msg);
    } finally {
      setLoading(false);
    }
  }, [method]);

  return { mutate, loading, error };
}
