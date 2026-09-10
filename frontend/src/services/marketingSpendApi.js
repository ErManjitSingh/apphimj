import API from '../api/axios';

/** Mutations show their own toast (component-level) — suppress the generic global one. */
const SILENT_MUTATION = { skipSuccessToast: true, skipErrorToast: true };

export async function listMarketingSpend(params = {}) {
  const { data } = await API.get('/marketing-spend', { params });
  return data;
}

export async function getMarketingSpendSummary() {
  const { data } = await API.get('/marketing-spend/summary');
  return data;
}

export async function createMarketingSpend(payload) {
  const { data } = await API.post('/marketing-spend', payload, SILENT_MUTATION);
  return data;
}

export async function updateMarketingSpend(id, payload) {
  const { data } = await API.put(`/marketing-spend/${id}`, payload, SILENT_MUTATION);
  return data;
}

export async function deleteMarketingSpend(id) {
  const { data } = await API.delete(`/marketing-spend/${id}`, SILENT_MUTATION);
  return data;
}
