export const unwrapApiData = (response) => response?.data?.data ?? response?.data ?? response ?? null;

export const unwrapApiList = (response) => {
  const payload = unwrapApiData(response);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  return [];
};
