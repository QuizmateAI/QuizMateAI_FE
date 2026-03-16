import React from 'react';
import { render, screen } from '@testing-library/react';
import { beforeEach, describe, expect, it } from 'vitest';
import i18n from '@/i18n';
import IndividualWorkspaceProfileOverviewDialog from '@/Pages/Users/Individual/Workspace/Components/IndividualWorkspaceProfileOverviewDialog';

describe('IndividualWorkspaceProfileOverviewDialog', () => {
  beforeEach(() => {
    window.localStorage.setItem('app_language', 'vi');
    i18n.changeLanguage('vi');
  });

  it('renders a separate overview UI with the saved profile data', () => {
    render(
      <IndividualWorkspaceProfileOverviewDialog
        open
        onOpenChange={() => {}}
        isDarkMode={false}
        profile={{
          profileStatus: 'DONE',
          workspacePurpose: 'MOCK_TEST',
          inferredDomain: 'IELTS Writing',
          knowledgeInput: 'IELTS Writing task 2',
          currentLevel: 'IELTS 6.0',
          learningGoal: 'On dinh writing va tang do phan tich de',
          strongAreas: 'Doc de nhanh',
          weakAreas: 'Task response',
          mockExamMode: 'PUBLIC',
          mockExamCatalogId: 'ielts',
          templateFormat: 'FULL_EXAM',
          templateDurationMinutes: 90,
          templateQuestionCount: 60,
          templatePrompt: 'Mo phong de that va co phan nhan xet loi',
          adaptationMode: 'FLEXIBLE',
          roadmapSpeedMode: 'STANDARD',
          estimatedTotalDays: 45,
          recommendedMinutesPerDay: 90,
          roadmapEnabled: true,
        }}
        materials={[
          { id: 1, name: 'ielts-writing-notes.pdf', status: 'ACTIVE' },
          { id: 2, name: 'sample-essay.docx', status: 'PROCESSING' },
        ]}
      />
    );

    expect(screen.getByText('Tổng quan thiết lập workspace')).toBeInTheDocument();
    expect(screen.getAllByText('IELTS Writing task 2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IELTS Writing').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Mock test').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IELTS 6.0').length).toBeGreaterThan(0);
    expect(screen.getAllByText('45 ngày').length).toBeGreaterThan(0);
    expect(screen.getAllByText('90 phút/ngày').length).toBeGreaterThan(0);
    expect(screen.getByText('ielts-writing-notes.pdf, sample-essay.docx')).toBeInTheDocument();
  });
});
