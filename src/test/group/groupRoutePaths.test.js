import { describe, expect, it } from 'vitest';
import {
  buildGroupWorkspaceRoadmapPath,
  buildGroupWorkspaceSectionPath,
  resolveGroupRoadmapPathParams,
  resolveGroupWorkspaceSectionFromSubPath,
} from '@/lib/routePaths';

describe('group route paths', () => {
  it('builds roadmap section with roadmap subpath', () => {
    expect(buildGroupWorkspaceSectionPath(12, 'roadmap')).toBe('/group-workspaces/12/roadmaps');
  });

  it('builds group roadmap deep-link path with roadmap and phase ids', () => {
    expect(buildGroupWorkspaceRoadmapPath(12, { roadmapId: 34 })).toBe('/group-workspaces/12/roadmaps/34');
    expect(buildGroupWorkspaceRoadmapPath(12, { roadmapId: 34, phaseId: 7 })).toBe('/group-workspaces/12/roadmaps/34/phases/7');
    expect(buildGroupWorkspaceRoadmapPath(12, { roadmapId: 34, phaseId: 7, knowledgeId: 91 })).toBe('/group-workspaces/12/roadmaps/34/phases/7/knowledges/91');
  });

  it('keeps query-based section paths for non-roadmap sections', () => {
    expect(buildGroupWorkspaceSectionPath(12, 'quiz')).toBe('/group-workspaces/12?section=quiz');
  });

  it('resolves roadmap section from group subpath', () => {
    expect(resolveGroupWorkspaceSectionFromSubPath('roadmaps')).toBe('roadmap');
    expect(resolveGroupWorkspaceSectionFromSubPath('roadmaps/34/phases/7')).toBe('roadmap');
    expect(resolveGroupWorkspaceSectionFromSubPath('')).toBeNull();
    expect(resolveGroupWorkspaceSectionFromSubPath('quiz')).toBeNull();
  });

  it('extracts roadmap path params from group roadmap subpath', () => {
    expect(resolveGroupRoadmapPathParams('roadmaps')).toEqual({
      roadmapId: null,
      phaseId: null,
      knowledgeId: null,
    });
    expect(resolveGroupRoadmapPathParams('roadmaps/34')).toEqual({
      roadmapId: 34,
      phaseId: null,
      knowledgeId: null,
    });
    expect(resolveGroupRoadmapPathParams('roadmaps/34/phases/7/knowledges/91')).toEqual({
      roadmapId: 34,
      phaseId: 7,
      knowledgeId: 91,
    });
  });
});
