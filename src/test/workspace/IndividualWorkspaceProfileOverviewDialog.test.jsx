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
    expect(screen.getByRole('heading', { name: /tóm tắt không gian học tập/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /điểm mạnh và điểm cần cải thiện/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /cấu hình lộ trình/i })).toBeInTheDocument();
    expect(screen.getAllByText(/IELTS Writing/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText('Mock test').length).toBeGreaterThan(0);
    expect(screen.getAllByText(/IELTS 6\.0/i).length).toBeGreaterThan(0);
    expect(screen.getAllByText(/90 phút\/ngày/i).length).toBeGreaterThan(0);
    expect(screen.getByText(/doc de nhanh/i)).toBeInTheDocument();
    expect(screen.getByText(/task response/i)).toBeInTheDocument();
    expect(screen.getByText(/bám sát|linh hoạt/i)).toBeInTheDocument();
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

  it('summarizes long strong and weak labels for display', () => {
    render(
      <IndividualWorkspaceProfileOverviewDialog
        open
        onOpenChange={() => {}}
        isDarkMode={false}
        profile={{
          workspaceSetupStatus: 'DONE',
          onboardingCompleted: true,
          workspacePurpose: 'STUDY_NEW',
          learningGoal: 'Nắm chắc số đếm và phép cộng',
          strongAreas: 'Độ Chính Xác 100% Trên Toàn Bộ Đề (12/12) • Khả Năng Làm Nhanh Và Đúng Ở Nhiều Dạng Câu Hỏi',
          weakAreas: 'Chưa Có Nhiều Lần Kiểm Tra Để Khẳng Định Độ Bền Lâu Dài • Xử lý giá trị hàng phức tạp',
        }}
        materials={[]}
      />
    );

    expect(screen.getByText('Độ Chính Xác 100% • Khả Năng Làm Nhanh')).toBeInTheDocument();
    expect(screen.getByText('Xử lý giá trị hàng phức tạp')).toBeInTheDocument();
    expect(screen.queryByText(/Chưa Có Nhiều Lần Kiểm Tra/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Khả Năng Làm Nhanh Và Đúng Ở Nhiều Dạng Câu Hỏi/i)).not.toBeInTheDocument();
  });

  it('keeps roadmap overview labels and adaptation value aligned with the config step', () => {
    render(
      <IndividualWorkspaceProfileOverviewDialog
        open
        onOpenChange={() => {}}
        isDarkMode={false}
        profile={{
          workspaceSetupStatus: 'DONE',
          onboardingCompleted: true,
          workspacePurpose: 'STUDY_NEW',
          knowledgeLoad: 'BASIC',
          adaptationMode: 'STRICT',
          roadmapSpeedMode: 'STANDARD',
          estimatedTotalDays: 30,
          recommendedMinutesPerDay: 60,
        }}
        materials={[]}
      />
    );

    expect(screen.getByText(i18n.t('workspace.profileConfig.fields.knowledgeLoad'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('workspace.profileConfig.fields.adaptationMode'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('workspace.profileConfig.fields.roadmapSpeedMode'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('workspace.profileConfig.fields.estimatedTotalDays'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('workspace.profileConfig.fields.recommendedMinutesPerDay'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('workspace.profileConfig.knowledgeLoad.BASIC.title'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('workspace.profileConfig.adaptationMode.BALANCED.title'))).toBeInTheDocument();
    expect(screen.getByText(i18n.t('workspace.profileConfig.roadmapSpeedMode.STANDARD.title'))).toBeInTheDocument();
    expect(screen.getByText(/30 ngày/i)).toBeInTheDocument();
    expect(screen.getAllByText(/60 phút\/ngày/i).length).toBeGreaterThan(0);
    expect(screen.queryByText(/bám sát/i)).not.toBeInTheDocument();
  });

  it('keeps the dialog focused on workspace config even when personalization data is provided', () => {
    render(
      <IndividualWorkspaceProfileOverviewDialog
        open
        onOpenChange={() => {}}
        isDarkMode={false}
        profile={{
          workspaceSetupStatus: 'DONE',
          onboardingCompleted: true,
          workspacePurpose: 'STUDY_NEW',
          inferredDomain: 'IELTS Writing',
          knowledgeInput: 'IELTS Writing task 2',
          currentLevel: 'IELTS 6.0',
          learningGoal: 'Củng cố coherence và giữ nhịp học đều',
          strongAreas: 'Task response',
          weakAreas: 'Cohesion',
          knowledgeLoad: 'ADVANCED',
          roadmapSpeedMode: 'STANDARD',
          adaptationMode: 'FLEXIBLE',
          estimatedTotalDays: 45,
          estimatedMinutesPerDay: 90,
          roadmapEnabled: true,
        }}
        personalization={{
          nextActionType: 'REVIEW_WEAK_TOPIC',
          targetDifficulty: 'MEDIUM',
          profileReadiness: {
            completedQuizCount: 2,
            targetQuizCount: 3,
            remainingQuizCount: 1,
            summary: 'Đã có 2/3 quiz. Làm thêm 1 bài nữa để profile ổn định hơn.',
          },
          weakAreas: ['Cohesion', 'Linking words'],
          strongAreas: ['Task response'],
          nextQuizPlan: {
            displayReason: 'Hệ thống ưu tiên quiz review để khóa lại lỗi lặp.',
          },
          learnerExplanation: {
            whyThisQuiz: 'Hệ thống ưu tiên quiz review để khóa lại lỗi lặp.',
            whatToStudyNext: 'Ôn lại cohesion và cách nối luận điểm.',
            reviewOrLevelUp: 'Nên review trước khi tăng độ khó.',
            roadmapOrMock: 'Quay lại roadmap sau khi xong review queue.',
          },
          roadmapGuidance: {
            recommendedSpeedMode: 'SLOW',
            recommendedAdaptationMode: 'FLEXIBLE',
            nextRoadmapAction: 'Review lại phase hiện tại',
            summary: 'Nên giảm nhịp roadmap để ưu tiên review chủ đề yếu.',
          },
          shortTermGoals: [
            {
              title: 'Củng cố Cohesion',
              detail: 'Hoàn thành 1 quiz review ngắn hôm nay.',
            },
          ],
          reviewQueue: [
            {
              topic: 'Cohesion',
              priority: 'HIGH',
              dueAt: '2026-04-01T09:00:00',
              reason: 'Ôn lại sớm để giảm lỗi lặp.',
            },
          ],
          communityQuizSuggestions: [
            {
              quizId: 88,
              title: 'Community quiz cohesion basics',
              overallDifficulty: 'EASY',
            },
          ],
        }}
        materials={[]}
      />
    );

    expect(screen.getByRole('heading', { name: /tóm tắt không gian học tập/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /điểm mạnh và điểm cần cải thiện/i })).toBeInTheDocument();
    expect(screen.getByRole('heading', { name: /cấu hình lộ trình/i })).toBeInTheDocument();
    expect(screen.getByText('Củng cố coherence và giữ nhịp học đều')).toBeInTheDocument();
    expect(screen.getByText('Task response')).toBeInTheDocument();
    expect(screen.getByText('Cohesion')).toBeInTheDocument();
    expect(screen.queryByRole('heading', { name: /hành động cá nhân hóa tiếp theo/i })).not.toBeInTheDocument();
    expect(screen.queryByText('Community quiz cohesion basics')).not.toBeInTheDocument();
    expect(screen.queryByText('Ôn lại chủ đề yếu')).not.toBeInTheDocument();
  });
});
