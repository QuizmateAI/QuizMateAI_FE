import React, { useCallback, useMemo } from 'react';
import { Trash2, Plus, AlertCircle, Lock, Unlock } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import {
  MOCK_TEST_BLOOM_SKILLS,
  MOCK_TEST_DIFFICULTIES,
} from '../hooks/useMockTestStructureSuggestion';

const MIN_DESCRIPTION_LENGTH = 10;
const TOTAL_COMBO_COUNT = MOCK_TEST_DIFFICULTIES.length * MOCK_TEST_BLOOM_SKILLS.length;

// Tìm tổ hợp (difficulty, bloomSkill) đầu tiên CHƯA có trong structure.
// Duyệt difficulty trước (EASY → MEDIUM → HARD), bloom sau cho thứ tự predictable.
// Trả null nếu đã dùng hết (UI nên ẩn nút "Add combination" trước khi gọi).
function findFirstUnusedCombo(structure) {
  const used = new Set(
    (structure || []).map((it) => `${it?.difficulty}|${it?.bloomSkill}`)
  );
  for (const difficulty of MOCK_TEST_DIFFICULTIES) {
    for (const bloomSkill of MOCK_TEST_BLOOM_SKILLS) {
      if (!used.has(`${difficulty}|${bloomSkill}`)) {
        return { difficulty, bloomSkill };
      }
    }
  }
  return null;
}

function translateBloomSkill(t, bloomSkill) {
  switch (bloomSkill) {
    case 'REMEMBER':
      return t('mockTestForms.common.bloomRemember', 'Remember');
    case 'UNDERSTAND':
      return t('mockTestForms.common.bloomUnderstand', 'Understand');
    case 'APPLY':
      return t('mockTestForms.common.bloomApply', 'Apply');
    case 'ANALYZE':
      return t('mockTestForms.common.bloomAnalyze', 'Analyze');
    case 'EVALUATE':
      return t('mockTestForms.common.bloomEvaluate', 'Evaluate');
    default:
      return bloomSkill;
  }
}

function translateDifficulty(t, difficulty) {
  switch (difficulty) {
    case 'EASY':
      return t('mockTestForms.common.difficultyEasy', 'Easy');
    case 'MEDIUM':
      return t('mockTestForms.common.difficultyMedium', 'Medium');
    case 'HARD':
      return t('mockTestForms.common.difficultyHard', 'Hard');
    default:
      return difficulty;
  }
}

function blankStructureItem() {
  return {
    difficulty: 'MEDIUM',
    questionType: 'SINGLE_CHOICE',
    bloomSkill: 'UNDERSTAND',
    quantity: 1,
    scorePerQuestion: 1,
    locked: false,
  };
}

function blankSection() {
  return {
    name: '',
    description: '',
    numQuestions: 1,
    structure: [blankStructureItem()],
    subConfigs: [],
  };
}

// Round 2 chữ số thập phân — tránh floating-point edge case (3.333... × 7 = 23.331)
function round2(n) {
  if (!Number.isFinite(n)) return 0;
  return Math.round(n * 100) / 100;
}

// Tổng điểm 1 section = sum(row.scorePerQuestion × row.quantity).
// Trả về number, đã round 2 chữ số thập phân.
function computeSectionMaxScore(section) {
  if (!section) return 0;
  const subs = section.subConfigs || [];
  if (subs.length > 0) {
    return round2(subs.reduce((s, sub) => s + computeSectionMaxScore(sub), 0));
  }
  const rows = section.structure || [];
  return round2(rows.reduce((s, it) => {
    const score = Number(it?.scorePerQuestion) || 0;
    const qty = Number(it?.quantity) || 0;
    return s + score * qty;
  }, 0));
}

function computeQuizMaxScore(sections) {
  if (!Array.isArray(sections)) return 0;
  return round2(sections.reduce((s, sec) => s + computeSectionMaxScore(sec), 0));
}

// Distribute điểm tổng section xuống các row CHƯA LOCK (chia đều theo qty).
// Row đã lock (user đã nhập điểm thủ công) giữ nguyên scorePerQuestion.
// remaining = target - sum(locked × qty). Nếu remaining < 0 → set unlocked = 0 (locked đã vượt target).
// Nếu mọi row đều locked → trả structure y nguyên.
function distributeSectionScoreToRows(structure, targetMaxScore) {
  if (!Array.isArray(structure) || structure.length === 0) return structure;
  const lockedSum = structure.reduce((s, it) => {
    if (!it?.locked) return s;
    const sc = Number(it?.scorePerQuestion) || 0;
    const q = Number(it?.quantity) || 0;
    return s + sc * q;
  }, 0);
  const unlockedQty = structure.reduce((s, it) => {
    if (it?.locked) return s;
    return s + (Number(it?.quantity) || 0);
  }, 0);

  if (unlockedQty === 0) {
    // Hết row để chia — locked giữ nguyên, không touch
    return structure;
  }

  const remaining = Math.max(0, (targetMaxScore || 0) - lockedSum);
  const perQuestion = round2(remaining / unlockedQty);
  return structure.map((it) =>
    it?.locked ? it : { ...it, scorePerQuestion: perQuestion }
  );
}

// Tổng điểm các row LOCKED (qua tree, đệ quy).
function sumLockedScore(sections) {
  if (!Array.isArray(sections)) return 0;
  let total = 0;
  sections.forEach((sec) => {
    const subs = sec.subConfigs || [];
    if (subs.length > 0) {
      total += sumLockedScore(subs);
    } else {
      (sec.structure || []).forEach((it) => {
        if (it?.locked) {
          total += (Number(it.scorePerQuestion) || 0) * (Number(it.quantity) || 0);
        }
      });
    }
  });
  return total;
}

// Số câu của các row UNLOCKED (qua tree).
function sumUnlockedQty(sections) {
  if (!Array.isArray(sections)) return 0;
  let total = 0;
  sections.forEach((sec) => {
    const subs = sec.subConfigs || [];
    if (subs.length > 0) {
      total += sumUnlockedQty(subs);
    } else {
      (sec.structure || []).forEach((it) => {
        if (!it?.locked) total += (Number(it.quantity) || 0);
      });
    }
  });
  return total;
}

// Distribute điểm tổng quiz: phần locked giữ nguyên; phần `remaining = quizMax - lockedSum`
// chia đều cho mọi câu unlocked toàn cây (mỗi câu unlocked = remaining / totalUnlockedQty).
// Cách này đảm bảo mọi câu unlocked có cùng score/câu, tổng quiz khớp với target.
function distributeQuizScoreToSections(sections, targetMaxScore) {
  if (!Array.isArray(sections) || sections.length === 0) return sections;
  const lockedSum = sumLockedScore(sections);
  const unlockedQty = sumUnlockedQty(sections);
  if (unlockedQty === 0) return sections; // mọi row đều locked
  const remaining = Math.max(0, (targetMaxScore || 0) - lockedSum);
  const perUnlockedQ = round2(remaining / unlockedQty);
  return sections.map((sec) => applyPerUnlockedScore(sec, perUnlockedQ));
}

function applyPerUnlockedScore(section, perUnlockedQ) {
  const subs = section.subConfigs || [];
  if (subs.length > 0) {
    return {
      ...section,
      subConfigs: subs.map((sub) => applyPerUnlockedScore(sub, perUnlockedQ)),
    };
  }
  return {
    ...section,
    structure: (section.structure || []).map((it) =>
      it?.locked ? it : { ...it, scorePerQuestion: perUnlockedQ }
    ),
  };
}

// Khi user mới bật scoring lần đầu mà tất cả row score đang 0 → set default 1/câu
// (để user thấy ngay total > 0 thay vì màn 0 trống). User vẫn chỉnh được sau.
function applyDefaultScoreToSection(section) {
  const subs = section.subConfigs || [];
  if (subs.length > 0) {
    return { ...section, subConfigs: subs.map(applyDefaultScoreToSection) };
  }
  const rows = section.structure || [];
  return {
    ...section,
    structure: rows.map((it) => ({
      ...it,
      scorePerQuestion: Number(it?.scorePerQuestion) > 0 ? it.scorePerQuestion : 1,
    })),
  };
}

function zeroOutSectionScore(section) {
  const subs = section.subConfigs || [];
  if (subs.length > 0) {
    return { ...section, subConfigs: subs.map(zeroOutSectionScore) };
  }
  return {
    ...section,
    structure: (section.structure || []).map((it) => ({ ...it, scorePerQuestion: 0 })),
  };
}

// Gộp các row có cùng (difficulty, bloomSkill): cộng quantity. UX fix giúp user
// không cần xóa thủ công khi vô tình tạo trùng tổ hợp.
function mergeDuplicateStructureItems(structure) {
  if (!Array.isArray(structure)) return [];
  const merged = [];
  structure.forEach((it) => {
    if (!it) return;
    const found = merged.find(
      (m) => m.difficulty === it.difficulty && m.bloomSkill === it.bloomSkill
    );
    if (found) {
      found.quantity = (Number(found.quantity) || 0) + (Number(it.quantity) || 0);
    } else {
      merged.push({ ...it });
    }
  });
  return merged;
}

function sumStructureQuantity(structure) {
  if (!Array.isArray(structure)) return 0;
  return structure.reduce((s, it) => s + (Number(it?.quantity) || 0), 0);
}

function countLeafQuestions(sections) {
  if (!Array.isArray(sections)) return 0;
  let total = 0;
  sections.forEach((sec) => {
    if (sec.subConfigs && sec.subConfigs.length > 0) {
      total += countLeafQuestions(sec.subConfigs);
    } else {
      total += sumStructureQuantity(sec.structure);
    }
  });
  return total;
}

function validateSection(section, t) {
  const errors = [];
  if (!section.name || section.name.trim().length === 0) {
    errors.push(t('mockTestForms.structure.validation.sectionMissingName', 'Section name is required.'));
  }
  if (!section.description || section.description.trim().length < MIN_DESCRIPTION_LENGTH) {
    errors.push(t('mockTestForms.structure.validation.descriptionTooShort', 'Description is too short (minimum {{min}} characters).', { min: MIN_DESCRIPTION_LENGTH }));
  }
  const isLeaf = !section.subConfigs || section.subConfigs.length === 0;
  if (isLeaf) {
    if (!Array.isArray(section.structure) || section.structure.length === 0) {
      errors.push(t('mockTestForms.structure.validation.leafStructureRequired', 'Each leaf section needs at least one structure row.'));
    } else {
      section.structure.forEach((it, idx) => {
        const q = Number(it?.quantity) || 0;
        if (q <= 0) {
          errors.push(t('mockTestForms.structure.validation.structureQuantityPositive', 'Structure #{{index}}: quantity must be greater than 0.', {
            index: idx + 1,
          }));
        }
      });
      const total = sumStructureQuantity(section.structure);
      const num = Number(section.numQuestions) || 0;
      if (num !== total) {
        errors.push(t('mockTestForms.structure.validation.numQuestionsMismatch', 'numQuestions = {{num}} does not match total quantity = {{total}}.', {
          num,
          total,
        }));
      }
    }
  }
  return errors;
}

function StructureItemRow({ item, onChange, onRemove, readOnly, useScoring, t }) {
  const update = (field, value) => onChange({ ...item, [field]: value });
  const qty = Number(item?.quantity) || 0;
  const scorePerQuestion = Number(item?.scorePerQuestion) || 0;
  const rowTotal = useScoring ? round2(scorePerQuestion * qty) : 0;
  // Grid 12-col layout. Without scoring: 4/4/3/1. With scoring: 3/2/2/2/2/1.
  if (readOnly) {
    return (
      <div className="grid grid-cols-12 items-center gap-2 rounded-md border border-gray-200 bg-white p-2">
        <div className={`${useScoring ? 'col-span-3' : 'col-span-4'} px-2 py-1 text-xs text-muted-foreground`}>{translateDifficulty(t, item.difficulty)}</div>
        <div className={`${useScoring ? 'col-span-2' : 'col-span-4'} px-2 py-1 text-xs text-muted-foreground`}>{translateBloomSkill(t, item.bloomSkill)}</div>
        <div className={`${useScoring ? 'col-span-2' : 'col-span-4'} px-2 py-1 text-xs font-medium`}>{item.quantity ?? 1}</div>
        {useScoring && (
          <>
            <div className="col-span-2 px-2 py-1 text-xs text-indigo-700">{scorePerQuestion}</div>
            <div className="col-span-2 px-2 py-1 text-xs font-semibold text-indigo-900">{rowTotal}</div>
            <div className="col-span-1" />
          </>
        )}
      </div>
    );
  }
  return (
    <div className="grid grid-cols-12 items-center gap-2 rounded-md border border-gray-200 bg-white p-2">
      <div className={useScoring ? 'col-span-3' : 'col-span-4'}>
        <select
          value={item.difficulty}
          onChange={(e) => update('difficulty', e.target.value)}
          className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {MOCK_TEST_DIFFICULTIES.map((d) => (
            <option key={d} value={d}>{translateDifficulty(t, d)}</option>
          ))}
        </select>
      </div>
      <div className={useScoring ? 'col-span-2' : 'col-span-4'}>
        <select
          value={item.bloomSkill}
          onChange={(e) => update('bloomSkill', e.target.value)}
          className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {MOCK_TEST_BLOOM_SKILLS.map((b) => (
            <option key={b} value={b}>{translateBloomSkill(t, b)}</option>
          ))}
        </select>
      </div>
      <div className={useScoring ? 'col-span-2' : 'col-span-3'}>
        <Input
          type="number"
          min={1}
          value={item.quantity ?? 1}
          onChange={(e) => update('quantity', Math.max(1, Number(e.target.value) || 1))}
          className="h-8 text-xs"
        />
      </div>
      {useScoring && (
        <>
          <div className="col-span-2 flex items-center gap-1">
            <Input
              type="number"
              min={0}
              step="any"
              value={item.scorePerQuestion ?? ''}
              onChange={(e) => {
                const next = e.target.value === '' ? 0 : Number(e.target.value);
                // Auto-lock khi user nhập trực tiếp → distribute từ section/quiz sẽ skip row này.
                onChange({
                  ...item,
                  scorePerQuestion: Number.isFinite(next) && next >= 0 ? next : 0,
                  locked: true,
                });
              }}
              placeholder="0"
              className={`h-8 text-xs ${item?.locked ? 'border-amber-400 bg-amber-50' : ''}`}
            />
            <button
              type="button"
              onClick={() => onChange({ ...item, locked: !item?.locked })}
              title={
                item?.locked
                  ? t('mockTestForms.structure.unlockRowHint', 'Locked — click to unlock and let auto-distribute reset this row.')
                  : t('mockTestForms.structure.lockRowHint', 'Auto — click to lock this score so distribute does not change it.')
              }
              className="shrink-0 rounded p-1 hover:bg-gray-100"
            >
              {item?.locked
                ? <Lock className="h-3.5 w-3.5 text-amber-600" />
                : <Unlock className="h-3.5 w-3.5 text-gray-400" />}
            </button>
          </div>
          <div className="col-span-2 px-2 text-xs font-semibold text-indigo-900">
            {rowTotal}
          </div>
        </>
      )}
      <div className="col-span-1 flex justify-end">
        <Button type="button" variant="ghost" size="icon" onClick={onRemove} title={t('mockTestForms.structure.delete', 'Delete')}>
          <Trash2 className="h-3.5 w-3.5 text-red-500" />
        </Button>
      </div>
    </div>
  );
}

function SectionCard({
  section,
  path,
  onUpdate,
  onRemove,
  onAddSub,
  level = 0,
  readOnly = false,
  useScoring = false,
}) {
  const { t } = useTranslation();
  const hasSubSections = Array.isArray(section.subConfigs) && section.subConfigs.length > 0;
  const hasStructureRowsTop = Array.isArray(section.structure) && section.structure.length > 0;
  const isLeaf = !hasSubSections;
  const isEditing = !readOnly;
  const hasDescription = Boolean(section.description?.trim());
  const hasStructureRows = isLeaf && hasStructureRowsTop;
  const shouldRenderContent = isEditing || hasDescription || hasStructureRows || hasSubSections;
  const errors = readOnly ? [] : validateSection(section, t);
  const computedSectionMaxScore = useScoring ? computeSectionMaxScore(section) : 0;
  const sectionLockedSum = useScoring && hasStructureRowsTop
    ? (section.structure || []).reduce((s, it) => {
        if (!it?.locked) return s;
        return s + (Number(it.scorePerQuestion) || 0) * (Number(it.quantity) || 0);
      }, 0)
    : 0;
  const sectionAllRowsLocked = useScoring && hasStructureRowsTop
    && (section.structure || []).length > 0
    && (section.structure || []).every((it) => it?.locked);

  const updateField = useCallback(
    (field, value) => onUpdate(path, { ...section, [field]: value }),
    [section, path, onUpdate],
  );

  // Khi structure đổi: auto-merge duplicate row (cùng difficulty + bloomSkill) + recompute numQuestions.
  const applyStructureChange = useCallback(
    (nextStructureRaw) => {
      const merged = mergeDuplicateStructureItems(nextStructureRaw);
      const total = sumStructureQuantity(merged);
      onUpdate(path, { ...section, structure: merged, numQuestions: total });
    },
    [section, path, onUpdate],
  );

  const updateStructureItem = useCallback(
    (idx, nextItem) => {
      const nextStructure = (section.structure || []).map((it, i) => (i === idx ? nextItem : it));
      applyStructureChange(nextStructure);
    },
    [section, applyStructureChange],
  );

  const addStructureItem = useCallback(() => {
    const unused = findFirstUnusedCombo(section.structure);
    if (!unused) return; // Đã hết tổ hợp — UI ẩn button rồi, defensive.
    const newItem = {
      difficulty: unused.difficulty,
      questionType: 'SINGLE_CHOICE',
      bloomSkill: unused.bloomSkill,
      quantity: 1,
      scorePerQuestion: useScoring ? 1 : 0,
      locked: false,
    };
    applyStructureChange([...(section.structure || []), newItem]);
  }, [section, applyStructureChange, useScoring]);

  const canAddCombination = (section.structure?.length || 0) < TOTAL_COMBO_COUNT;

  // User override section.maxScore → distribute đều xuống rows.scorePerQuestion.
  // Đây là 2-way binding: edit ở section level → cascade xuống row level.
  const handleSectionScoreOverride = useCallback(
    (rawValue) => {
      const next = rawValue === '' ? 0 : Number(rawValue);
      const target = Number.isFinite(next) && next >= 0 ? next : 0;
      const distributed = distributeSectionScoreToRows(section.structure, target);
      onUpdate(path, { ...section, structure: distributed });
    },
    [section, path, onUpdate],
  );

  const removeStructureItem = useCallback(
    (idx) => {
      const nextStructure = (section.structure || []).filter((_, i) => i !== idx);
      applyStructureChange(nextStructure);
    },
    [section, applyStructureChange],
  );

  return (
    <Card className={level > 0 ? 'border-purple-200 bg-purple-50/30' : ''}>
      <CardHeader className="flex flex-row items-start justify-between gap-3 pb-3">
        <div className="flex-1">
          {readOnly ? (
            <p className="font-semibold text-sm leading-snug">{section.name || '—'}</p>
          ) : (
            <>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">{t('mockTestForms.structure.sectionNameLabel', 'Section name')}</Label>
              <Input
                value={section.name || ''}
                onChange={(e) => updateField('name', e.target.value)}
                placeholder={t('mockTestForms.structure.sectionNamePlaceholder', 'E.g. Reading Comprehension, Advanced Vocabulary...')}
                className="mt-1 font-semibold"
              />
            </>
          )}
        </div>
        {isEditing && (
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={() => onRemove(path)}
            title={t('mockTestForms.structure.deleteSection', 'Delete section')}
          >
            <Trash2 className="h-4 w-4 text-red-500" />
          </Button>
        )}
      </CardHeader>

      {shouldRenderContent && (
        <CardContent className="space-y-4">
          {isEditing ? (
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('mockTestForms.structure.aiInstructionLabel', 'AI question generation instructions')}
              </Label>
              <textarea
                value={section.description || ''}
                onChange={(e) => updateField('description', e.target.value)}
                placeholder={t(
                  'mockTestForms.structure.aiInstructionPlaceholder',
                  'E.g. Reading comprehension questions on a ~150-word technology passage. Each question should have 4 answer options A/B/C/D with only 1 correct answer.'
                )}
                rows={3}
                className="mt-1 w-full rounded-md border border-input bg-background px-3 py-2 text-sm shadow-sm placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring resize-y"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                {t(
                  'mockTestForms.structure.aiInstructionHint',
                  'Describe the topic, skill, and format as specifically as possible so the AI can generate more accurate questions. Minimum {{min}} characters.',
                  { min: MIN_DESCRIPTION_LENGTH }
                )}
              </p>
            </div>
          ) : hasDescription ? (
            <p className="text-sm text-muted-foreground whitespace-pre-wrap">{section.description}</p>
          ) : null}

          {!isEditing && hasStructureRows && (
            <div className="space-y-2">
              {(section.structure || []).map((item, idx) => (
                <StructureItemRow
                  key={idx}
                  item={item}
                  t={t}
                  readOnly
                  useScoring={useScoring}
                />
              ))}
            </div>
          )}

          {isEditing && isLeaf && useScoring && hasStructureRowsTop && (
            <div>
              <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                {t('mockTestForms.structure.sectionMaxScoreLabel', 'Section total score')}
              </Label>
              <div className="mt-1 flex items-center gap-2">
                <Input
                  type="number"
                  min={0}
                  step="any"
                  value={computedSectionMaxScore}
                  onChange={(e) => handleSectionScoreOverride(e.target.value)}
                  placeholder="0"
                  className="h-8 max-w-[180px] text-xs"
                />
                <span className="text-xs text-muted-foreground">
                  {t('mockTestForms.structure.sectionMaxScoreHint', 'Editing distributes the remainder evenly across unlocked rows. Locked rows keep their score.')}
                </span>
              </div>
              {sectionLockedSum > computedSectionMaxScore && computedSectionMaxScore > 0 && (
                <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                  <AlertCircle className="h-3 w-3" />
                  {t(
                    'mockTestForms.structure.lockedSumExceeds',
                    'Locked rows sum to {{locked}}, which already exceeds the section target. Unlock a row or increase the section score.',
                    { locked: round2(sectionLockedSum) }
                  )}
                </p>
              )}
              {sectionAllRowsLocked && (
                <p className="mt-1 flex items-center gap-1 text-xs text-amber-600">
                  <AlertCircle className="h-3 w-3" />
                  {t(
                    'mockTestForms.structure.allRowsLocked',
                    'All rows are locked — section total cannot be redistributed. Unlock at least one row first.'
                  )}
                </p>
              )}
            </div>
          )}

          {isEditing && isLeaf && (
            <div>
              <div className="flex items-center justify-between">
                <Label className="text-xs uppercase tracking-wide text-muted-foreground">
                  {t('mockTestForms.structure.questionStructureLabel', 'Question structure (difficulty x Bloom x quantity)')}
                </Label>
                <Badge className="bg-gray-100 text-gray-800">
                  {t('mockTestForms.structure.totalLabel', 'Total: {{count}}', {
                    count: sumStructureQuantity(section.structure),
                  })}
                </Badge>
              </div>
              <div className="mt-2 grid grid-cols-12 gap-2 px-2 text-[10px] uppercase tracking-wide text-muted-foreground">
                <div className={useScoring ? 'col-span-3' : 'col-span-4'}>{t('mockTestForms.structure.columnDifficulty', 'Difficulty')}</div>
                <div className={useScoring ? 'col-span-2' : 'col-span-4'}>{t('mockTestForms.structure.columnBloom', 'Bloom level')}</div>
                <div className={useScoring ? 'col-span-2' : 'col-span-4'}>{t('mockTestForms.structure.columnQuantity', 'Quantity')}</div>
                {useScoring && (
                  <>
                    <div className="col-span-2">{t('mockTestForms.structure.columnScorePerQ', 'Score / question')}</div>
                    <div className="col-span-2">{t('mockTestForms.structure.columnRowTotal', 'Row total')}</div>
                    <div className="col-span-1" />
                  </>
                )}
              </div>
              <div className="mt-1 space-y-2">
                {(section.structure || []).map((item, idx) => (
                  <StructureItemRow
                    key={idx}
                    item={item}
                    t={t}
                    readOnly={false}
                    useScoring={useScoring}
                    onChange={(next) => updateStructureItem(idx, next)}
                    onRemove={() => removeStructureItem(idx)}
                  />
                ))}
                {(!section.structure || section.structure.length === 0) && (
                  <p className="rounded-md border border-dashed p-3 text-center text-xs text-muted-foreground">
                    {t('mockTestForms.structure.emptyStructure', 'No structure rows yet. Click "Add combination" to start.')}
                  </p>
                )}
              </div>
              {canAddCombination ? (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addStructureItem}
                  className="mt-2"
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {t('mockTestForms.structure.addCombination', 'Add combination')}
                </Button>
              ) : (
                <p className="mt-2 text-xs text-muted-foreground">
                  {t('mockTestForms.structure.allCombinationsUsed', 'All difficulty × Bloom combinations are in use. Adjust quantity or remove a row to add a different combination.')}
                </p>
              )}
            </div>
          )}

          {hasSubSections && (
            <div className="space-y-3 border-l-2 border-purple-200 pl-4">
              {isEditing && (
                <p className="text-sm font-medium text-purple-700">
                  {t('mockTestForms.structure.subSectionCount', 'Sub-sections ({{count}})', {
                    count: section.subConfigs.length,
                  })}
                  {useScoring && computedSectionMaxScore > 0 && (
                    <span className="ml-2 text-xs text-indigo-700 font-normal">
                      · {t('mockTestForms.structure.sectionTotalShort', 'Total')}: {computedSectionMaxScore}
                    </span>
                  )}
                </p>
              )}
              {section.subConfigs.map((sub, idx) => (
                <SectionCard
                  key={`${path.join('-')}-${idx}`}
                  section={sub}
                  path={[...path, 'subConfigs', idx]}
                  onUpdate={onUpdate}
                  onRemove={onRemove}
                  onAddSub={onAddSub}
                  level={level + 1}
                  readOnly={readOnly}
                  useScoring={useScoring}
                />
              ))}
            </div>
          )}

          {isEditing && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              {/* Mutex: chỉ cho add sub-section khi chưa có structure rows.
                  Section đã có rows → là leaf, không nest sub. */}
              {!hasStructureRowsTop && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => onAddSub(path)}
                >
                  <Plus className="mr-1 h-3.5 w-3.5" />
                  {t('mockTestForms.structure.addSubSection', 'Add sub-section')}
                </Button>
              )}
              {errors.length > 0 && (
                <div className="flex items-start gap-1 text-xs text-red-600">
                  <AlertCircle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
                  <span>{errors.join('. ')}</span>
                </div>
              )}
            </div>
          )}
        </CardContent>
      )}
    </Card>
  );
}

/**
 * Editor cấu trúc mock test: tree section, mỗi leaf có danh sách tổ hợp
 * {difficulty, bloomSkill, quantity, scorePerQuestion?}. questionType luôn SINGLE_CHOICE.
 *
 * Props:
 * - sections: Array<Section>
 * - onChange: (nextSections) => void
 * - targetTotalQuestions?: number
 * - topNotice?: string
 * - readOnly?: boolean
 * - useScoring?: boolean — bật cấu trúc điểm
 * - onUseScoringChange?: (next: boolean) => void
 */
export function MockTestStructureEditor({
  sections,
  onChange,
  targetTotalQuestions,
  topNotice,
  readOnly = false,
  useScoring = false,
  onUseScoringChange,
}) {
  const { t } = useTranslation();
  const totalLeaf = useMemo(() => countLeafQuestions(sections), [sections]);
  const targetMet = !targetTotalQuestions || totalLeaf === targetTotalQuestions;
  const quizMaxScore = useMemo(
    () => (useScoring ? computeQuizMaxScore(sections) : 0),
    [sections, useScoring],
  );

  // User edit total quiz score → distribute proportionally xuống các section theo numQuestions,
  // rồi chia đều xuống từng row (scorePerQuestion = sectionMax / numQ).
  const handleQuizScoreOverride = useCallback(
    (rawValue) => {
      if (readOnly) return;
      const next = rawValue === '' ? 0 : Number(rawValue);
      const target = Number.isFinite(next) && next >= 0 ? next : 0;
      const distributed = distributeQuizScoreToSections(sections, target);
      onChange(distributed);
    },
    [sections, onChange, readOnly],
  );

  const handleToggleScoring = useCallback(
    (nextEnabled) => {
      onUseScoringChange?.(nextEnabled);
      if (nextEnabled && Array.isArray(sections) && sections.length > 0) {
        // Khi bật scoring lần đầu: nếu mọi row đều scorePerQuestion = 0/null → set default 1
        // để user thấy ngay total > 0 thay vì màn 0 trống. User vẫn có thể chỉnh xuống 0.
        const hasAnyScore = computeQuizMaxScore(sections) > 0;
        if (!hasAnyScore) {
          const defaulted = sections.map(applyDefaultScoreToSection);
          onChange(defaulted);
        }
      }
    },
    [onUseScoringChange, onChange, sections],
  );

  const updateAtPath = useCallback(
    (path, nextValue) => {
      if (readOnly) return;
      const next = JSON.parse(JSON.stringify(sections));
      let cursor = next;
      for (let i = 0; i < path.length - 1; i += 1) {
        cursor = cursor[path[i]];
      }
      cursor[path[path.length - 1]] = nextValue;
      onChange(next);
    },
    [sections, onChange, readOnly],
  );

  const removeAtPath = useCallback(
    (path) => {
      if (readOnly) return;
      const next = JSON.parse(JSON.stringify(sections));
      if (path.length === 1) {
        next.splice(path[0], 1);
      } else {
        let cursor = next;
        for (let i = 0; i < path.length - 1; i += 1) {
          cursor = cursor[path[i]];
        }
        cursor.splice(path[path.length - 1], 1);
      }
      onChange(next);
    },
    [sections, onChange, readOnly],
  );

  const addSubAtPath = useCallback(
    (path) => {
      if (readOnly) return;
      const next = JSON.parse(JSON.stringify(sections));
      let cursor = next;
      for (let i = 0; i < path.length; i += 1) {
        cursor = cursor[path[i]];
      }
      if (!Array.isArray(cursor.subConfigs)) cursor.subConfigs = [];
      cursor.subConfigs.push(blankSection());
      // Khi thêm sub-section, section cha không còn là leaf → clear structure.
      cursor.structure = [];
      cursor.numQuestions = 0;
      onChange(next);
    },
    [sections, onChange, readOnly],
  );

  const addRootSection = useCallback(() => {
    if (readOnly) return;
    onChange([...(sections || []), blankSection()]);
  }, [sections, onChange, readOnly]);

  return (
    <div className="space-y-4">
      {topNotice && (
        <div className="flex items-start gap-2 rounded-lg border border-amber-300 bg-amber-50 p-3 text-sm text-amber-800">
          <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
          <span>{topNotice}</span>
        </div>
      )}

      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-3 text-sm">
          <div>
            <span className="text-muted-foreground">{t('mockTestForms.structure.totalLeafLabel', 'Total leaf questions: ')}</span>
            <Badge className={targetMet ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
              {totalLeaf}
              {targetTotalQuestions ? ` / ${targetTotalQuestions}` : ''}
            </Badge>
          </div>
          {!readOnly && onUseScoringChange && (
            <label className="flex items-center gap-2 cursor-pointer select-none rounded-md border border-input bg-background px-2 py-1 text-xs">
              <input
                type="checkbox"
                checked={!!useScoring}
                onChange={(e) => handleToggleScoring(e.target.checked)}
                className="h-3.5 w-3.5 cursor-pointer accent-indigo-600"
              />
              <span className={useScoring ? 'font-medium text-indigo-700' : 'text-muted-foreground'}>
                {t('mockTestForms.structure.useScoringToggle', 'Use scoring structure')}
              </span>
            </label>
          )}
          {useScoring && (
            <div className="flex items-center gap-2">
              <span className="text-muted-foreground">{t('mockTestForms.structure.totalQuizScoreLabel', 'Total max score:')}</span>
              <Input
                type="number"
                min={0}
                step="any"
                value={quizMaxScore}
                onChange={(e) => handleQuizScoreOverride(e.target.value)}
                disabled={readOnly}
                className="h-8 w-24 text-xs font-semibold text-indigo-900"
              />
            </div>
          )}
        </div>
        {!readOnly && (
          <Button type="button" variant="outline" size="sm" onClick={addRootSection}>
            <Plus className="mr-1 h-3.5 w-3.5" />
            {t('mockTestForms.structure.addSection', 'Add section')}
          </Button>
        )}
      </div>

      <div className="space-y-3">
        {(!sections || sections.length === 0) && (
          <p className="rounded-md border border-dashed p-6 text-center text-sm text-muted-foreground">
            {t('mockTestForms.structure.emptySections', 'No sections yet. Click "Add section" or use AI suggestions to start.')}
          </p>
        )}
        {(sections || []).map((sec, idx) => (
          <SectionCard
            key={`root-${idx}`}
            section={sec}
            path={[idx]}
            onUpdate={updateAtPath}
            onRemove={removeAtPath}
            onAddSub={addSubAtPath}
            level={0}
            readOnly={readOnly}
            useScoring={useScoring}
          />
        ))}
      </div>
    </div>
  );
}

/**
 * Validate toàn bộ structure trước khi submit lên BE.
 * Trả về { isValid, errors: string[] } — errors gom all section's errors.
 */
export function validateMockTestStructure(sections, targetTotalQuestions, t = ((_, fallback, options) => {
  if (!fallback) return '';
  return Object.entries(options || {}).reduce(
    (text, [key, value]) => text.replaceAll(`{{${key}}}`, String(value)),
    fallback,
  );
})) {
  const allErrors = [];
  function walk(list, prefix = '') {
    list.forEach((sec, idx) => {
      const label = `${prefix}${sec.name || t('mockTestForms.structure.validation.sectionLabel', 'Section #{{index}}', { index: idx + 1 })}`;
      const errs = validateSection(sec, t);
      errs.forEach((e) => allErrors.push(`${label}: ${e}`));
      if (sec.subConfigs && sec.subConfigs.length > 0) {
        walk(sec.subConfigs, `${label} > `);
      }
    });
  }
  walk(sections || []);
  if (targetTotalQuestions != null) {
    const total = countLeafQuestions(sections || []);
    if (total !== targetTotalQuestions) {
      allErrors.push(t('mockTestForms.structure.validation.totalLeafMismatch', 'Total leaf questions = {{total}}, expected {{target}}.', {
        total,
        target: targetTotalQuestions,
      }));
    }
  }
  return { isValid: allErrors.length === 0, errors: allErrors };
}
