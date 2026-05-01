import { describe, expect, it } from 'vitest';
import {
  applyPassingPercentChange,
  applyPassingScoreChange,
  applySectionPointChange,
  applyTotalPointsChange,
  buildMockTestCustomScoring,
  buildSectionScoringPayload,
  countLeafQuestions,
  deriveSectionScoring,
  normalizeMockTestScoring,
  scorePerQuestion,
} from '@/pages/Users/MockTest/utils/mockTestScoring';

describe('mock test scoring', () => {
  const sections = [
    {
      title: 'Part 1',
      structure: [
        { quantity: 6, questionType: 'SINGLE_CHOICE' },
        { quantity: 4, questionType: 'TRUE_FALSE' },
      ],
    },
    {
      title: 'Part 2',
      subConfigs: [
        {
          title: 'Case analysis',
          structure: [
            { quantity: 5, questionType: 'MULTIPLE_CHOICE' },
          ],
        },
      ],
    },
  ];

  it('counts nested leaf questions and derives per-question score from total points', () => {
    expect(countLeafQuestions(sections)).toBe(15);
    expect(scorePerQuestion({ totalPoints: 45 }, sections)).toBe(3);
  });

  it('clamps passing score to total points', () => {
    expect(normalizeMockTestScoring({ totalPoints: 10, passingScore: 12 })).toMatchObject({
      totalPoints: 10,
      passingScore: 10,
    });
  });

  it('keeps custom scoring payload explicit for mock test generation', () => {
    expect(
      buildMockTestCustomScoring({ totalPoints: 100, passingScore: 50, mode: 'RAW' }),
    ).toMatchObject({
      totalPoints: 100,
      passingScore: 50,
      mode: 'RAW',
      perQuestionPoints: 'uniform',
    });
  });

  it('emits sectionScoring payload sized to leaf-question proportions', () => {
    const payload = buildMockTestCustomScoring(
      { totalPoints: 100, passingScore: 50, mode: 'RAW' },
      sections,
    );
    expect(payload.sectionScoring).toHaveLength(2);
    // Part 1 = 10/15 leaves -> ~66.67%, Part 2 = 5/15 -> ~33.33%
    const [part1, part2] = payload.sectionScoring;
    expect(part1.points).toBeCloseTo(66.67, 1);
    expect(part2.points).toBeCloseTo(33.33, 1);
    expect(part1.percent + part2.percent).toBeCloseTo(100, 0);
  });

  it('respects AI-provided sectionScoring when computing breakdown', () => {
    const breakdown = deriveSectionScoring(sections, {
      totalPoints: 100,
      sectionScoring: [
        { sectionIndex: 0, points: 80, weight: 0.8 },
        { sectionIndex: 1, points: 20, weight: 0.2 },
      ],
    });
    expect(breakdown).toHaveLength(2);
    expect(breakdown[0].points).toBe(80);
    expect(breakdown[0].percent).toBe(80);
    expect(breakdown[1].points).toBe(20);
    // Per-question = sectionPoints / leafCount
    expect(breakdown[0].perQuestionPoints).toBe(8); // 80/10
    expect(breakdown[1].perQuestionPoints).toBe(4); // 20/5
  });

  it('rescales section points proportionally when total changes', () => {
    const initial = normalizeMockTestScoring({
      totalPoints: 100,
      passingScore: 50,
      sectionScoring: [
        { sectionIndex: 0, points: 60, weight: 0.6 },
        { sectionIndex: 1, points: 40, weight: 0.4 },
      ],
    });
    const next = applyTotalPointsChange(initial, sections, 200);
    expect(next.totalPoints).toBe(200);
    // Each section doubles: 60->120, 40->80
    expect(next.sectionScoring[0].points).toBe(120);
    expect(next.sectionScoring[1].points).toBe(80);
    // Passing percent kept (50%), so absolute updates to 100
    expect(next.passingScore).toBe(100);
  });

  it('updates total when individual section points change', () => {
    const initial = normalizeMockTestScoring({
      totalPoints: 100,
      passingScore: 50,
    });
    const next = applySectionPointChange(initial, sections, 0, 80);
    // Section 1 = 80, section 2 was 33.33 (from leaf split) -> roughly stays
    expect(next.totalPoints).toBeGreaterThan(100);
    expect(next.sectionScoring[0].points).toBe(80);
  });

  it('keeps passing score / percent in sync', () => {
    const initial = normalizeMockTestScoring({ totalPoints: 100 });
    expect(initial.passingScore).toBe(50);
    expect(initial.passingPercent).toBe(50);

    const byPercent = applyPassingPercentChange(initial, 70);
    expect(byPercent.passingScore).toBe(70);
    expect(byPercent.passingPercent).toBe(70);

    const byScore = applyPassingScoreChange(initial, 25);
    expect(byScore.passingScore).toBe(25);
    expect(byScore.passingPercent).toBe(25);
  });

  it('builds section scoring payload entries with sectionIndex + percent + weight', () => {
    const payload = buildSectionScoringPayload(sections, { totalPoints: 100 });
    expect(payload[0]).toMatchObject({
      sectionIndex: 0,
      points: expect.any(Number),
      percent: expect.any(Number),
      weight: expect.any(Number),
    });
  });
});
