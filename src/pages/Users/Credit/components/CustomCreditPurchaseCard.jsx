import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useTranslation } from "react-i18next";
import { Sparkles, AlertCircle, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";
import CreditIconImage from "@/components/ui/CreditIconImage";
import { getCustomCreditConfig } from "@/api/ManagementSystemAPI";
import { buildPaymentCreditsPath, buildWalletsPath, withQueryParams } from "@/lib/routePaths";

const FALLBACK_UNIT_PRICE = 200;
const FALLBACK_MIN_UNITS = 100;

function formatNumber(value, locale) {
  return new Intl.NumberFormat(locale).format(Number(value) || 0);
}

function formatVnd(value, locale) {
  return new Intl.NumberFormat(locale, {
    style: "currency",
    currency: "VND",
    maximumFractionDigits: 0,
  }).format(Number(value) || 0);
}

function normalizeConfig(response) {
  const data = response?.data?.data ?? response?.data ?? response ?? {};
  const unitPrice = Number(data?.unitPriceVnd);
  const minUnits = Number(data?.minUnits);
  return {
    unitPriceVnd: Number.isFinite(unitPrice) && unitPrice > 0 ? unitPrice : FALLBACK_UNIT_PRICE,
    minUnits: Number.isFinite(minUnits) && minUnits > 0 ? minUnits : FALLBACK_MIN_UNITS,
  };
}

export default function CustomCreditPurchaseCard({
  isDarkMode,
  locale,
  workspaceId = null,
  isGroupScopedPage = false,
  variant = "card",
}) {
  const isDialogVariant = variant === "dialog";
  const { t } = useTranslation();
  const navigate = useNavigate();

  const [config, setConfig] = useState({
    unitPriceVnd: FALLBACK_UNIT_PRICE,
    minUnits: FALLBACK_MIN_UNITS,
  });
  const [loadingConfig, setLoadingConfig] = useState(true);
  const [configError, setConfigError] = useState(false);
  const [creditAmount, setCreditAmount] = useState("");
  const [touched, setTouched] = useState(false);

  useEffect(() => {
    let cancelled = false;
    getCustomCreditConfig()
      .then((res) => {
        if (cancelled) return;
        const normalized = normalizeConfig(res);
        setConfig(normalized);
      })
      .catch(() => {
        if (cancelled) return;
        setConfigError(true);
      })
      .finally(() => {
        if (!cancelled) setLoadingConfig(false);
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const parsedAmount = useMemo(() => {
    if (creditAmount === "" || creditAmount == null) return null;
    const value = Number(creditAmount);
    if (!Number.isFinite(value) || value <= 0) return null;
    return Math.floor(value);
  }, [creditAmount]);

  const isBelowMin = parsedAmount != null && parsedAmount < config.minUnits;
  const totalPrice = parsedAmount && parsedAmount >= config.minUnits
    ? parsedAmount * config.unitPriceVnd
    : 0;

  const canSubmit = parsedAmount != null && parsedAmount >= config.minUnits && !loadingConfig;

  const handleAmountChange = (event) => {
    const next = event.target.value;
    if (next === "" || /^\d+$/.test(next)) {
      setCreditAmount(next);
    }
  };

  const handlePurchase = () => {
    if (!canSubmit) {
      setTouched(true);
      return;
    }
    const queryParams = { customCredits: parsedAmount };
    if (isGroupScopedPage && workspaceId) {
      queryParams.workspaceId = workspaceId;
    }
    navigate(withQueryParams(buildPaymentCreditsPath(), queryParams), {
      state: { from: buildWalletsPath(), workspaceId },
    });
  };

  const helperText = configError
    ? t("walletPage.customCredit.configError", {
        defaultValue: "Không tải được cấu hình mua credit. Vui lòng thử lại.",
      })
    : t("walletPage.customCredit.helper", {
        defaultValue: "Tối thiểu {{min}} credit · Đơn giá {{price}}/credit",
        min: formatNumber(config.minUnits, locale),
        price: formatVnd(config.unitPriceVnd, locale),
      });

  const minBadgeText = t("walletPage.customCredit.minBadge", {
    defaultValue: "Tối thiểu {{min}} credit",
    min: formatNumber(config.minUnits, locale),
  });
  const priceBadgeText = t("walletPage.customCredit.priceBadge", {
    defaultValue: "Đơn giá {{price}}/credit",
    price: formatVnd(config.unitPriceVnd, locale),
  });

  const showBelowMinError = touched && isBelowMin;
  const showPreview = parsedAmount != null && parsedAmount >= config.minUnits;

  const wrapperClass = isDialogVariant
    ? ""
    : `rounded-2xl border p-4 ${isDarkMode ? "border-blue-400/20 bg-blue-500/10" : "border-blue-200 bg-blue-50"}`;

  return (
    <div className={wrapperClass}>
      {isDialogVariant ? null : (
        <div className="mb-3 flex items-start justify-between gap-3">
          <div>
            <h4 className="flex items-center gap-2 text-sm font-black">
              <Sparkles className={`h-4 w-4 ${isDarkMode ? "text-blue-300" : "text-blue-600"}`} />
              {t("walletPage.customCredit.title", { defaultValue: "Tự nhập số credit" })}
            </h4>
            <p className={`mt-1 text-xs ${isDarkMode ? "text-blue-100/80" : "text-blue-700/90"}`}>
              {helperText}
            </p>
          </div>
        </div>
      )}

      {isDialogVariant ? (
        configError ? (
          <p className={`mb-3 flex items-center gap-1 text-xs ${isDarkMode ? "text-rose-300" : "text-rose-600"}`}>
            <AlertCircle className="h-3.5 w-3.5" />
            {helperText}
          </p>
        ) : (
          <div className="mb-4 flex flex-wrap items-center gap-2">
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
              isDarkMode ? "bg-slate-900 text-slate-300 ring-slate-700" : "bg-slate-100 text-slate-700 ring-slate-200"
            }`}>
              {minBadgeText}
            </span>
            <span className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${
              isDarkMode ? "bg-blue-500/15 text-blue-200 ring-blue-400/30" : "bg-blue-50 text-blue-700 ring-blue-200"
            }`}>
              {priceBadgeText}
            </span>
          </div>
        )
      ) : null}

      <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
        <input
          type="text"
          inputMode="numeric"
          pattern="[0-9]*"
          value={creditAmount}
          onChange={handleAmountChange}
          onBlur={() => setTouched(true)}
          disabled={loadingConfig || configError}
          placeholder={t("walletPage.customCredit.placeholder", {
            defaultValue: "VD: {{example}}",
            example: formatNumber(Math.max(config.minUnits, 500), locale),
          })}
          className={`min-h-[44px] w-full rounded-xl border px-3 py-2 text-sm font-semibold tabular-nums outline-none transition-colors sm:flex-1 ${
            isDarkMode
              ? "border-slate-700 bg-slate-950/60 text-slate-100 placeholder:text-slate-500 focus:border-blue-400"
              : "border-slate-200 bg-white text-slate-900 placeholder:text-slate-400 focus:border-blue-500"
          } ${showBelowMinError ? (isDarkMode ? "border-rose-400/60" : "border-rose-400") : ""}`}
          aria-label={t("walletPage.customCredit.inputAria", { defaultValue: "Số credit muốn mua" })}
        />
        <Button
          type="button"
          onClick={handlePurchase}
          disabled={!canSubmit}
          className="min-h-[44px] w-full bg-blue-600 px-5 text-sm font-bold text-white hover:bg-blue-700 disabled:cursor-not-allowed disabled:opacity-50 sm:w-auto"
        >
          {t("walletPage.customCredit.buy", { defaultValue: "Mua ngay" })}
        </Button>
      </div>

      {showBelowMinError ? (
        <p className={`mt-2 flex items-center gap-1 text-xs ${isDarkMode ? "text-rose-300" : "text-rose-600"}`}>
          <AlertCircle className="h-3.5 w-3.5" />
          {t("walletPage.customCredit.belowMin", {
            defaultValue: "Số credit tối thiểu là {{min}}.",
            min: formatNumber(config.minUnits, locale),
          })}
        </p>
      ) : null}

      {showPreview ? (
        <div
          className={`mt-4 overflow-hidden rounded-2xl ring-1 ring-inset ${
            isDarkMode
              ? "bg-gradient-to-br from-blue-500/15 via-slate-900 to-emerald-500/10 ring-blue-400/25"
              : "bg-gradient-to-br from-blue-50 via-white to-emerald-50 ring-blue-100"
          }`}
        >
          <div className="flex items-stretch divide-x divide-dashed">
            <div className="flex flex-1 items-center gap-3 p-4">
              <CreditIconImage
                alt={t("common.creditIconAlt", { brandName: "QuizMate AI" })}
                className="h-10 w-10 shrink-0 rounded-xl"
              />
              <div className="min-w-0">
                <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
                  isDarkMode ? "text-emerald-300" : "text-emerald-700"
                }`}>
                  {t("walletPage.customCredit.youGet", { defaultValue: "Bạn sẽ nhận" })}
                </p>
                <p className={`mt-0.5 text-lg font-black tabular-nums ${isDarkMode ? "text-slate-50" : "text-slate-900"}`}>
                  {formatNumber(parsedAmount, locale)}{" "}
                  <span className={`text-xs font-semibold ${isDarkMode ? "text-slate-400" : "text-slate-500"}`}>
                    credit
                  </span>
                </p>
              </div>
            </div>

            <div
              className={`flex shrink-0 items-center justify-center px-2 ${
                isDarkMode ? "border-slate-700" : "border-slate-200"
              }`}
              aria-hidden="true"
            >
              <ArrowRight className={`h-4 w-4 ${isDarkMode ? "text-slate-500" : "text-slate-400"}`} />
            </div>

            <div className="flex flex-1 flex-col items-end justify-center p-4 text-right">
              <p className={`text-[10px] font-bold uppercase tracking-[0.14em] ${
                isDarkMode ? "text-blue-300" : "text-blue-700"
              }`}>
                {t("walletPage.customCredit.totalLabel", { defaultValue: "Tổng tiền" })}
              </p>
              <p className={`mt-0.5 text-2xl font-black tabular-nums ${isDarkMode ? "text-blue-200" : "text-blue-700"}`}>
                {formatVnd(totalPrice, locale)}
              </p>
            </div>
          </div>

          <div
            className={`flex items-center justify-between gap-2 border-t px-4 py-2 text-[11px] ${
              isDarkMode ? "border-slate-800/80 text-slate-400" : "border-slate-200/80 text-slate-500"
            }`}
          >
            <span className="font-medium">
              {t("walletPage.customCredit.breakdown", {
                defaultValue: "{{credits}} × {{unitPrice}}",
                credits: formatNumber(parsedAmount, locale),
                unitPrice: formatVnd(config.unitPriceVnd, locale),
              })}
            </span>
            <span className={`inline-flex items-center gap-1 font-semibold ${
              isDarkMode ? "text-emerald-300" : "text-emerald-700"
            }`}>
              <Sparkles className="h-3 w-3" />
              {t("walletPage.customCredit.readyToUse", { defaultValue: "Dùng ngay sau khi thanh toán" })}
            </span>
          </div>
        </div>
      ) : null}
    </div>
  );
}
