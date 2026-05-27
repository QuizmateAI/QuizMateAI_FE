import { useNavigate, useParams } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

import EmbeddedKnowledgeTree from "@/components/material/EmbeddedKnowledgeTree";

export default function KnowledgeTreePage() {
  const { materialId } = useParams();
  const navigate = useNavigate();

  return (
    <div className="flex h-screen flex-col bg-slate-50">
      <header className="flex items-center justify-between border-b bg-white px-6 py-3">
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate(-1)}
            className="flex items-center gap-1 text-sm text-slate-600 hover:text-slate-900"
          >
            <ArrowLeft size={16} /> Quay lai
          </button>
          <div className="h-6 w-px bg-slate-200" />
          <h1 className="text-lg font-semibold text-slate-800">
            Cay kien thuc
            <span className="ml-2 text-xs text-slate-400">Material #{materialId}</span>
          </h1>
        </div>
      </header>

      <main className="min-h-0 flex-1 overflow-hidden">
        <EmbeddedKnowledgeTree materialId={materialId} />
      </main>
    </div>
  );
}
