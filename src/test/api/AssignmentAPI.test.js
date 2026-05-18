import { beforeEach, describe, expect, it, vi } from 'vitest';
import api from '@/api/api';
import {
  createAssignment,
  deleteAssignment,
  getAssignmentDetail,
  listGroupAssignments,
  listMyAssignments,
  submitAssignment,
  updateAssignment,
} from '@/api/AssignmentAPI';

vi.mock('@/api/api', () => ({
  default: {
    get: vi.fn(),
    post: vi.fn(),
    put: vi.fn(),
    delete: vi.fn(),
  },
}));

describe('AssignmentAPI', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    api.get.mockResolvedValue({ data: {} });
    api.post.mockResolvedValue({ data: {} });
    api.put.mockResolvedValue({ data: {} });
    api.delete.mockResolvedValue({ data: {} });
  });

  it('listGroupAssignments uses default pagination', async () => {
    await listGroupAssignments(7);
    expect(api.get).toHaveBeenCalledWith('/group/7/assignments?page=0&size=20');
  });

  it('listGroupAssignments forwards custom page/size', async () => {
    await listGroupAssignments(7, { page: 1, size: 50 });
    expect(api.get).toHaveBeenCalledWith('/group/7/assignments?page=1&size=50');
  });

  it('listGroupAssignments throws when workspaceId missing', async () => {
    await expect(listGroupAssignments(null)).rejects.toThrow('Missing workspaceId');
    expect(api.get).not.toHaveBeenCalled();
  });

  it('getAssignmentDetail hits the id endpoint', async () => {
    await getAssignmentDetail(7, 42);
    expect(api.get).toHaveBeenCalledWith('/group/7/assignments/42');
  });

  it('listMyAssignments uses the /me path', async () => {
    await listMyAssignments();
    expect(api.get).toHaveBeenCalledWith('/group/me/assignments');
  });

  it('createAssignment forwards the full payload', async () => {
    const payload = {
      resourceType: 'QUIZ',
      resourceId: 10,
      title: 'X',
      description: 'Y',
      dueAt: '2026-06-01T10:00:00Z',
      audienceType: 'ALL_MEMBERS',
    };
    await createAssignment(7, payload);
    expect(api.post).toHaveBeenCalledWith('/group/7/assignments', payload);
  });

  it('updateAssignment forwards only allowed fields', async () => {
    const payload = { title: 'Edited', description: 'New', dueAt: '2026-06-02T10:00:00Z' };
    await updateAssignment(7, 42, payload);
    expect(api.put).toHaveBeenCalledWith('/group/7/assignments/42', payload);
  });

  it('deleteAssignment uses DELETE on id endpoint', async () => {
    await deleteAssignment(7, 42);
    expect(api.delete).toHaveBeenCalledWith('/group/7/assignments/42');
  });

  it('submitAssignment posts to /submit with optional submissionRefId', async () => {
    await submitAssignment(7, 42, { submissionRefId: 99 });
    expect(api.post).toHaveBeenCalledWith('/group/7/assignments/42/submit', { submissionRefId: 99 });
  });

  it('submitAssignment posts empty body when no submissionRefId', async () => {
    await submitAssignment(7, 42);
    expect(api.post).toHaveBeenCalledWith('/group/7/assignments/42/submit', {});
  });

  it('all mutations throw on missing ids', async () => {
    await expect(getAssignmentDetail(1, null)).rejects.toThrow('Missing assignmentId');
    await expect(updateAssignment(1, null, {})).rejects.toThrow('Missing assignmentId');
    await expect(deleteAssignment(1, null)).rejects.toThrow('Missing assignmentId');
    await expect(submitAssignment(1, null)).rejects.toThrow('Missing assignmentId');
  });
});
