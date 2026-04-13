import { useCallback, useMemo, useState } from 'react';

/**
 * Validator inline siêu nhẹ (không dùng zod/react-hook-form) cho các form admin.
 *
 * Dùng:
 *   const v = useFormValidator({
 *     code:        { required: true, pattern: /^[A-Z0-9_-]+$/, max: 64, message: 'Code không hợp lệ' },
 *     displayName: { required: true, min: 1, max: 200 },
 *     price:       { required: true, min: 0, max: 1_000_000_000, kind: 'number' },
 *   });
 *
 *   <input
 *     value={formData.code}
 *     onChange={(e) => { setFormData({ ...formData, code: e.target.value }); v.change('code', e.target.value); }}
 *     onBlur={() => v.touch('code')}
 *     className={cn('...', v.hasError('code') && 'border-rose-500 focus:ring-rose-500')}
 *   />
 *   {v.errorOf('code') ? <p className="mt-1 text-xs text-rose-600">{v.errorOf('code')}</p> : null}
 *
 *   if (!v.validateAll(formData)) { return; }  // dừng submit nếu sai
 *
 * Rule field:
 *   - required: true — bắt buộc có giá trị
 *   - kind: 'number' — parse thành number trước khi check min/max
 *   - min, max — với string là length; với number là giá trị
 *   - pattern — regex (string hoặc RegExp)
 *   - custom(value, all): string | null — trả về message nếu lỗi, null nếu OK
 *   - message — override message mặc định cho required/pattern
 */
export function useFormValidator(rules) {
  const [touched, setTouched] = useState({});
  const [errors, setErrors] = useState({});

  const ruleEntries = useMemo(() => Object.entries(rules || {}), [rules]);

  const validateField = useCallback((name, value, all = {}) => {
    const rule = rules?.[name];
    if (!rule) return null;

    const isEmpty = value === null || value === undefined || (typeof value === 'string' && value.trim() === '');
    if (rule.required && isEmpty) {
      return rule.message || 'Trường này là bắt buộc';
    }
    if (isEmpty) return null;

    if (rule.kind === 'number') {
      const num = Number(value);
      if (Number.isNaN(num)) return rule.message || 'Phải là số hợp lệ';
      if (typeof rule.min === 'number' && num < rule.min) {
        return rule.message || `Phải ≥ ${rule.min}`;
      }
      if (typeof rule.max === 'number' && num > rule.max) {
        return rule.message || `Phải ≤ ${rule.max.toLocaleString()}`;
      }
    } else {
      const str = String(value);
      if (typeof rule.min === 'number' && str.length < rule.min) {
        return rule.message || `Độ dài phải ≥ ${rule.min} ký tự`;
      }
      if (typeof rule.max === 'number' && str.length > rule.max) {
        return rule.message || `Độ dài phải ≤ ${rule.max} ký tự`;
      }
      if (rule.pattern) {
        const re = rule.pattern instanceof RegExp ? rule.pattern : new RegExp(rule.pattern);
        if (!re.test(str)) return rule.message || 'Định dạng không hợp lệ';
      }
    }

    if (typeof rule.custom === 'function') {
      const custom = rule.custom(value, all);
      if (custom) return custom;
    }
    return null;
  }, [rules]);

  const change = useCallback((name, value, all = {}) => {
    if (!touched[name]) return; /* chỉ show error sau khi đã touch. */
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value, all) }));
  }, [touched, validateField]);

  const touch = useCallback((name, value, all = {}) => {
    setTouched((prev) => ({ ...prev, [name]: true }));
    setErrors((prev) => ({ ...prev, [name]: validateField(name, value, all) }));
  }, [validateField]);

  const validateAll = useCallback((all = {}) => {
    const nextErrors = {};
    const nextTouched = { ...touched };
    let ok = true;
    for (const [name] of ruleEntries) {
      const err = validateField(name, all?.[name], all);
      nextErrors[name] = err;
      nextTouched[name] = true;
      if (err) ok = false;
    }
    setErrors(nextErrors);
    setTouched(nextTouched);
    return ok;
  }, [ruleEntries, validateField, touched]);

  const reset = useCallback(() => {
    setErrors({});
    setTouched({});
  }, []);

  const errorOf = useCallback((name) => (touched[name] ? errors[name] : null), [errors, touched]);
  const hasError = useCallback((name) => Boolean(touched[name] && errors[name]), [errors, touched]);
  const hasAnyError = useMemo(
    () => Object.values(errors).some((e) => Boolean(e)),
    [errors],
  );

  return {
    change,
    touch,
    validateAll,
    reset,
    errorOf,
    hasError,
    hasAnyError,
    errors,
    touched,
  };
}

export default useFormValidator;
