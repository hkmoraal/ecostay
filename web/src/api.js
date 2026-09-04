// One small wrapper around fetch. The API base comes from an env var so the
// same build works locally and in production.
const BASE = import.meta.env.VITE_API_URL || 'http://localhost:4000';

// The auditor key is entered once in the auditor area and kept in localStorage.
export const auditorKey = {
  get: () => localStorage.getItem('ecostay_auditor_key') || '',
  set: (k) => localStorage.setItem('ecostay_auditor_key', k),
  clear: () => localStorage.removeItem('ecostay_auditor_key'),
};

// The admin key is entered once in the admin area and kept in localStorage.
export const adminKey = {
  get: () => localStorage.getItem('ecostay_admin_key') || '',
  set: (k) => localStorage.setItem('ecostay_admin_key', k),
  clear: () => localStorage.removeItem('ecostay_admin_key'),
};

// The owner session token (magic-link login), kept in localStorage.
export const ownerToken = {
  get: () => localStorage.getItem('ecostay_owner_token') || '',
  set: (t) => localStorage.setItem('ecostay_owner_token', t),
  clear: () => localStorage.removeItem('ecostay_owner_token'),
};

async function request(path, options = {}) {
  const { headers: extraHeaders, ...rest } = options;
  const res = await fetch(`${BASE}/api${path}`, {
    ...rest,
    // Headers als laatste samenvoegen, zodat Content-Type nooit wordt
    // overschreven door de sleutel-headers uit withAdmin/withKey/withOwner.
    headers: { 'Content-Type': 'application/json', ...(extraHeaders || {}) },
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data.error || `Verzoek mislukt (${res.status})`);
  }
  return data;
}

// Adds the auditor key header to a request.
function withKey(extra = {}) {
  return { headers: { 'x-auditor-key': auditorKey.get(), ...(extra.headers || {}) }, ...extra };
}

// Adds the admin key header to a request. The admin key also works on the
// auditor endpoints (e.g. fetching a single audit's detail with evidence).
function withAdmin(extra = {}) {
  return {
    headers: { 'x-admin-key': adminKey.get(), 'x-auditor-key': adminKey.get(), ...(extra.headers || {}) },
    ...extra,
  };
}

// Adds the owner session token header to a request.
function withOwner(extra = {}) {
  return { headers: { 'x-owner-token': ownerToken.get(), ...(extra.headers || {}) }, ...extra };
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

  // ---- Auditor area (all gated by the auditor key) ----
  listAudits: (status = 'available') =>
    request(`/audits?status=${status}`, withKey()),
  getAudit: (id) => request(`/audits/${id}`, withKey()),
  claimAudit: (id, body) =>
    request(`/audits/${id}/claim`, withKey({ method: 'POST', body: JSON.stringify(body) })),
  submitAudit: (id, body) =>
    request(`/audits/${id}/submit`, withKey({ method: 'POST', body: JSON.stringify(body) })),

  // ---- Admin area (all gated by the admin key) ----
  adminOverview: () => request('/admin/overview', withAdmin()),
  adminStays: (params = {}) => {
    const qs = new URLSearchParams(params).toString();
    return request(`/admin/stays${qs ? `?${qs}` : ''}`, withAdmin());
  },
  adminEditStay: (slug, body) =>
    request(`/admin/stays/${slug}`, withAdmin({ method: 'PATCH', body: JSON.stringify(body) })),
  adminSetStatus: (slug, status) =>
    request(`/admin/stays/${slug}/status`, withAdmin({ method: 'POST', body: JSON.stringify({ status }) })),
  adminDeleteStay: (slug) =>
    request(`/admin/stays/${slug}`, withAdmin({ method: 'DELETE' })),
  adminAudits: (status = 'all') => request(`/admin/audits?status=${status}`, withAdmin()),
  adminAuditors: () => request('/admin/auditors', withAdmin()),
  adminGetAudit: (id) => request(`/audits/${id}`, withAdmin()),
  adminDecideAudit: (id, decision) =>
    request(`/audits/${id}/decision`, withAdmin({ method: 'POST', body: JSON.stringify({ decision }) })),

  // Invitations (admin)
  listInvitations: () => request('/invitations', withAdmin()),
  createInvitation: (body) =>
    request('/invitations', withAdmin({ method: 'POST', body: JSON.stringify(body) })),

  // ---- Verblijf-login (magic link) ----
  ownerRequestLink: (email) =>
    request('/owner/request-link', { method: 'POST', body: JSON.stringify({ email }) }),
  ownerVerify: (token) =>
    request('/owner/verify', { method: 'POST', body: JSON.stringify({ token }) }),
  ownerMe: () => request('/owner/me', withOwner()),
  ownerEditStay: (slug, body) =>
    request(`/owner/stays/${slug}`, withOwner({ method: 'PATCH', body: JSON.stringify(body) })),
  ownerSubscription: (slug) => request(`/owner/stays/${slug}/subscription`, withOwner()),
  ownerCancelSubscription: (slug) =>
    request(`/owner/stays/${slug}/subscription`, withOwner({ method: 'DELETE' })),
  ownerChangeTier: (slug, tier) =>
    request(`/owner/stays/${slug}/change-tier`, withOwner({ method: 'POST', body: JSON.stringify({ tier }) })),
  ownerRequestRenewal: (slug) =>
    request(`/owner/stays/${slug}/request-renewal`, withOwner({ method: 'POST' })),
  ownerLogout: () => request('/owner/logout', withOwner({ method: 'POST' })),
};

// ---- Cloudinary signed direct upload ----
// 1) ask our server to sign the params, 2) POST the file straight to Cloudinary.
export async function uploadPhoto(file, folder) {
  const sign = await request('/uploads/sign', withKey({
    method: 'POST',
    body: JSON.stringify({ folder }),
  }));

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sign.apiKey);
  form.append('timestamp', sign.timestamp);
  form.append('signature', sign.signature);
  form.append('folder', sign.folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Upload naar Cloudinary mislukt');
  return { url: data.secure_url, public_id: data.public_id };
}

// ---- Public stay-photo upload (used during registration + owner dashboard) ----
export async function uploadStayPhoto(file) {
  const sign = await request('/uploads/sign-stay', { method: 'POST', body: JSON.stringify({}) });

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', sign.apiKey);
  form.append('timestamp', sign.timestamp);
  form.append('signature', sign.signature);
  form.append('folder', sign.folder);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${sign.cloudName}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Upload naar Cloudinary mislukt');
  return { url: data.secure_url, public_id: data.public_id };
}
