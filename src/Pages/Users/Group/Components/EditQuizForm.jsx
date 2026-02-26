// Re-export EditQuizForm gốc với contextType mặc định là "GROUP"
import React from "react";
import EditQuizFormBase from "@/Pages/Users/Individual/Workspace/Components/EditQuizForm";

function EditQuizForm(props) {
  return <EditQuizFormBase {...props} contextType="GROUP" />;
}

export default EditQuizForm;
