export const unwrapApiData = (response) => {
  let payload = response ?? null;
  const visited = new Set();

  while (payload && typeof payload === 'object' && !Array.isArray(payload) && !visited.has(payload)) {
    visited.add(payload);

    if (payload.data !== undefined) {
      payload = payload.data;
      continue;
    }

    if (payload.result !== undefined) {
      payload = payload.result;
      continue;
    }

    if (payload.payload !== undefined) {
      payload = payload.payload;
      continue;
    }

    break;
  }

  return payload ?? null;
};

export const unwrapApiList = (response) => {
  const payload = unwrapApiData(response);
  if (Array.isArray(payload)) return payload;
  if (Array.isArray(payload?.content)) return payload.content;
  if (Array.isArray(payload?.items)) return payload.items;
  if (Array.isArray(payload?.data)) return payload.data;
  if (Array.isArray(payload?.result)) return payload.result;
  if (Array.isArray(payload?.results)) return payload.results;
  if (Array.isArray(payload?.records)) return payload.records;
  if (Array.isArray(payload?.rows)) return payload.rows;
  if (Array.isArray(payload?.list)) return payload.list;
  if (Array.isArray(payload?.materials)) return payload.materials;
  if (Array.isArray(payload?.roadmaps)) return payload.roadmaps;
  if (Array.isArray(payload?.quizzes)) return payload.quizzes;
  return [];
};
