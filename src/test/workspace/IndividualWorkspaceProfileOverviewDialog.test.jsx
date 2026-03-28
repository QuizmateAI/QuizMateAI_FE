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
          workspaceSetupStatus: 'DONE',
          currentStep: 3,
          onboardingCompleted: true,
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
          knowledgeLoad: 'ADVANCED',
          adaptationMode: 'FLEXIBLE',
          roadmapSpeedMode: 'STANDARD',
          estimatedTotalDays: 45,
          estimatedMinutesPerDay: 90,
          roadmapEnabled: true,
        }}
        materials={[
          { id: 1, name: 'ielts-writing-notes.pdf', status: 'ACTIVE' },
          { id: 2, name: 'sample-essay.docx', status: 'PROCESSING' },
        ]}
      />
    );

    expect(screen.getByRole('heading', { name: /tổng quan thiết lập không gian học tập/i })).toBeInTheDocument();
    expect(screen.getAllByText('Mục tiêu học tập').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Hồ sơ cá nhân').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Cấu hình lộ trình').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IELTS Writing task 2').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IELTS Writing').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Mock test').length).toBeGreaterThan(0);
    expect(screen.getAllByText('IELTS 6.0').length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /bối cảnh của bạn/i })).toBeInTheDocument();
    expect(screen.getAllByText('Doc de nhanh').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Task response').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Nâng cao').length).toBeGreaterThan(0);
    expect(screen.getAllByText('Tiêu chuẩn').length).toBeGreaterThan(0);
    expect(screen.getAllByText('45 ngày').length).toBeGreaterThan(0);
    expect(screen.getAllByText('90 phút/ngày').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/đã hoàn tất/i).length).toBeGreaterThan(0);
    expect(screen.getByRole('heading', { name: /tóm tắt không gian học tập/i })).toBeInTheDocument();
    expect(screen.getByText(/sẵn sàng sử dụng/i)).toBeInTheDocument();
    expect(screen.queryByText(/mô tả chi tiết knowledge/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/trạng thái tài liệu/i)).not.toBeInTheDocument();
    expect(screen.queryByText('DONE')).not.toBeInTheDocument();
  });

  it('renders the update onboarding action when edit handler is provided', () => {
    render(
      <IndividualWorkspaceProfileOverviewDialog
        open
        onOpenChange={() => {}}
        isDarkMode={false}
        profile={{
          workspaceSetupStatus: 'DONE',
          onboardingCompleted: true,
          workspacePurpose: 'STUDY_NEW',
        }}
        materials={[]}
        onEditProfile={() => {}}
      />
    );

    expect(screen.getByRole('button', { name: /chỉnh sửa/i })).toBeInTheDocument();
  });
});
