import React from 'react';
import { fireEvent, render, screen, waitFor } from '@testing-library/react';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import i18n from '@/i18n';
import RoadmapConfigEditDialog from '@/Components/workspace/RoadmapConfigEditDialog';

describe('RoadmapConfigEditDialog', () => {
  beforeEach(() => {
    window.localStorage.setItem('app_language', 'vi');
    i18n.changeLanguage('vi');
  });

  it('shows the warning confirm when a roadmap already exists and only saves after the second confirmation', async () => {
    const onOpenChange = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <RoadmapConfigEditDialog
        open
        onOpenChange={onOpenChange}
        isDarkMode={false}
        hasExistingRoadmap
        initialValues={{
          knowledgeLoad: 'FULL',
          adaptationMode: 'STRICT',
          speedMode: 'MEDIUM',
          estimatedTotalDays: 45,
          estimatedMinutesPerDay: 90,
        }}
        onSave={onSave}
      />
    );

    expect(screen.getByRole('heading', { name: 'Chỉnh sửa lộ trình', level: 3 })).toBeInTheDocument();
    expect(screen.getAllByText(/cập nhật lượng kiến thức, nhịp học, số ngày dự kiến/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /lưu thay đổi/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: 'Bạn đang có lộ trình đang sử dụng' })).toBeInTheDocument();
    expect(screen.getByText(/nếu cập nhật, lộ trình đang sử dụng sẽ bị mất đi/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /xác nhận cập nhật/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        workspacePurpose: 'STUDY_NEW',
        enableRoadmap: true,
        knowledgeLoad: 'ADVANCED',
        adaptationMode: 'BALANCED',
        roadmapSpeedMode: 'STANDARD',
        estimatedTotalDays: 45,
        recommendedMinutesPerDay: 90,
      });
    });

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('supports setup mode with setup-specific copy', async () => {
    const onOpenChange = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);

    render(
      <RoadmapConfigEditDialog
        open
        onOpenChange={onOpenChange}
        isDarkMode={false}
        mode="setup"
        hasExistingRoadmap={false}
        initialValues={{}}
        onSave={onSave}
      />
    );

    expect(screen.getByRole('heading', { name: 'Thiết lập lộ trình', level: 3 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^thiết lập lộ trình$/i }));

    expect(screen.getByRole('heading', { name: 'Xác nhận thiết lập lộ trình' })).toBeInTheDocument();
    expect(screen.getByText('Bạn có chắc chắn muốn lưu cấu hình lộ trình này cho nhóm không?')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^xác nhận thiết lập$/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        workspacePurpose: 'STUDY_NEW',
        enableRoadmap: true,
        knowledgeLoad: 'BASIC',
        adaptationMode: 'BALANCED',
        roadmapSpeedMode: 'STANDARD',
        estimatedTotalDays: 30,
        recommendedMinutesPerDay: 60,
      });
    });

    await waitFor(() => {
      expect(onOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('blocks save and shows inline validation when required roadmap numbers are cleared', () => {
    const onOpenChange = vi.fn();
    const onSave = vi.fn();

    render(
      <RoadmapConfigEditDialog
        open
        onOpenChange={onOpenChange}
        isDarkMode={false}
        mode="setup"
        hasExistingRoadmap={false}
        initialValues={{}}
        onSave={onSave}
      />
    );

    const roadmapNumberInputs = screen.getAllByRole('spinbutton');
    fireEvent.change(roadmapNumberInputs[0], { target: { value: '' } });
    fireEvent.change(roadmapNumberInputs[1], { target: { value: '' } });

    fireEvent.click(screen.getByRole('button', { name: /^thiết lập lộ trình$/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: 'Xác nhận thiết lập lộ trình' })).not.toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập số ngày dự kiến lớn hơn 0.')).toBeInTheDocument();
    expect(screen.getByText('Vui lòng nhập số phút học mỗi ngày lớn hơn 0.')).toBeInTheDocument();
  });
});
