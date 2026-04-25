import React from 'react';
import { render, screen, fireEvent } from '@testing-library/react';
import { describe, it, expect, vi } from 'vitest';
import WorkspaceProfileStepUpload from '@/pages/Users/Individual/Workspace/Components/WorkspaceProfileWizard/WorkspaceProfileStepUpload';

describe('WorkspaceProfileStepUpload', () => {
  it('TC-W03 (adapted): forwards selected files to the upload queue callback', () => {
    const onAddFiles = vi.fn();

    render(
      <WorkspaceProfileStepUpload
        t={(key) => key}
        language="en"
        isDarkMode={false}
        values={{
          knowledgeInput: 'React hooks',
          inferredDomain: 'React',
          currentLevel: 'Beginner',
          learningGoal: 'Build a learning roadmap',
          strongAreas: '',
          weakAreas: '',
          mockExamName: '',
        }}
        errors={{}}
        pendingFiles={[]}
        uploadedMaterials={[]}
        onAddFiles={onAddFiles}
        onRemovePendingFile={vi.fn()}
      />
    );

    const file = new File(['pdf-content'], 'react-roadmap.pdf', { type: 'application/pdf' });
    fireEvent.change(screen.getByLabelText(/choose materials to upload/i), {
      target: { files: [file] },
    });

    expect(onAddFiles).toHaveBeenCalledTimes(1);
    expect(onAddFiles.mock.calls[0][0]).toHaveLength(1);
    expect(onAddFiles.mock.calls[0][0][0]).toMatchObject({
      name: 'react-roadmap.pdf',
      type: 'application/pdf',
    });
  });
});
