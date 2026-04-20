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

    expect(screen.getByRole('heading', { name: /chỉnh sửa lộ trình|edit roadmap/i, level: 3 })).toBeInTheDocument();
    expect(screen.getAllByText(/cập nhật lượng kiến thức|update the knowledge amount/i).length).toBeGreaterThan(0);

    fireEvent.click(screen.getByRole('button', { name: /lưu thay đổi|save changes/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.getByRole('heading', { name: /bạn đang có lộ trình đang sử dụng|you already have a roadmap in use/i })).toBeInTheDocument();
    expect(screen.getByText(/nếu cập nhật, lộ trình đang sử dụng sẽ bị mất đi|roadmap currently in use will be removed/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /xác nhận cập nhật|confirm update/i }));

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

    expect(screen.getByRole('heading', { name: /thiết lập lộ trình|set up roadmap/i, level: 3 })).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /^thiết lập lộ trình$|^set up roadmap$/i }));

    expect(screen.getByRole('heading', { name: /xác nhận thiết lập lộ trình|confirm roadmap setup/i })).toBeInTheDocument();
    expect(screen.getByText(/bạn có chắc chắn muốn lưu cấu hình lộ trình này cho workspace này không|save this roadmap configuration for this workspace/i)).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^xác nhận thiết lập$|^confirm setup$/i }));

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

    fireEvent.click(screen.getByRole('button', { name: /^thiết lập lộ trình$|^set up roadmap$/i }));

    expect(onSave).not.toHaveBeenCalled();
    expect(screen.queryByRole('heading', { name: /xác nhận thiết lập lộ trình|confirm roadmap setup/i })).not.toBeInTheDocument();
    expect(screen.getByText(/vui lòng nhập số ngày dự kiến lớn hơn 0|please enter a total number of days greater than 0/i)).toBeInTheDocument();
    expect(screen.getByText(/vui lòng nhập số phút học mỗi ngày lớn hơn 0|please enter a daily study time greater than 0/i)).toBeInTheDocument();
  });

  it('can apply an AI suggestion before saving', async () => {
    const onOpenChange = vi.fn();
    const onSave = vi.fn().mockResolvedValue(undefined);
    const onSuggest = vi.fn().mockResolvedValue({
      knowledgeLoad: 'ADVANCED',
      adaptationMode: 'FLEXIBLE',
      speedMode: 'FAST',
      estimatedTotalDays: 18,
      estimatedMinutesPerDay: 95,
      preLearningRequired: true,
      rationale: 'The group has a clear exam target and can sustain higher daily effort.',
      recommendations: ['Keep one checkpoint every weekend.'],
    });

    render(
      <RoadmapConfigEditDialog
        open
        onOpenChange={onOpenChange}
        isDarkMode={false}
        mode="setup"
        hasExistingRoadmap={false}
        initialValues={{}}
        onSave={onSave}
        onSuggest={onSuggest}
      />
    );

    fireEvent.click(screen.getByRole('button', { name: /đề xuất bằng ai|suggest with ai/i }));

    await waitFor(() => {
      expect(onSuggest).toHaveBeenCalledTimes(1);
    });

    expect(screen.getByText('The group has a clear exam target and can sustain higher daily effort.')).toBeInTheDocument();
    expect(screen.getByText('Keep one checkpoint every weekend.')).toBeInTheDocument();

    fireEvent.click(screen.getByRole('button', { name: /^thiết lập lộ trình$|^set up roadmap$/i }));
    fireEvent.click(screen.getByRole('button', { name: /^xác nhận thiết lập$|^confirm setup$/i }));

    await waitFor(() => {
      expect(onSave).toHaveBeenCalledWith({
        workspacePurpose: 'STUDY_NEW',
        enableRoadmap: true,
        knowledgeLoad: 'ADVANCED',
        adaptationMode: 'FLEXIBLE',
        roadmapSpeedMode: 'FAST',
        estimatedTotalDays: 18,
        recommendedMinutesPerDay: 95,
        preLearningRequired: true,
      });
    });
  });
});
