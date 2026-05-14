import { useCallback, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Loader2, ArrowLeft, RefreshCw } from 'lucide-react';

import {
  extractAndPersistKnowledgeTree,
  getKnowledgeTree,
  toggleNode,
  toggleSubtree,
} from '@/api/KnowledgeTreeAPI';
import TreeViewer from '@/components/knowledgeTree/TreeViewer';
import ExtractionStatus from '@/components/knowledgeTree/ExtractionStatus';
import ObservabilityPanel from '@/components/knowledgeTree/ObservabilityPanel';
import LeafDetail from '@/components/knowledgeTree/LeafDetail';

// ============================================================================
// KnowledgeTreePage — main route /knowledge-trees/material/:materialId.
//
// Flow:
//   1. Mount -> getKnowledgeTree(materialId). 404 -> show "Build Knowledge Tree" CTA.
//   2. Click CTA -> extractAndPersistKnowledgeTree -> taskId.
//      ExtractionStatus poll task progress; on SUCCESS -> refetch tree.
//   3. Tree loaded -> TreeViewer (React Flow). Click node -> LeafDetail panel.
//      Double-click hoac button trong panel -> toggle node / subtree.
//
// ObservabilityPanel show extraction model + counts + status — hoi dong yeu cau.
// ============================================================================

export default function KnowledgeTreePage() {
  const { materialId } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [taskId, setTaskId] = useState(null);
  const [selectedNode, setSelectedNode] = useState(null);

  const treeQuery = useQuery({
    queryKey: ['knowledgeTree', materialId],
    queryFn: () => getKnowledgeTree(materialId),
    enabled: Boolean(materialId),
    retry: (failureCount, error) => {
      // Khong retry 404 — material chua co tree
      if (error?.response?.status === 404) return false;
      return failureCount < 2;
    },
  });

  const extractMutation = useMutation({
    mutationFn: () => extractAndPersistKnowledgeTree(materialId),
    onSuccess: (response) => {
      const newTaskId = response?.data?.taskId || response?.taskId;
      if (newTaskId) {
        setTaskId(newTaskId);
      }
    },
  });

  const toggleNodeMutation = useMutation({
    mutationFn: ({ nodeId, enabled }) => toggleNode(nodeId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeTree', materialId] });
    },
  });

  const toggleSubtreeMutation = useMutation({
    mutationFn: ({ nodeId, enabled }) => toggleSubtree(nodeId, enabled),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['knowledgeTree', materialId] });
    },
  });

  const handleExtract = useCallback(() => {
    extractMutation.mutate();
  }, [extractMutation]);

  const handleExtractionComplete = useCallback(() => {
    setTaskId(null);
    queryClient.invalidateQueries({ queryKey: ['knowledgeTree', materialId] });
  }, [queryClient, materialId]);

  const handleExtractionError = useCallback((message) => {
    setTaskId(null);
    console.error('[KnowledgeTree] extraction failed:', message);
  }, []);

  const handleNodeClick = useCallback((nodeData) => {
    setSelectedNode(nodeData);
  }, []);

  const handleToggleEnabled = useCallback((node) => {
    toggleNodeMutation.mutate({ nodeId: node.nodeId, enabled: !node.isEnabled });
    setSelectedNode((prev) => (prev ? { ...prev, isEnabled: !prev.isEnabled } : prev));
  }, [toggleNodeMutation]);

  const handleToggleSubtree = useCallback((node) => {
    toggleSubtreeMutation.mutate({ nodeId: node.nodeId, enabled: !node.isEnabled });
    setSelectedNode((prev) => (prev ? { ...prev, isEnabled: !prev.isEnabled } : prev));
  }, [toggleSubtreeMutation]);

  const tree = treeQuery.data?.tree;
  const nodes = treeQuery.data?.nodes ?? [];
  const treeMissing = treeQuery.error?.response?.status === 404;
  const isExtracting = Boolean(taskId);

  return (
    <div className="flex flex-col h-screen bg-slate-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} /> Quay lại
          </button>
          <div className="h-6 w-px bg-slate-200" />
          <h1 className="text-lg font-semibold text-slate-800">
            Cây kiến thức
            <span className="ml-2 text-xs text-slate-400">Material #{materialId}</span>
          </h1>
        </div>
        <div className="flex items-center gap-2">
          {tree && (
            <button
              type="button"
              onClick={handleExtract}
              disabled={extractMutation.isPending || isExtracting}
              className="flex items-center gap-2 rounded border bg-white px-3 py-1.5 text-sm text-slate-700 hover:bg-slate-100 disabled:opacity-50"
            >
              <RefreshCw size={14} className={extractMutation.isPending ? 'animate-spin' : ''} />
              Re-extract
            </button>
          )}
        </div>
      </header>

      <div className="flex flex-1 overflow-hidden">
        <aside className="w-80 shrink-0 border-r bg-white p-4 overflow-y-auto flex flex-col gap-4">
          <ObservabilityPanel tree={tree} />

          {isExtracting && (
            <ExtractionStatus
              taskId={taskId}
              onComplete={handleExtractionComplete}
              onError={handleExtractionError}
            />
          )}

          {!tree && !isExtracting && (
            <div className="rounded-lg border border-dashed border-slate-300 bg-slate-50 p-4">
              <h3 className="font-semibold text-slate-700 mb-2">
                {treeMissing ? 'Chưa có cây kiến thức' : 'Tạo cây kiến thức'}
              </h3>
              <p className="text-xs text-slate-500 mb-3">
                AI sẽ extract tài liệu thành cấu trúc cây: chương → nhánh → lá kiến thức.
                Quá trình chạy local trên GPU, mất 5-30 phút tùy độ dài.
              </p>
              <button
                type="button"
                onClick={handleExtract}
                disabled={extractMutation.isPending}
                className="w-full rounded bg-sky-600 px-3 py-2 text-sm font-semibold text-white hover:bg-sky-700 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {extractMutation.isPending && <Loader2 className="animate-spin" size={14} />}
                Trích xuất cây kiến thức
              </button>
              {extractMutation.error && (
                <p className="mt-2 text-xs text-red-600">
                  Lỗi: {extractMutation.error?.response?.data?.message || extractMutation.error?.message}
                </p>
              )}
            </div>
          )}

          <div className="rounded-lg border bg-white p-3 text-xs text-slate-500">
            <strong className="text-slate-700">Hướng dẫn:</strong>
            <ul className="mt-1 space-y-1 list-disc pl-4">
              <li>Click node để xem chi tiết</li>
              <li>Double-click node để tắt/bật</li>
              <li>Tắt nhánh — quiz gen sẽ bỏ qua phần đó</li>
            </ul>
          </div>
        </aside>

        <main className="flex-1 relative">
          {treeQuery.isLoading && (
            <div className="flex items-center justify-center h-full text-slate-500 gap-2">
              <Loader2 className="animate-spin" /> Đang tải cây...
            </div>
          )}
          {tree && (
            <TreeViewer
              nodes={nodes}
              onNodeClick={handleNodeClick}
              onNodeToggle={handleToggleEnabled}
            />
          )}
          {!tree && !treeQuery.isLoading && (
            <div className="flex items-center justify-center h-full text-slate-400">
              {isExtracting ? 'Đang extract — xem progress ở panel bên trái' : 'Chưa có cây kiến thức cho tài liệu này'}
            </div>
          )}
        </main>

        {selectedNode && (
          <aside className="w-96 shrink-0 border-l bg-slate-50 p-4 overflow-y-auto">
            <LeafDetail
              node={selectedNode}
              onClose={() => setSelectedNode(null)}
              onToggleEnabled={handleToggleEnabled}
              onToggleSubtree={handleToggleSubtree}
            />
          </aside>
        )}
      </div>
    </div>
  );
}
