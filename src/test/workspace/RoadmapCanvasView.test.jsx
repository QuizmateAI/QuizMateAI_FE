import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import RoadmapCanvasView from '@/Pages/Users/Individual/Workspace/Components/RoadmapCanvasView';
import { getRoadmapGraph } from '@/api/RoadmapAPI';

vi.mock('@/api/RoadmapAPI', () => ({
  getRoadmapGraph: vi.fn(),
}));

describe('RoadmapCanvasView', () => {
  beforeEach(async () => {
    getRoadmapGraph.mockResolvedValue({ data: { data: null } });
    window.localStorage.clear();
    window.localStorage.setItem('app_language', 'vi');
    await i18n.changeLanguage('vi');
  });

  it('renders custom empty-state copy and roadmap config actions', async () => {
    const onEmptyStateAction = vi.fn();
    const onViewRoadmapConfig = vi.fn();
    const onEditRoadmapConfig = vi.fn();

    render(
      <RoadmapCanvasView
        isDarkMode={false}
        workspaceId={321}
        onEmptyStateAction={onEmptyStateAction}
        onViewRoadmapConfig={onViewRoadmapConfig}
        onEditRoadmapConfig={onEditRoadmapConfig}
        emptyStateTitle="Bạn hãy thiết lập lộ trình cho nhóm"
        emptyStateDescription="Thiết lập trước lượng kiến thức và nhịp học cho nhóm."
        emptyStateActionLabel="Thiết lập lộ trình"
      />
    );

    await waitFor(() => {
      expect(screen.getByText('Bạn hãy thiết lập lộ trình cho nhóm')).toBeInTheDocument();
    });

    expect(screen.getByText('Thiết lập trước lượng kiến thức và nhịp học cho nhóm.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: 'Xem cấu hình' }));
    expect(onViewRoadmapConfig).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Chỉnh sửa' }));
    expect(onEditRoadmapConfig).toHaveBeenCalledTimes(1);

    fireEvent.click(screen.getByRole('button', { name: 'Thiết lập lộ trình' }));
    expect(onEmptyStateAction).toHaveBeenCalledTimes(1);
  });
});
