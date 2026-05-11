import api from './api';

// ============================================================================
// Knowledge Tree API client — Phase 5
//
// BE endpoints: /api/knowledge-trees/* (require JWT, workspace membership).
// Server interceptor da unwrap response.data -> caller nhan trang trang content.
// ============================================================================

/**
 * Trigger async extraction. Block 30 phut tren server -> return 202 + taskId
 * ngay lap tuc. FE poll status qua getTaskStatusByTaskId tu MaterialAPI cu
 * (same task_status pattern voi material upload).
 */
export const extractAndPersistKnowledgeTree = async (materialId) => {
  const response = await api.post(`/knowledge-trees/extract-and-persist/${materialId}`);
  return response;
};

/**
 * GET tree + flat node list. FE render hierarchy bang parent_node_id.
 * Response: { tree: KnowledgeTree, nodes: KnowledgeNode[] }
 */
export const getKnowledgeTree = async (materialId) => {
  const response = await api.get(`/knowledge-trees/material/${materialId}`);
  return response;
};

/**
 * GET tree summary (counts + status + extractedAt). FE preload truoc khi load
 * full tree de show skeleton hoac trigger extraction neu chua co.
 */
export const getKnowledgeTreeSummary = async (materialId) => {
  const response = await api.get(`/knowledge-trees/material/${materialId}/summary`);
  return response;
};

/**
 * Toggle 1 node enabled state. Khong dong vao subtree.
 */
export const toggleNode = async (nodeId, enabled) => {
  const response = await api.patch(
    `/knowledge-trees/nodes/${nodeId}/toggle`,
    null,
    { params: { enabled } }
  );
  return response;
};

/**
 * Toggle 1 branch + tat ca descendant qua recursive CTE o BE. Click 1 branch
 * disable ca subtree (branch + leaves con).
 */
export const toggleSubtree = async (nodeId, enabled) => {
  const response = await api.patch(
    `/knowledge-trees/nodes/${nodeId}/toggle-subtree`,
    null,
    { params: { enabled } }
  );
  return response;
};
