import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  CreditCard,
  Download,
  FileText,
  LifeBuoy,
  ReceiptText,
  RefreshCw,
  ShieldCheck,
  Smartphone,
  Sparkles,
  X,
} from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import PaymentInvoicePreview from './PaymentInvoicePreview';

const COPY = {
  vi: {
    processingEyebrow: 'Đang xử lý',
    processingTitle: 'Đang xử lý thanh toán...',
    processingSub: 'Vui lòng giữ cửa sổ mở. Chúng tôi đang xác minh giao dịch với ngân hàng.',
    elapsed: 'Đã trôi',
    usually: 'thường khoảng 30s',
    cancel: 'Hủy giao dịch',
    secured: 'Bảo mật bởi VNPay 3-D Secure',
    successEyebrow: 'Thanh toán thành công',
    successTitle: 'Mở khóa thành công',
    creditSuccessTitle: 'Chúc mừng, bạn đã mua credit thành công',
    successSub: 'Gói Pro đã được kích hoạt. Bạn có thể bắt đầu tạo quiz không giới hạn ngay bây giờ.',
    creditSuccessSub: 'Credit đã được cộng vào ví. Hóa đơn và biên lai đã sẵn sàng để xem hoặc tải xuống.',
    activated: 'Đã thanh toán',
    welcome: 'Chào mừng bạn đến với',
    creditReady: 'Đã cộng vào ví của bạn',
    validUntil: 'Hiệu lực đến',
    autoRenew: 'tự động gia hạn',
    downloadInvoice: 'Tải hóa đơn',
    viewReceipt: 'Xem biên lai',
    hideReceipt: 'Ẩn hóa đơn',
    startLearning: 'Bắt đầu học ngay',
    receiptSent: 'Biên lai và hóa đơn cũng đã được gửi tới email tài khoản của bạn.',
    invoiceTitle: 'Hóa đơn',
    invoiceIssuedAt: 'Phát hành lúc',
    invoiceItem: 'Nội dung',
    invoiceEmailSent: 'Bản sao đã được gửi qua email.',
    closeInvoice: 'Đóng hóa đơn',
    subtotal: 'Tạm tính',
    totalPaid: 'Đã thanh toán',
    paid: 'Đã thanh toán',
    failureEyebrow: 'Giao dịch thất bại',
    failureTitle: 'Đừng lo, chưa bị trừ tiền',
    failureSub: 'Giao dịch không hoàn tất. Bạn có thể thử lại ngay hoặc chọn một phương thức khác.',
    errorCode: 'Mã lỗi VNP_24',
    errorTitle: 'Giao dịch bị hủy tại ngân hàng',
    errorSub: 'Bạn đã hủy thao tác trên cổng VNPay. Không có khoản phí nào được phát sinh.',
    tryOne: 'Try one of these',
    retrySame: 'Thử lại với cùng phương thức',
    switchCard: 'Đổi sang thẻ Visa hoặc Mastercard',
    switchWallet: 'Thanh toán bằng MoMo hoặc ZaloPay',
    changeMethod: 'Đổi phương thức',
    retry: 'Thử lại',
    support: 'Liên hệ hỗ trợ 24/7',
    receipt: 'Biên lai',
    order: 'Đơn hàng',
    txDetails: 'Chi tiết giao dịch',
    orderId: 'Mã đơn',
    plan: 'Gói',
    amount: 'Số tiền',
    method: 'Phương thức',
    customer: 'Khách hàng',
    time: 'Thời gian',
    txId: 'Mã giao dịch',
    status: 'Trạng thái',
    cancelled: 'Đã hủy',
    pending: 'Đang xử lý',
    createOrder: 'Đã tạo đơn hàng',
    createOrderDetail: 'Mã đơn đã được ghi nhận',
    verifyCard: 'Cổng thanh toán xác nhận',
    verifyCardDetail: 'Đối soát mã giao dịch',
    bank: 'Đang chờ kết quả',
    bankDetail: 'Đồng bộ phản hồi từ cổng thanh toán',
    finish: 'Cập nhật quyền lợi',
    finishDetail: 'Cộng credit hoặc kích hoạt gói',
    providerApproved: 'Thanh toán đã xác nhận',
    providerApprovedDetail: 'Giao dịch hợp lệ từ cổng thanh toán',
    activatePlan: 'Đã kích hoạt gói',
    activatePlanDetail: 'Quyền lợi có hiệu lực ngay',
    creditDelivered: 'Đã cộng credit vào ví',
    creditDeliveredDetail: 'Số credit đã sẵn sàng để sử dụng',
    invoiceIssued: 'Đã phát hành hóa đơn',
    invoiceIssuedDetail: 'Biên lai đã gửi email tài khoản',
    bankRejected: 'Thanh toán không thành công',
    bankRejectedDetail: 'Cổng thanh toán trả về trạng thái thất bại',
    stopped: 'Đơn hàng đã dừng',
    stoppedDetail: 'Không ghi nhận khoản thu',
    ai: 'AI',
    unlimited: 'Unlimited',
    group: 'Group',
    defaultPlan: 'QuizMate Pro',
    updating: 'Đang cập nhật',
  },
  en: {
    processingEyebrow: 'Processing',
    processingTitle: 'Processing your payment...',
    processingSub: 'Please keep this window open while we confirm the transaction with your bank.',
    elapsed: 'Elapsed',
    usually: 'usually around 30s',
    cancel: 'Cancel transaction',
    secured: 'Secured by VNPay 3-D Secure',
    successEyebrow: 'Payment successful',
    successTitle: 'Unlocked successfully',
    creditSuccessTitle: 'Congrats, your credit package is ready',
    successSub: 'Your Pro plan is active. You can start creating unlimited quizzes now.',
    creditSuccessSub: 'Credits have been added to your wallet. Your receipt and invoice are ready to view or download.',
    activated: 'Paid',
    welcome: 'Welcome to',
    creditReady: 'Added to your wallet',
    validUntil: 'Valid until',
    autoRenew: 'auto-renews',
    downloadInvoice: 'Download invoice',
    viewReceipt: 'View receipt',
    hideReceipt: 'Hide invoice',
    startLearning: 'Start learning now',
    receiptSent: 'A receipt and invoice have also been sent to your account email.',
    invoiceTitle: 'Invoice',
    invoiceIssuedAt: 'Issued at',
    invoiceItem: 'Item',
    invoiceEmailSent: 'A copy has been sent by email.',
    closeInvoice: 'Close invoice',
    subtotal: 'Subtotal',
    totalPaid: 'Total paid',
    paid: 'Paid',
    failureEyebrow: 'Transaction failed',
    failureTitle: "Don't worry, no charge made",
    failureSub: 'The transaction did not complete. You can retry now or pick another method.',
    errorCode: 'Error code VNP_24',
    errorTitle: 'Cancelled at the bank',
    errorSub: 'You cancelled on the VNPay gateway. No charge was made.',
    tryOne: 'Try one of these',
    retrySame: 'Retry with the same method',
    switchCard: 'Switch to Visa or Mastercard',
    switchWallet: 'Pay with MoMo or ZaloPay',
    changeMethod: 'Change method',
    retry: 'Retry',
    support: 'Contact support 24/7',
    receipt: 'Receipt',
    order: 'Order',
    txDetails: 'Transaction details',
    orderId: 'Order ID',
    plan: 'Plan',
    amount: 'Amount',
    method: 'Method',
    customer: 'Customer',
    time: 'Time',
    txId: 'Transaction ID',
    status: 'Status',
    cancelled: 'Cancelled',
    pending: 'Processing',
    createOrder: 'Order created',
    createOrderDetail: 'Order number recorded',
    verifyCard: 'Payment provider confirmed',
    verifyCardDetail: 'Reconciling transaction reference',
    bank: 'Waiting for result',
    bankDetail: 'Syncing the gateway response',
    finish: 'Updating benefits',
    finishDetail: 'Adding credits or activating the plan',
    providerApproved: 'Payment confirmed',
    providerApprovedDetail: 'Gateway transaction is valid',
    activatePlan: 'Plan activated',
    activatePlanDetail: 'Benefits are active immediately',
    creditDelivered: 'Credits added to wallet',
    creditDeliveredDetail: 'Credits are ready to use',
    invoiceIssued: 'Invoice issued',
    invoiceIssuedDetail: 'Receipt sent to account email',
    bankRejected: 'Payment not completed',
    bankRejectedDetail: 'The payment provider returned a failed status',
    stopped: 'Order stopped',
    stoppedDetail: 'No payment was recorded',
    ai: 'AI',
    unlimited: 'Unlimited',
    group: 'Group',
    defaultPlan: 'QuizMate Pro',
    updating: 'Updating',
  },
};

const PLAN_LABELS = {
  pro: 'QuizMate Pro',
  elite: 'QuizMate Elite',
};

const CONFETTI_COLORS = ['#facc15', '#ff8682', '#2563eb', '#10b981', '#a855f7'];

function getCopy(lang) {
  return String(lang || '').toLowerCase().startsWith('en') ? COPY.en : COPY.vi;
}

function displayPlanName(planId, transaction, copy) {
  const explicitName = transaction?.planName || transaction?.plan;
  if (explicitName) return explicitName;

  const normalizedPlanId = String(planId || '').toLowerCase();
  return PLAN_LABELS[normalizedPlanId] || copy.defaultPlan;
}

function rowValue(value, fallback = '') {
  return value == null || value === '' ? fallback : String(value);
}

function ResultStateStyles() {
  return (
    <style>{`
      @keyframes qm-spin-slow { to { transform: rotate(360deg); } }
      @keyframes qm-pulse-ring {
        0% { transform: scale(1); opacity: 0.45; }
        100% { transform: scale(1.7); opacity: 0; }
      }
      @keyframes qm-bar {
        0% { transform: translateX(-120%); }
        100% { transform: translateX(320%); }
      }
      @keyframes qm-confetti {
        0% { transform: translate3d(0, -18px, 0) rotate(0deg); opacity: 0; }
        10% { opacity: 1; }
        100% { transform: translate3d(var(--qm-drift), 112vh, 0) rotate(720deg); opacity: 0; }
      }
      @keyframes qm-pop-in {
        0% { transform: scale(0.72); opacity: 0; }
        70% { transform: scale(1.04); opacity: 1; }
        100% { transform: scale(1); opacity: 1; }
      }
      @keyframes qm-x-shake {
        0%, 100% { transform: translateX(0); }
        20%, 60% { transform: translateX(-5px); }
        40%, 80% { transform: translateX(5px); }
      }
      @media (prefers-reduced-motion: reduce) {
        .qm-motion { animation: none !important; }
      }
    `}</style>
  );
}

function StateShell({
  tone,
  eyebrow,
  title,
  subtitle,
  hero,
  timeline,
  details,
  actions,
  footnote,
  isDarkMode = false,
}) {
  const toneClass = {
    blue: isDarkMode
      ? 'from-slate-950 via-slate-950 to-blue-950'
      : 'from-blue-50 via-slate-50 to-indigo-50',
    emerald: isDarkMode
      ? 'from-slate-950 via-emerald-950/70 to-cyan-950'
      : 'from-emerald-50 via-slate-50 to-cyan-50',
    rose: isDarkMode
      ? 'from-slate-950 via-rose-950/60 to-slate-950'
      : 'from-rose-50 via-slate-50 to-orange-50',
  }[tone];

  return (
    <section
      className={cn(
        'relative min-h-[calc(100vh-3.5rem)] overflow-hidden bg-gradient-to-br px-4 py-8 sm:px-6 lg:px-10',
        toneClass,
        isDarkMode ? 'text-slate-50' : 'text-slate-950',
      )}
      aria-live="polite"
    >
      <ResultStateStyles />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 opacity-[0.05]"
        style={{
          backgroundImage:
            'linear-gradient(rgba(15,23,42,.72) 1px, transparent 1px), linear-gradient(90deg, rgba(15,23,42,.72) 1px, transparent 1px)',
          backgroundSize: '48px 48px',
        }}
      />
      <div className="relative mx-auto grid min-h-[calc(100vh-8rem)] w-full max-w-6xl items-center gap-8 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="min-w-0">
          <Badge
            variant="outline"
            className={cn(
              'mb-5 rounded-full border px-3 py-1 text-[10px] font-black uppercase tracking-[0.2em]',
              isDarkMode ? 'border-slate-700 bg-slate-900/70 text-slate-200' : 'border-slate-200 bg-white/90 text-slate-700',
            )}
          >
            {eyebrow}
          </Badge>
          <h1 className="max-w-3xl text-4xl font-black leading-[1.05] tracking-normal sm:text-5xl">
            {title}
          </h1>
          {subtitle ? (
            <p className={cn('mt-3 max-w-xl text-sm font-medium leading-6 sm:text-base', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
              {subtitle}
            </p>
          ) : null}
          <div className="mt-7">{hero}</div>
          <div className="mt-7">{timeline}</div>
        </div>
        <div className="flex min-w-0 flex-col gap-4">
          {details}
          {actions}
          {footnote ? (
            <p className={cn('text-center text-xs font-medium', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
              {footnote}
            </p>
          ) : null}
        </div>
      </div>
    </section>
  );
}

function Timeline({ steps, currentIdx, tone, isDarkMode = false }) {
  const accent = {
    blue: { bg: 'bg-blue-500', text: 'text-blue-600', ring: 'rgba(37, 99, 235, 0.26)' },
    emerald: { bg: 'bg-emerald-500', text: 'text-emerald-600', ring: 'rgba(16, 185, 129, 0.26)' },
    rose: { bg: 'bg-rose-500', text: 'text-rose-600', ring: 'rgba(244, 63, 94, 0.26)' },
  }[tone];

  return (
    <ol className="relative ml-2 pl-6">
      <span className={cn('absolute left-[9px] top-2 bottom-2 w-px', isDarkMode ? 'bg-slate-700' : 'bg-slate-200')} />
      {steps.map((step, index) => {
        const done = index < currentIdx;
        const active = index === currentIdx;
        return (
          <li key={`${step.label}-${index}`} className="relative pb-5 last:pb-0">
            <span
              className={cn(
                'absolute -left-[22px] top-0.5 flex h-5 w-5 items-center justify-center rounded-full',
                active ? accent.text : '',
                done ? `${accent.bg} text-white` : isDarkMode ? 'bg-slate-950' : 'bg-white',
              )}
              style={{
                boxShadow: done
                  ? 'none'
                  : active
                    ? `0 0 0 4px ${accent.ring}, inset 0 0 0 2px currentColor`
                    : 'inset 0 0 0 2px rgb(203 213 225)',
              }}
            >
              {done ? <Check className="h-3 w-3" /> : <span className={cn('h-1.5 w-1.5 rounded-full', active ? accent.bg : 'bg-slate-300')} />}
            </span>
            {active ? (
              <span className={cn('qm-motion absolute -left-[22px] top-0.5 h-5 w-5 rounded-full opacity-30', accent.bg)} style={{ animation: 'qm-pulse-ring 1.6s ease-out infinite' }} />
            ) : null}
            <div className="min-w-0">
              <p className={cn('text-sm font-black', active ? (isDarkMode ? 'text-white' : 'text-slate-950') : done ? (isDarkMode ? 'text-slate-200' : 'text-slate-700') : 'text-slate-400')}>
                {step.label}
              </p>
            </div>
            {step.detail ? (
              <p className={cn('mt-0.5 text-xs', active ? (isDarkMode ? 'text-slate-300' : 'text-slate-600') : 'text-slate-400')}>
                {step.detail}
              </p>
            ) : null}
            {step.time ? (
              <p className="mt-1 text-[11px] font-medium tabular-nums text-slate-400">
                {step.time}
              </p>
            ) : null}
          </li>
        );
      })}
    </ol>
  );
}

function DetailsPanel({ id, title, rows, tone, footer, isDarkMode = false }) {
  const ringClass = {
    blue: isDarkMode ? 'ring-blue-900/50' : 'ring-blue-100',
    emerald: isDarkMode ? 'ring-emerald-900/50' : 'ring-emerald-100',
    rose: isDarkMode ? 'ring-rose-900/50' : 'ring-rose-100',
  }[tone];

  return (
    <section
      id={id}
      className={cn(
        'rounded-[24px] p-6 ring-1 shadow-[0_24px_70px_-46px_rgba(15,23,42,0.34)]',
        ringClass,
        isDarkMode ? 'bg-slate-900 text-slate-100' : 'bg-white text-slate-950',
      )}
    >
      <div className="mb-4 flex items-center gap-2">
        <ReceiptText className="h-4 w-4 text-slate-400" />
        <span className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
          {title}
        </span>
      </div>
      <dl className="space-y-3">
        {rows.filter((row) => row.value).map((row) => (
          <div key={row.label} className="flex items-start justify-between gap-4 text-sm">
            <dt className={cn('shrink-0', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
              {row.label}
            </dt>
            <dd className={cn('min-w-0 max-w-full break-all text-right font-bold tabular-nums', row.emph ? 'text-base' : '', isDarkMode ? 'text-slate-100' : 'text-slate-800')}>
              {row.value}
            </dd>
          </div>
        ))}
      </dl>
      {footer ? (
        <div className={cn('mt-5 border-t border-dashed pt-4', isDarkMode ? 'border-slate-700' : 'border-slate-200')}>
          {footer}
        </div>
      ) : null}
    </section>
  );
}

function createBaseRows(copy, transaction, planName) {
  return [
    { label: copy.orderId, value: rowValue(transaction?.orderId) },
    { label: copy.plan, value: planName },
    { label: copy.amount, value: rowValue(transaction?.amountLabel), emph: true },
    { label: copy.method, value: rowValue(transaction?.method) },
    { label: copy.customer, value: rowValue(transaction?.customer) },
  ];
}

export function ProcessingScreen({ lang = 'vi', onAction, transaction = {}, planId = 'pro', isDarkMode = false }) {
  const copy = getCopy(lang);
  const planName = displayPlanName(planId, transaction, copy);
  const [currentIdx, setCurrentIdx] = useState(0);
  const [seconds, setSeconds] = useState(0);
  const amountLabel = rowValue(transaction.amountLabel, copy.updating);

  useEffect(() => {
    const startTime = Date.now();
    const stepTimer = window.setInterval(() => {
      setCurrentIdx((index) => Math.min(index + 1, 3));
    }, 2200);
    const secondTimer = window.setInterval(() => {
      setSeconds(Math.max(0, Math.floor((Date.now() - startTime) / 1000)));
    }, 1000);

    return () => {
      window.clearInterval(stepTimer);
      window.clearInterval(secondTimer);
    };
  }, []);

  const steps = [
    { label: copy.createOrder, detail: copy.createOrderDetail, time: currentIdx === 0 ? 'now' : '' },
    { label: copy.verifyCard, detail: copy.verifyCardDetail, time: currentIdx === 1 ? 'now' : '' },
    { label: copy.bank, detail: copy.bankDetail, time: currentIdx === 2 ? 'now' : '' },
    { label: copy.finish, detail: copy.finishDetail, time: currentIdx >= 3 ? 'now' : '' },
  ];

  const hero = (
    <div className={cn('rounded-[24px] p-6 ring-1 shadow-[0_30px_70px_-42px_rgba(37,99,235,0.45)]', isDarkMode ? 'bg-slate-900 ring-blue-900/50' : 'bg-white ring-blue-100')}>
      <div className="flex items-center gap-5">
        <div className="relative h-20 w-20 shrink-0">
          <span
            className="qm-motion absolute inset-0 rounded-full"
            style={{
              animation: 'qm-spin-slow 1.8s linear infinite',
              background: 'conic-gradient(from 0deg, #2563eb, #818cf8, #38bdf8, #2563eb)',
              maskImage: 'radial-gradient(circle, transparent 55%, #000 58%)',
              WebkitMaskImage: 'radial-gradient(circle, transparent 55%, #000 58%)',
            }}
          />
          <span className="qm-motion absolute -inset-1 rounded-full border border-blue-200" style={{ animation: 'qm-pulse-ring 1.8s ease-out infinite' }} />
          <span className={cn('absolute inset-3 flex items-center justify-center rounded-full', isDarkMode ? 'bg-slate-950' : 'bg-white')}>
            <CreditCard className="h-7 w-7 text-blue-600" />
          </span>
        </div>
        <div className="min-w-0">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-blue-600">
            {rowValue(transaction.method, 'VNPay')}
          </p>
          <p className={cn('mt-1 truncate text-2xl font-black tracking-normal', isDarkMode ? 'text-white' : 'text-slate-950')}>
            {amountLabel}
          </p>
          <p className={cn('mt-1 text-xs font-medium', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
            {copy.elapsed} <span className="font-black tabular-nums">{seconds}s</span>, {copy.usually}
          </p>
        </div>
      </div>
      <div className={cn('mt-5 h-1.5 overflow-hidden rounded-full', isDarkMode ? 'bg-slate-800' : 'bg-blue-50')}>
        <span
          className="qm-motion block h-full w-1/3 rounded-full"
          style={{
            animation: 'qm-bar 1.55s ease-in-out infinite',
            background: 'linear-gradient(90deg, transparent, #2563eb, #38bdf8, transparent)',
          }}
        />
      </div>
    </div>
  );

  const details = (
    <DetailsPanel
      tone="blue"
      title={copy.order}
      rows={createBaseRows(copy, transaction, planName)}
      isDarkMode={isDarkMode}
      footer={(
        <div className="flex items-center gap-2 text-[11px] font-bold text-slate-500">
          <ShieldCheck className="h-4 w-4 text-emerald-500" />
          {copy.secured}
        </div>
      )}
    />
  );

  const actions = (
    <Button
      type="button"
      variant="outline"
      onClick={() => onAction?.('cancel')}
      className={cn('h-12 rounded-2xl text-sm font-bold', isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800' : 'bg-white text-slate-700 hover:bg-slate-50')}
    >
      <X className="h-4 w-4" />
      {copy.cancel}
    </Button>
  );

  return (
    <StateShell
      tone="blue"
      eyebrow={copy.processingEyebrow}
      title={copy.processingTitle}
      subtitle={copy.processingSub}
      hero={hero}
      timeline={<Timeline steps={steps} currentIdx={currentIdx} tone="blue" isDarkMode={isDarkMode} />}
      details={details}
      actions={actions}
      isDarkMode={isDarkMode}
    />
  );
}

export function SuccessScreen({ lang = 'vi', planId = 'pro', onAction, transaction = {}, validUntil = '', isDarkMode = false }) {
  const copy = getCopy(lang);
  const planName = displayPlanName(planId, transaction, copy);
  const isCreditPurchase = String(transaction.purchaseType || '').toUpperCase() === 'CREDIT';
  const [showInvoice, setShowInvoice] = useState(false);
  const invoiceRef = useRef(null);
  const confetti = useMemo(() => Array.from({ length: 36 }, (_, index) => ({
    left: (index * 53) % 100,
    delay: (index * 0.07) % 2.5,
    duration: 2.4 + (index % 5) * 0.38,
    color: CONFETTI_COLORS[index % CONFETTI_COLORS.length],
    size: 6 + (index % 4) * 2,
    shape: index % 3,
    drift: `${(index % 2 === 0 ? 1 : -1) * (12 + (index % 5) * 4)}px`,
  })), []);

  useEffect(() => {
    if (!showInvoice) return;
    window.setTimeout(() => {
      invoiceRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 0);
  }, [showInvoice]);

  const steps = [
    { label: copy.createOrder, detail: rowValue(transaction.orderId) },
    { label: copy.providerApproved, detail: copy.providerApprovedDetail },
    {
      label: isCreditPurchase ? copy.creditDelivered : copy.activatePlan,
      detail: isCreditPurchase ? copy.creditDeliveredDetail : copy.activatePlanDetail,
    },
    { label: copy.invoiceIssued, detail: copy.invoiceIssuedDetail, time: rowValue(transaction.time) },
  ];

  const hero = (
    <div
      className="relative overflow-hidden rounded-[24px] p-6 text-white shadow-[0_30px_70px_-34px_rgba(16,185,129,0.55)] sm:p-8"
      style={{ background: 'linear-gradient(135deg, #10b981 0%, #14b8a6 58%, #06b6d4 100%)' }}
    >
      <div className="pointer-events-none absolute inset-0 overflow-hidden" aria-hidden="true">
        {confetti.map((piece, index) => (
          <span
            key={index}
            className="qm-motion absolute -top-5"
            style={{
              '--qm-drift': piece.drift,
              left: `${piece.left}%`,
              width: piece.size,
              height: piece.size,
              background: piece.color,
              borderRadius: piece.shape === 0 ? '999px' : piece.shape === 1 ? '2px' : '0',
              transform: piece.shape === 2 ? 'rotate(45deg)' : 'none',
              animation: `qm-confetti ${piece.duration}s ease-in ${piece.delay}s infinite`,
              opacity: 0.9,
            }}
          />
        ))}
      </div>
      <div className="relative flex items-start justify-between gap-6">
        <div className="min-w-0">
          <Badge className="rounded-full border-white/20 bg-white/15 px-3 py-1 text-[10px] font-black uppercase tracking-[0.18em] text-white hover:bg-white/15">
            <Sparkles className="mr-1 h-3 w-3" />
            {copy.activated}
          </Badge>
          <h2 className="mt-4 text-3xl font-black leading-tight tracking-normal">
            {isCreditPurchase ? planName : copy.welcome}
            <br />
            <span>{isCreditPurchase ? copy.creditReady : planName}</span>
          </h2>
          {isCreditPurchase ? (
            <p className="mt-2 text-sm font-medium text-white/90">
              {copy.creditSuccessSub}
            </p>
          ) : (
            <p className="mt-2 text-sm font-medium text-white/90">
              {copy.validUntil} <span className="font-black">{validUntil || copy.updating}</span>, {copy.autoRenew}
            </p>
          )}
        </div>
        <span className="qm-motion flex h-16 w-16 shrink-0 items-center justify-center rounded-full bg-white/20" style={{ animation: 'qm-pop-in 0.55s ease-out' }}>
          <Check className="h-8 w-8 stroke-[3]" />
        </span>
      </div>
    </div>
  );

  const details = (
    <>
      <DetailsPanel
        id="payment-receipt"
        tone="emerald"
        title={copy.receipt}
        rows={[
          { label: copy.txId, value: rowValue(transaction.transactionId) },
          { label: copy.orderId, value: rowValue(transaction.orderId) },
          { label: copy.plan, value: planName },
          { label: copy.amount, value: rowValue(transaction.amountLabel), emph: true },
          { label: copy.method, value: rowValue(transaction.method) },
          { label: copy.time, value: rowValue(transaction.time) },
        ]}
        isDarkMode={isDarkMode}
        footer={(
          <Button
            type="button"
            variant="secondary"
            onClick={() => onAction?.('downloadInvoice')}
            className={cn('h-10 w-full rounded-xl text-xs font-black', isDarkMode ? 'bg-slate-800 text-slate-100 hover:bg-slate-700' : 'bg-slate-100 text-slate-700 hover:bg-slate-200')}
          >
            <Download className="h-3.5 w-3.5" />
            {copy.downloadInvoice}
          </Button>
        )}
      />
      {showInvoice ? (
        <div ref={invoiceRef} className="mt-4">
          <PaymentInvoicePreview
            copy={copy}
            isDarkMode={isDarkMode}
            onClose={() => setShowInvoice(false)}
            onDownload={() => onAction?.('downloadInvoice')}
            planName={planName}
            transaction={transaction}
          />
        </div>
      ) : null}
    </>
  );

  const actions = (
    <div className="grid gap-2.5 sm:grid-cols-[1fr_1.35fr]">
      <Button
        type="button"
        variant="outline"
        onClick={() => setShowInvoice((current) => !current)}
        className={cn('h-12 rounded-2xl text-sm font-bold', isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800' : 'bg-white text-slate-700 hover:bg-slate-50')}
      >
        <FileText className="h-4 w-4" />
        {showInvoice ? copy.hideReceipt : copy.viewReceipt}
      </Button>
      <Button
        type="button"
        onClick={() => onAction?.('startLearning')}
        className="h-12 rounded-2xl bg-emerald-600 text-sm font-black text-white shadow-[0_16px_30px_-16px_rgba(16,185,129,0.75)] hover:bg-emerald-700"
      >
        <Sparkles className="h-4 w-4" />
        {copy.startLearning}
      </Button>
    </div>
  );

  return (
    <StateShell
      tone="emerald"
      eyebrow={copy.successEyebrow}
      title={isCreditPurchase ? copy.creditSuccessTitle : copy.successTitle}
      subtitle={isCreditPurchase ? '' : copy.successSub}
      hero={hero}
      timeline={<Timeline steps={steps} currentIdx={steps.length} tone="emerald" isDarkMode={isDarkMode} />}
      details={details}
      actions={actions}
      footnote={copy.receiptSent}
      isDarkMode={isDarkMode}
    />
  );
}

export function FailureScreen({ lang = 'vi', onAction, transaction = {}, message = '', isDarkMode = false }) {
  const copy = getCopy(lang);
  const planName = displayPlanName(transaction.planId, transaction, copy);
  const steps = [
    { label: copy.createOrder, detail: rowValue(transaction.orderId), time: rowValue(transaction.orderTime) },
    { label: copy.verifyCard, detail: copy.verifyCardDetail, time: rowValue(transaction.verifyTime) },
    { label: copy.bankRejected, detail: copy.bankRejectedDetail, time: rowValue(transaction.time) },
    { label: copy.stopped, detail: copy.stoppedDetail },
  ];

  const hero = (
    <div className={cn('overflow-hidden rounded-[24px] p-6 ring-1 shadow-[0_30px_70px_-34px_rgba(244,63,94,0.45)] sm:p-8', isDarkMode ? 'bg-slate-900 ring-rose-900/50' : 'bg-white ring-rose-100')}>
      <div className="qm-motion flex items-start gap-5" style={{ animation: 'qm-x-shake 0.45s ease-out' }}>
        <div className={cn('relative flex h-16 w-16 shrink-0 items-center justify-center rounded-2xl', isDarkMode ? 'bg-rose-950/40' : 'bg-rose-50')}>
          <X className="h-8 w-8 stroke-[3] text-rose-500" />
          <span className="qm-motion absolute inset-0 rounded-2xl border border-rose-300" style={{ animation: 'qm-pulse-ring 2s ease-out infinite' }} />
        </div>
        <div className="min-w-0 flex-1">
          <p className="text-[10px] font-black uppercase tracking-[0.18em] text-rose-600">
            {copy.errorCode}
          </p>
          <h3 className={cn('mt-1 text-xl font-black tracking-normal', isDarkMode ? 'text-white' : 'text-slate-950')}>
            {copy.errorTitle}
          </h3>
          <p className={cn('mt-1 text-sm leading-6', isDarkMode ? 'text-slate-300' : 'text-slate-600')}>
            {message || copy.errorSub}
          </p>
        </div>
      </div>
      <div className={cn('mt-5 rounded-2xl p-4', isDarkMode ? 'bg-slate-950/60' : 'bg-slate-50')}>
        <p className="mb-3 text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
          {copy.tryOne}
        </p>
        <ul className="space-y-2 text-sm">
          {[
            { icon: RefreshCw, label: copy.retrySame },
            { icon: CreditCard, label: copy.switchCard },
            { icon: Smartphone, label: copy.switchWallet },
          ].map(({ icon: Icon, label }) => (
            <li key={label} className={cn('flex items-center gap-2.5 font-medium', isDarkMode ? 'text-slate-200' : 'text-slate-700')}>
              <Icon className="h-3.5 w-3.5 text-rose-500" />
              {label}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );

  const details = (
    <DetailsPanel
      tone="rose"
      title={copy.txDetails}
      rows={[
        { label: copy.orderId, value: rowValue(transaction.orderId) },
        { label: copy.plan, value: planName },
        { label: copy.amount, value: rowValue(transaction.amountLabel) },
        { label: copy.method, value: rowValue(transaction.method) },
        { label: copy.time, value: rowValue(transaction.time) },
        { label: copy.status, value: rowValue(transaction.statusLabel, copy.cancelled), emph: true },
      ]}
      isDarkMode={isDarkMode}
    />
  );

  const actions = (
    <div className="flex flex-col gap-2.5">
      <div className="grid gap-2.5 sm:grid-cols-[1fr_1.35fr]">
        <Button
          type="button"
          variant="outline"
          onClick={() => onAction?.('changeMethod')}
          className={cn('h-12 rounded-2xl text-sm font-bold', isDarkMode ? 'border-slate-700 bg-slate-900 text-slate-200 hover:bg-slate-800' : 'bg-white text-slate-700 hover:bg-slate-50')}
        >
          <ArrowLeft className="h-4 w-4" />
          {copy.changeMethod}
        </Button>
        <Button
          type="button"
          onClick={() => onAction?.('retry')}
          className="h-12 rounded-2xl bg-blue-600 text-sm font-black text-white shadow-[0_16px_30px_-16px_rgba(37,99,235,0.7)] hover:bg-blue-700"
        >
          <RefreshCw className="h-4 w-4" />
          {copy.retry}
        </Button>
      </div>
      <Button
        type="button"
        variant="link"
        onClick={() => onAction?.('support')}
        className="h-9 rounded-xl text-xs font-black text-rose-500 hover:text-rose-600"
      >
        <LifeBuoy className="h-3.5 w-3.5" />
        {copy.support}
      </Button>
    </div>
  );

  return (
    <StateShell
      tone="rose"
      eyebrow={copy.failureEyebrow}
      title={copy.failureTitle}
      subtitle={copy.failureSub}
      hero={hero}
      timeline={<Timeline steps={steps} currentIdx={2} tone="rose" isDarkMode={isDarkMode} />}
      details={details}
      actions={actions}
      isDarkMode={isDarkMode}
    />
  );
}
