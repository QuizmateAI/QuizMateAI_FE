import { useMemo } from "react";
import { useQuery } from "@tanstack/react-query";
import { useNavigate } from "react-router-dom";
import { Network, Sparkles } from "lucide-react";

import { getDocumentSections } from "@/api/MaterialAPI";

const VARIANT = {
  primary: "bg-sky-600 text-white hover:bg-sky-700",
  secondary: "border border-slate-200 bg-slate-100 text-slate-700 hover:bg-slate-200",
  disabled: "cursor-not-allowed bg-slate-100 text-slate-400",
};

function normalizeSections(response) {
  const data = response?.data ?? response ?? [];
  return Array.isArray(data) ? data : [];
}

function countSections(nodes) {
  return (Array.isArray(nodes) ? nodes : []).reduce(
    (total, node) => total + 1 + countSections(node?.children),
    0,
  );
}

function countChunks(nodes) {
  return (Array.isArray(nodes) ? nodes : []).reduce((total, node) => {
    const own = Array.isArray(node?.chunkIds) ? node.chunkIds.length : 0;
    return total + own + countChunks(node?.children);
  }, 0);
}

export default function KnowledgeTreeButton({ materialId, size = "sm", className = "" }) {
  const navigate = useNavigate();

  const sectionsQuery = useQuery({
    queryKey: ["documentSectionsKnowledgeTreeSummary", materialId],
    queryFn: () => getDocumentSections(materialId),
    enabled: Boolean(materialId),
    retry: (failureCount, error) => {
      if (error?.response?.status === 404) return false;
      return failureCount < 1;
    },
    staleTime: 30_000,
  });

  const sections = useMemo(() => normalizeSections(sectionsQuery.data), [sectionsQuery.data]);
  const sectionCount = useMemo(() => countSections(sections), [sections]);
  const chunkCount = useMemo(() => countChunks(sections), [sections]);

  const hasTree = sectionCount > 0;
  const variant = sectionsQuery.isLoading ? "disabled" : hasTree ? "secondary" : "primary";
  const Icon = hasTree ? Network : Sparkles;
  const label = sectionsQuery.isLoading
    ? "Dang tai cay..."
    : hasTree
      ? `Xem cay (${sectionCount} muc)`
      : "Xem cay kien thuc";

  const sizeClass = size === "xs"
    ? "gap-1 px-2 py-1 text-xs"
    : "gap-1.5 px-3 py-1.5 text-sm";

  const handleClick = () => {
    if (variant === "disabled") return;
    navigate(`/knowledge-trees/material/${materialId}`);
  };

  if (!materialId) return null;

  return (
    <button
      type="button"
      onClick={handleClick}
      disabled={variant === "disabled"}
      className={`inline-flex items-center rounded-md font-medium transition ${sizeClass} ${VARIANT[variant]} ${className}`}
      title={hasTree ? `Document sections: ${sectionCount} muc, ${chunkCount} chunk` : label}
    >
      <Icon className={size === "xs" ? "h-3 w-3" : "h-4 w-4"} />
      <span>{label}</span>
    </button>
  );
}
