import React, { useCallback, useMemo } from 'react';
import { Trash2, Plus, AlertCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useTranslation } from 'react-i18next';
import {
  MOCK_TEST_BLOOM_SKILLS,
  MOCK_TEST_DIFFICULTIES,
  MOCK_TEST_QUESTION_TYPES,
} from '../hooks/useMockTestStructureSuggestion';
import { MOCK_TEST_QUESTION_TYPE_VALUES } from '../utils/mockTestScoring';

const MIN_DESCRIPTION_LENGTH = 10;

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

function translateQuestionType(t, questionType) {
  switch (questionType) {
    case 'SINGLE_CHOICE':
      return t('mockTestForms.common.questionTypeSingle', 'Single choice');
    case 'MULTIPLE_CHOICE':
      return t('mockTestForms.common.questionTypeMultiple', 'Multiple choice');
    case 'TRUE_FALSE':
      return t('mockTestForms.common.questionTypeTrueFalse', 'True / False');
    default:
      return questionType;
  }
}

function blankStructureItem() {
  return {
    difficulty: 'MEDIUM',
    questionType: 'SINGLE_CHOICE',
    bloomSkill: 'UNDERSTAND',
    quantity: 1,
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
        if (!MOCK_TEST_QUESTION_TYPE_VALUES.includes(it?.questionType || '')) {
          errors.push(t('mockTestForms.structure.validation.questionTypeInvalid', 'Structure #{{index}}: question type is not supported.', {
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

function StructureItemRow({ item, onChange, onRemove, readOnly, t }) {
  const update = (field, value) => onChange({ ...item, [field]: value });
  if (readOnly) {
    return (
      <div className="grid grid-cols-12 items-center gap-2 rounded-md border border-gray-200 bg-white p-2">
        <div className="col-span-3 px-2 py-1 text-xs text-muted-foreground">{translateDifficulty(t, item.difficulty)}</div>
        <div className="col-span-3 px-2 py-1 text-xs text-muted-foreground">{translateQuestionType(t, item.questionType)}</div>
        <div className="col-span-4 px-2 py-1 text-xs text-muted-foreground">{translateBloomSkill(t, item.bloomSkill)}</div>
        <div className="col-span-2 px-2 py-1 text-xs font-medium">{item.quantity ?? 1}</div>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-12 items-center gap-2 rounded-md border border-gray-200 bg-white p-2">
      <div className="col-span-3">
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
      <div className="col-span-3">
        <select
          value={item.questionType || 'SINGLE_CHOICE'}
          onChange={(e) => update('questionType', e.target.value)}
          className="w-full rounded-md border border-input bg-background px-2 py-1 text-xs shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring"
        >
          {MOCK_TEST_QUESTION_TYPES.map((type) => (
            <option key={type} value={type}>{translateQuestionType(t, type)}</option>
          ))}
        </select>
      </div>
      <div className="col-span-3">
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
      <div className="col-span-2">
        <Input
          type="number"
          min={1}
          value={item.quantity ?? 1}
          onChange={(e) => update('quantity', Math.max(1, Number(e.target.value) || 1))}
          className="h-8 text-xs"
        />
      </div>
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
}) {
  const { t } = useTranslation();
  const hasSubSections = Array.isArray(section.subConfigs) && section.subConfigs.length > 0;
  const isLeaf = !hasSubSections;
  const isEditing = !readOnly;
  const hasDescription = Boolean(section.description?.trim());
  const hasStructureRows = isLeaf && Array.isArray(section.structure) && section.structure.length > 0;
  const shouldRenderContent = isEditing || hasDescription || hasStructureRows || hasSubSections;
  const errors = readOnly ? [] : validateSection(section, t);

  const updateField = useCallback(
    (field, value) => onUpdate(path, { ...section, [field]: value }),
    [section, path, onUpdate],
  );

  const updateStructureItem = useCallback(
    (idx, nextItem) => {
      const nextStructure = (section.structure || []).map((it, i) => (i === idx ? nextItem : it));
      const total = sumStructureQuantity(nextStructure);
      onUpdate(path, { ...section, structure: nextStructure, numQuestions: total });
    },
    [section, path, onUpdate],
  );

  const addStructureItem = useCallback(() => {
    const nextStructure = [...(section.structure || []), blankStructureItem()];
    onUpdate(path, {
      ...section,
      structure: nextStructure,
      numQuestions: sumStructureQuantity(nextStructure),
    });
  }, [section, path, onUpdate]);

  const removeStructureItem = useCallback(
    (idx) => {
      const nextStructure = (section.structure || []).filter((_, i) => i !== idx);
      onUpdate(path, {
        ...section,
        structure: nextStructure,
        numQuestions: sumStructureQuantity(nextStructure),
      });
    },
    [section, path, onUpdate],
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
                />
              ))}
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
                <div className="col-span-3">{t('mockTestForms.structure.columnDifficulty', 'Difficulty')}</div>
                <div className="col-span-3">{t('mockTestForms.structure.columnQuestionType', 'Question type')}</div>
                <div className="col-span-3">{t('mockTestForms.structure.columnBloom', 'Bloom level')}</div>
                <div className="col-span-3">{t('mockTestForms.structure.columnQuantity', 'Quantity')}</div>
              </div>
              <div className="mt-1 space-y-2">
                {(section.structure || []).map((item, idx) => (
                  <StructureItemRow
                    key={idx}
                    item={item}
                    t={t}
                    readOnly={false}
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
            </div>
          )}

          {hasSubSections && (
            <div className="space-y-3 border-l-2 border-purple-200 pl-4">
              {isEditing && (
                <p className="text-sm font-medium text-purple-700">
                  {t('mockTestForms.structure.subSectionCount', 'Sub-sections ({{count}})', {
                    count: section.subConfigs.length,
                  })}
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
                />
              ))}
            </div>
          )}

          {isEditing && (
            <div className="flex flex-wrap items-center gap-2 pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => onAddSub(path)}
              >
                <Plus className="mr-1 h-3.5 w-3.5" />
                {t('mockTestForms.structure.addSubSection', 'Add sub-section')}
              </Button>
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
 * {difficulty, questionType, bloomSkill, quantity}.
 * Wrapper section chỉ có subConfigs.
 *
 * Props:
 * - sections: Array<Section>
 * - onChange: (nextSections) => void
 * - targetTotalQuestions?: number — để hiển thị badge "X / Y"
 * - topNotice?: string — thông báo (vd "Đã bỏ phần Listening")
 * - readOnly?: boolean — compact preview without field labels
 */
export function MockTestStructureEditor({
  sections,
  onChange,
  targetTotalQuestions,
  topNotice,
  readOnly = false,
}) {
  const { t } = useTranslation();
  const totalLeaf = useMemo(() => countLeafQuestions(sections), [sections]);
  const targetMet = !targetTotalQuestions || totalLeaf === targetTotalQuestions;

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

      <div className="flex items-center justify-between">
        <div className="text-sm">
          <span className="text-muted-foreground">{t('mockTestForms.structure.totalLeafLabel', 'Total leaf questions: ')}</span>
          <Badge className={targetMet ? 'bg-emerald-100 text-emerald-800' : 'bg-amber-100 text-amber-800'}>
            {totalLeaf}
            {targetTotalQuestions ? ` / ${targetTotalQuestions}` : ''}
          </Badge>
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
