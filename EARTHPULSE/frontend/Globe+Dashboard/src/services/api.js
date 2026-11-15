/**
 * EARTHPULSE - Centralized Geospatial & Analytical API Client
 * Dynamically resolves API base URL across local development, Vercel Multi-Service deployments,
 * and internal service bindings.
 */

const getBaseUrl = () => {
  // 1. Explicit Vite client-side environment variable (e.g. build-time or .env)
  if (typeof import.meta !== 'undefined' && import.meta.env?.VITE_API_BASE_URL) {
    return import.meta.env.VITE_API_BASE_URL;
  }
  // 2. Bound runtime service variable if running in SSR / serverless Node context (Vercel Service Binding)
  if (typeof process !== 'undefined' && process.env?.BACKEND_URL) {
    return process.env.BACKEND_URL;
  }
  // 3. In production on Vercel with top-level rewrites, use same-origin relative URLs ("")
  if (typeof import.meta !== 'undefined' && import.meta.env?.PROD) {
    return '';
  }
  // 4. Default for standalone local Vite development
  return 'http://127.0.0.1:8000';
};

const BASE_URL = getBaseUrl();

async function fetchJSON(endpoint, options = {}) {
  let url;
  if (!BASE_URL) {
    url = endpoint;
  } else if (endpoint.startsWith('http://') || endpoint.startsWith('https://')) {
    url = endpoint;
  } else {
    const cleanBase = BASE_URL.endsWith('/') ? BASE_URL.slice(0, -1) : BASE_URL;
    const cleanEndpoint = endpoint.startsWith('/') ? endpoint : `/${endpoint}`;
    url = `${cleanBase}${cleanEndpoint}`;
  }
  try {
    const res = await fetch(url, {
      headers: {
        'Content-Type': 'application/json',
        ...(options.headers || {}),
      },
      ...options,
    });

    if (!res.ok) {
      let errDetail = `${res.status} ${res.statusText}`;
      try {
        const body = await res.json();
        if (body.detail) {
          errDetail = typeof body.detail === 'string' ? body.detail : JSON.stringify(body.detail);
        }
      } catch (_) {}
      throw new Error(`API Error [${endpoint}]: ${errDetail}`);
    }

    return await res.json();
  } catch (err) {
    console.error(`Request failed for ${endpoint}:`, err);
    throw err;
  }
}

export const api = {
  // System Health & Monitoring
  getHealth: () => fetchJSON('/health'),
  getDataQuality: () => fetchJSON('/api/v1/data/quality'),

  // 1. Glacier Intelligence API (WGMS Datasets)
  getGlaciersGeoJSON: (params = {}) => {
    const q = new URLSearchParams();
    if (params.country) q.set('country', params.country);
    if (params.query) q.set('query', params.query);
    if (params.limit) q.set('limit', params.limit);
    if (params.offset !== undefined) q.set('offset', params.offset);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return fetchJSON(`/api/v1/geospatial/glaciers${qs}`);
  },

  getGlacierList: (params = {}) => {
    const q = new URLSearchParams();
    if (params.country) q.set('country', params.country);
    if (params.query) q.set('query', params.query);
    if (params.limit) q.set('limit', params.limit);
    if (params.offset !== undefined) q.set('offset', params.offset);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return fetchJSON(`/api/v1/glaciers${qs}`);
  },

  getGlacierDetail: (id) => fetchJSON(`/api/v1/glaciers/${id}`),
  getRegionalGlacierStats: (country) => {
    const qs = country ? `?country=${encodeURIComponent(country)}` : '';
    return fetchJSON(`/api/v1/glaciers/regional-stats${qs}`);
  },

  // 2. Global Fire & Thermal Anomaly Monitoring API (NASA FIRMS MODIS)
  getModisSummary: () => fetchJSON('/api/v1/modis/summary'),
  getModisCountries: () => fetchJSON('/api/v1/modis/countries'),

  getModisDetections: (params = {}) => {
    const q = new URLSearchParams();
    if (params.country) q.set('country', params.country);
    if (params.year) q.set('year', params.year);
    if (params.start_date) q.set('start_date', params.start_date);
    if (params.end_date) q.set('end_date', params.end_date);
    if (params.satellite) q.set('satellite', params.satellite);
    if (params.daynight) q.set('daynight', params.daynight);
    if (params.min_confidence !== undefined && params.min_confidence !== null) {
      q.set('min_confidence', params.min_confidence);
    }
    if (params.min_frp !== undefined && params.min_frp !== null) {
      q.set('min_frp', params.min_frp);
    }
    if (params.page) q.set('page', params.page);
    if (params.page_size) q.set('page_size', params.page_size);
    if (params.limit) q.set('limit', params.limit);
    if (params.offset !== undefined) q.set('offset', params.offset);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return fetchJSON(`/api/v1/modis/detections${qs}`);
  },

  getModisGeoJSON: (params = {}) => {
    const q = new URLSearchParams();
    if (params.country) q.set('country', params.country);
    if (params.year) q.set('year', params.year);
    if (params.start_date) q.set('start_date', params.start_date);
    if (params.end_date) q.set('end_date', params.end_date);
    if (params.max_features) q.set('max_features', params.max_features);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return fetchJSON(`/api/v1/modis/geojson${qs}`);
  },

  getModisHotspots: (params = {}) => {
    const q = new URLSearchParams();
    if (params.country) q.set('country', params.country);
    if (params.year) q.set('year', params.year);
    if (params.start_date) q.set('start_date', params.start_date);
    if (params.end_date) q.set('end_date', params.end_date);
    if (params.eps_km) q.set('eps_km', params.eps_km);
    if (params.min_samples) q.set('min_samples', params.min_samples);
    if (params.min_frp) q.set('min_frp', params.min_frp);
    const qs = q.toString() ? `?${q.toString()}` : '';
    return fetchJSON(`/api/v1/modis/hotspots${qs}`);
  },

  analyzeModis: (payload) =>
    fetchJSON('/api/v1/modis/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),

  // 3. LangGraph & Gemini AI Scientific Agent Analysis
  runAgentAnalysis: (payload) =>
    fetchJSON('/api/v1/agent/analyze', {
      method: 'POST',
      body: JSON.stringify(payload),
    }),
};
