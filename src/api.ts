export type ApiError = Error & {
  status?: number;
  response?: { data?: { error?: string; code?: string; [key: string]: unknown } };
};

async function request(path: string, options: RequestInit = {}) {
  const response = await fetch(path, {
    credentials: 'same-origin',
    ...options,
    headers: {
      ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      ...(options.headers || {}),
    },
  });
  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    const error = new Error(data.error || `Request failed (${response.status})`) as ApiError;
    error.status = response.status;
    error.response = { data };
    throw error;
  }
  return { data };
}

export const api = {
  get(path: string) { return request(path); },
  post(path: string, body: Record<string, unknown> = {}) {
    return request(path, { method: 'POST', body: JSON.stringify(body) });
  },
  patch(path: string, body: Record<string, unknown>) {
    return request(path, { method: 'PATCH', body: JSON.stringify(body) });
  },
};
