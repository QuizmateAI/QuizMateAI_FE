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

export const updateMaterialNote = async (noteId, payload) => {
  const response = await api.put(`/material-notes/${noteId}`, payload);
  return response;
};

export const deleteMaterialNote = async (noteId) => {
  const response = await api.delete(`/material-notes/${noteId}`);
  return response;
};
