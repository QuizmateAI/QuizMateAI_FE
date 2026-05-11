import { useCallback, useMemo, useEffect } from 'react';
import ReactFlow, {
  Background,
  Controls,
  MiniMap,
  useNodesState,
  useEdgesState,
} from 'reactflow';
import dagre from 'dagre';
import 'reactflow/dist/style.css';

// ============================================================================
// TreeViewer — render cay kien thuc qua React Flow + dagre auto-layout.
//
// Input: nodes[] flat (BRANCH | LEAF) + parent_node_id self-ref. Build edge
// list tu parent_node_id, run dagre layout (top-bottom), feed React Flow.
// ============================================================================

const NODE_WIDTH = 220;
const BRANCH_HEIGHT = 70;
const LEAF_HEIGHT = 95;

function layoutWithDagre(rfNodes, rfEdges) {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  // Top-Bottom layout: branches (depth 0) o tren, leaves (depth 1) o duoi.
  // nodesep tang de tranh leaves chong cheo khi nhieu sibling (1 branch 10+ leaves).
  // ranksep tang de tach hang branch va hang leaf ro hon.
  g.setGraph({ rankdir: 'TB', nodesep: 30, ranksep: 100, marginx: 40, marginy: 40 });

  rfNodes.forEach((node) => {
    g.setNode(node.id, {
      width: NODE_WIDTH,
      height: node.data?.nodeType === 'LEAF' ? LEAF_HEIGHT : BRANCH_HEIGHT,
    });
  });
  rfEdges.forEach((edge) => g.setEdge(edge.source, edge.target));

  dagre.layout(g);

  return rfNodes.map((node) => {
    const pos = g.node(node.id);
    return {
      ...node,
      position: { x: pos.x - NODE_WIDTH / 2, y: pos.y - (node.data?.nodeType === 'LEAF' ? LEAF_HEIGHT : BRANCH_HEIGHT) / 2 },
    };
  });
}

function nodeStyle(node) {
  const isLeaf = node.data?.nodeType === 'LEAF';
  const enabled = node.data?.isEnabled !== false;
  const base = {
    padding: 10,
    borderRadius: 8,
    fontSize: 12,
    width: NODE_WIDTH,
    border: '1px solid',
    cursor: 'pointer',
    transition: 'all 0.2s',
    opacity: enabled ? 1 : 0.45,
  };
  if (isLeaf) {
    return {
      ...base,
      background: '#fef9f0',
      borderColor: enabled ? '#f59e0b' : '#fcd34d',
      color: '#78350f',
    };
  }
  return {
    ...base,
    background: '#e0f2fe',
    borderColor: enabled ? '#0284c7' : '#7dd3fc',
    color: '#075985',
    fontWeight: 600,
  };
}

function buildNodeLabel(node) {
  const title = node.title || '(untitled)';
  const isLeaf = node.nodeType === 'LEAF';
  const pageBadge = node.pageStart === node.pageEnd
    ? `trang ${node.pageStart}`
    : `trang ${node.pageStart}-${node.pageEnd}`;

  if (isLeaf) {
    const typeBadge = node.leafType && node.leafType !== 'OTHER' ? node.leafType : null;
    return (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
        <div style={{ fontWeight: 600, lineHeight: 1.2 }}>{title}</div>
        <div style={{ display: 'flex', gap: 6, fontSize: 10, color: '#92400e' }}>
          <span>📄 {pageBadge}</span>
          {typeBadge && <span style={{ background: '#fed7aa', padding: '0 6px', borderRadius: 4 }}>{typeBadge}</span>}
        </div>
      </div>
    );
  }
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
      <div style={{ fontWeight: 700, lineHeight: 1.2 }}>{title}</div>
      <div style={{ fontSize: 10, color: '#0369a1' }}>📚 {pageBadge}</div>
    </div>
  );
}

export default function TreeViewer({ nodes, onNodeClick, onNodeToggle }) {
  const initialFlowData = useMemo(() => {
    if (!nodes || nodes.length === 0) return { rfNodes: [], rfEdges: [] };

    const rfNodes = nodes.map((node) => ({
      id: String(node.nodeId),
      data: { ...node, label: buildNodeLabel(node) },
      style: nodeStyle({ data: node }),
      position: { x: 0, y: 0 }, // dagre will reassign
    }));

    // BE return parentNodeId (qua @JsonProperty getter) — old field parentNode bi @JsonIgnore.
    const rfEdges = nodes
      .filter((node) => node.parentNodeId != null)
      .map((node) => ({
        id: `e-${node.parentNodeId}-${node.nodeId}`,
        source: String(node.parentNodeId),
        target: String(node.nodeId),
        type: 'smoothstep',
        animated: false,
        style: { stroke: '#94a3b8', strokeWidth: 1.5 },
      }));

    const laidOut = layoutWithDagre(rfNodes, rfEdges);
    return { rfNodes: laidOut, rfEdges };
  }, [nodes]);

  const [rfNodes, setRfNodes, onNodesChange] = useNodesState(initialFlowData.rfNodes);
  const [rfEdges, setRfEdges, onEdgesChange] = useEdgesState(initialFlowData.rfEdges);

  // Re-layout when source nodes change (toggle, refresh)
  useEffect(() => {
    setRfNodes(initialFlowData.rfNodes);
    setRfEdges(initialFlowData.rfEdges);
  }, [initialFlowData, setRfNodes, setRfEdges]);

  const handleNodeClick = useCallback((_event, node) => {
    if (onNodeClick) onNodeClick(node.data);
  }, [onNodeClick]);

  const handleNodeDoubleClick = useCallback((_event, node) => {
    if (onNodeToggle) onNodeToggle(node.data);
  }, [onNodeToggle]);

  if (!nodes || nodes.length === 0) {
    return (
      <div className="flex items-center justify-center h-full text-slate-500">
        Chưa có cây kiến thức.
      </div>
    );
  }

  return (
    <div style={{ width: '100%', height: '100%', minHeight: 500 }}>
      <ReactFlow
        nodes={rfNodes.map(n => ({ ...n, data: { ...n.data, label: buildNodeLabel(n.data) }, style: nodeStyle(n) }))}
        edges={rfEdges}
        onNodesChange={onNodesChange}
        onEdgesChange={onEdgesChange}
        onNodeClick={handleNodeClick}
        onNodeDoubleClick={handleNodeDoubleClick}
        nodesDraggable={false}
        fitView
        fitViewOptions={{ padding: 0.2, minZoom: 0.05, maxZoom: 1.5 }}
        minZoom={0.05}
        maxZoom={2}
        attributionPosition="bottom-left"
      >
        <Background gap={16} size={1} color="#e2e8f0" />
        <Controls showInteractive={false} />
        <MiniMap
          nodeColor={(n) => (n.data?.nodeType === 'LEAF' ? '#fbbf24' : '#0ea5e9')}
          maskColor="rgba(241, 245, 249, 0.6)"
          style={{ background: '#f8fafc' }}
        />
      </ReactFlow>
    </div>
  );
}
