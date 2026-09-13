import API from '../api/axios';
import { buildListParams, unwrapPagination } from '../utils/apiHelpers';

export async function fetchLeads({ endpoint = '/leads', ...params } = {}) {
  const { data } = await API.get(endpoint, {
    params: buildListParams(params),
    skipSuccessToast: true,
  });
  return unwrapPagination(data);
}
