export function normalizeAiBaseURL(endpoint, azure = false) {
  const baseURL = String(endpoint || '').trim().replace(/\/+$/, '');
  if (!baseURL) return baseURL;
  if (azure && !/\/openai\/v1$/i.test(baseURL)) return `${baseURL}/openai/v1`;
  return baseURL;
}
