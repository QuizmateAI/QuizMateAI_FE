import api from './api';

// Domain/Knowledge/Scheme/Level config đã được loại bỏ.
// Giữ file trống để tránh lỗi import từ các component còn tham chiếu.
// Các API dưới đây sẽ trả về empty - không gọi backend.

const DEFAULT_PAGE = 0;
const DEFAULT_SIZE = 100;

const emptyResponse = (data = []) => ({ data: data ?? [], status: 200 });

export const getActiveDomains = async () => emptyResponse([]);
export const getAllDomains = async () => emptyResponse({ content: [] });
export const createDomain = async () => ({ data: null });
export const updateDomain = async () => ({ data: null });
export const deleteDomain = async () => ({ data: null });

export const getKnowledgeByDomainId = async () => emptyResponse([]);
export const getAllKnowledge = async () => emptyResponse({ content: [] });
export const createKnowledge = async () => ({ data: null });
export const updateKnowledge = async () => ({ data: null });
export const deleteKnowledge = async () => ({ data: null });

export const getSchemesByKnowledgeId = async () => emptyResponse([]);
export const getAllSchemes = async () => emptyResponse({ content: [] });
export const createScheme = async () => ({ data: null });
export const updateScheme = async () => ({ data: null });
export const deleteScheme = async () => ({ data: null });

export const getLevelsByKnowledgeId = async () => emptyResponse([]);
export const getLevelsBySchemeId = async () => emptyResponse([]);
export const getAllLevels = async () => emptyResponse({ content: [] });
export const createLevel = async () => ({ data: null });
export const updateLevel = async () => ({ data: null });
export const deleteLevel = async () => ({ data: null });
