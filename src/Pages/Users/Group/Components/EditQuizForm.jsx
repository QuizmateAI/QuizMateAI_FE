// Re-export EditQuizForm gốc với contextType mặc định là "GROUP".
// Với quiz thủ công (MANUAL hoặc MANUAL_FROM_AI) đang DRAFT → route sang ManualQuizWizard
// để leader chỉnh sửa theo bulk flow (BE updateManualBulk đã chấp nhận cả hai createVia).
import React from "react";
import EditQuizFormBase from "@/Pages/Users/Individual/Workspace/Components/EditQuizForm";
import ManualQuizWizard from "@/Pages/Users/Individual/Workspace/Components/ManualQuizWizard";

const BULK_EDITABLE_CREATE_VIAS = new Set(["MANUAL", "MANUAL_FROM_AI"]);

function EditQuizForm(props) {
  const { quiz, contextId, isDarkMode, onBack, onSave } = props;
  const createVia = String(quiz?.createVia || "").toUpperCase();
  const status = String(quiz?.status || "").toUpperCase();
  const canBulkEdit = BULK_EDITABLE_CREATE_VIAS.has(createVia) && status === "DRAFT";

  if (canBulkEdit && quiz?.quizId) {
    return (
      <ManualQuizWizard
        workspaceId={contextId}
        contextType="GROUP"
        editingQuizId={quiz.quizId}
        onSaveQuiz={onSave}
        onBack={onBack}
        isDarkMode={isDarkMode}
      />
    );
  }

  return <EditQuizFormBase {...props} contextType="GROUP" />;
}

export default EditQuizForm;
