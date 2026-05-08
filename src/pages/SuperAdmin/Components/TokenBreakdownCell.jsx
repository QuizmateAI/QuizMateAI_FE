import { useTranslation } from 'react-i18next';

/**
 * Hien thi token cua 1 row AI call duoi dang 3 card: INPUT / OUTPUT / TOTAL.
 * Dung chung cho ca AI Costs va AI Audit table — tranh duplicate UI.
 *
 * row co the la `ai_usage_log` response (AI Costs) hoac `ai_token_audit_log` response (AI Audit).
 * Ca 2 deu co cac field: promptTokens, thoughtTokens, completionTokens, totalTokens.
 *
 * Output token = completionTokens + thoughtTokens (Gemini tach reasoning thanh thoughtTokens).
 */
function getTokenTone(isDarkMode) {
  return isDarkMode
    ? {
      box: 'border-slate-600 bg-slate-900/60',
      label: 'text-slate-200',
      value: 'text-white',
    }
    : {
      box: 'border-slate-300 bg-white',
      label: 'text-slate-700',
      value: 'text-slate-900',
    };
}

function formatInteger(value) {
  if (value === null || value === undefined) return '0';
  return Math.round(Number(value)).toLocaleString('vi-VN', { maximumFractionDigits: 0 });
}

export function getOutputTokens(row) {
  return Number(row?.completionTokens || 0) + Number(row?.thoughtTokens || 0);
}

export default function TokenBreakdownCell({ row, isDarkMode }) {
  const { t } = useTranslation();
  const outputTokens = getOutputTokens(row);
  const tone = getTokenTone(isDarkMode);
  const labelCls = 'text-[11px] font-semibold uppercase tracking-[0.18em]';

  return (
    <div className="mx-auto min-w-[240px]">
      <div className="grid grid-cols-2 gap-2">
        <div className={`rounded-2xl border px-3 py-3 text-center ${tone.box}`}>
          <p className={`${labelCls} ${tone.label}`}>
            {t('aiCosts.tokens.input', { defaultValue: 'Input' })}
          </p>
          <p className={`mt-1 text-base font-semibold tabular-nums ${tone.value}`}>
            {formatInteger(row?.promptTokens)}
          </p>
        </div>
        <div className={`rounded-2xl border px-3 py-3 text-center ${tone.box}`}>
          <p className={`${labelCls} ${tone.label}`}>
            {t('aiCosts.tokens.output', { defaultValue: 'Output' })}
          </p>
          <p className={`mt-1 text-base font-semibold tabular-nums ${tone.value}`}>
            {formatInteger(outputTokens)}
          </p>
        </div>
      </div>
      <div className={`mt-2 rounded-2xl border px-3 py-3 text-center ${tone.box}`}>
        <p className={`${labelCls} ${tone.label}`}>
          {t('aiCosts.tokens.total', { defaultValue: 'Total' })}
        </p>
        <p className={`mt-1 text-lg font-bold tabular-nums tracking-tight ${tone.value}`}>
          {formatInteger(row?.totalTokens)}
        </p>
      </div>
    </div>
  );
}
