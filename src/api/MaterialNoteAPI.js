import api from "./api";

export const listMaterialNotes = async (materialId, type) => {
  const response = await api.get(`/material-notes/material/${materialId}`, {
    params: type ? { type } : undefined,
  });
  return response;
};

export const createMaterialNote = async (payload) => {
  const response = await api.post("/material-notes", payload);
  return response;
};

// Payload chấp nhận: { title?: string, content?: string, noteType?: string,
//   highlightedText?: string, startOffset?: number, endOffset?: number,
//   pageNumber?: number, topRatio?: number, selectionRects?: Array<{...}> }
export const updateMaterialNote = async (noteId, payload) => {
  const body = sanitizeUpdatePayload(payload);
  const response = await api.put(`/material-notes/${noteId}`, body);
  return response;
};

const UPDATE_NOTE_FIELDS = [
  "title",
  "content",
  "noteType",
  "highlightedText",
  "startOffset",
  "endOffset",
  "pageNumber",
  "topRatio",
  "selectionRects",
];

function sanitizeUpdatePayload(payload) {
  if (!payload || typeof payload !== "object") return {};
  const cleaned = {};
  for (const key of UPDATE_NOTE_FIELDS) {
    if (key in payload) cleaned[key] = payload[key];
  }
  return cleaned;
}

export const deleteMaterialNote = async (noteId) => {
  const response = await api.delete(`/material-notes/${noteId}`);
  return response;
};
