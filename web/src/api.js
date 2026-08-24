// One small wrapper around fetch. The API base comes from an env var so the
// same build works locally and in production.
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

async function request(path, options = {}) {
  const res = await fetch(`${BASE}/api${path}`, {
    headers: { 'Content-Type': 'application/json' },
    ...options,
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Verzoek mislukt (${res.status})`);
  }
  return data;
}

export const api = {
  listStays: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/accommodations${qs ? `?${qs}` : ''}`);
  },
  getStay: (slug) => request(`/accommodations/${slug}`),
  createStay: (body) =>
    request('/accommodations', { method: 'POST', body: JSON.stringify(body) }),
  getCriteria: () => request('/criteria'),
  submitAssessment: (slug, metIds) =>
    request(`/accommodations/${slug}/assessment`, {
      method: 'POST',
      body: JSON.stringify({ metIds }),
    }),
};
