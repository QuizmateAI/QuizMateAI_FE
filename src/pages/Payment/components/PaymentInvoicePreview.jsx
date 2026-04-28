import { Download, MailCheck, ReceiptText, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

function valueOrDash(value) {
  return value == null || value === '' ? '-' : String(value);
}

export default function PaymentInvoicePreview({
  copy,
  isDarkMode = false,
  onClose,
  onDownload,
  planName,
  transaction = {},
}) {
  const invoiceNumber = valueOrDash(transaction.invoiceNumber || transaction.orderId);
  const issuedAt = valueOrDash(transaction.issuedAt || transaction.time);
  const customer = valueOrDash(transaction.customer);
  const amount = valueOrDash(transaction.amountLabel);

  return (
    <section
      className={cn(
        'rounded-[24px] p-5 ring-1 shadow-[0_24px_70px_-48px_rgba(15,23,42,0.36)]',
        isDarkMode ? 'bg-slate-900 text-slate-100 ring-slate-700' : 'bg-white text-slate-950 ring-emerald-100',
      )}
      aria-label={copy.invoiceTitle}
    >
      <div className="flex items-start justify-between gap-4 border-b border-dashed border-slate-200 pb-4 dark:border-slate-700">
        <div className="min-w-0">
          <div className="flex items-center gap-2">
            <ReceiptText className="h-4 w-4 text-emerald-500" />
            <p className="text-[10px] font-black uppercase tracking-[0.18em] text-slate-500">
              {copy.invoiceTitle}
            </p>
          </div>
          <h3 className="mt-2 text-xl font-black tracking-normal">{invoiceNumber}</h3>
          <p className={cn('mt-1 text-xs font-medium', isDarkMode ? 'text-slate-400' : 'text-slate-500')}>
            {copy.invoiceIssuedAt}: {issuedAt}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <span className={cn(
            'rounded-full px-3 py-1 text-[11px] font-black',
            isDarkMode ? 'bg-emerald-500/15 text-emerald-300' : 'bg-emerald-50 text-emerald-700',
          )}>
            {copy.paid}
          </span>
          <Button
            type="button"
            variant="ghost"
            size="icon"
            onClick={onClose}
            aria-label={copy.closeInvoice}
            className={cn('h-8 w-8 rounded-full', isDarkMode ? 'hover:bg-slate-800' : 'hover:bg-slate-100')}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      </div>

      <div className="mt-4 grid gap-3 text-sm sm:grid-cols-2">
        <div className={cn('rounded-2xl p-4 ring-1', isDarkMode ? 'bg-slate-950/45 ring-slate-700' : 'bg-slate-50 ring-slate-200')}>
          <p className="text-xs font-semibold text-slate-500">{copy.customer}</p>
          <p className="mt-1 break-words font-black">{customer}</p>
        </div>
        <div className={cn('rounded-2xl p-4 ring-1', isDarkMode ? 'bg-slate-950/45 ring-slate-700' : 'bg-slate-50 ring-slate-200')}>
          <p className="text-xs font-semibold text-slate-500">{copy.method}</p>
          <p className="mt-1 font-black">{valueOrDash(transaction.method)}</p>
        </div>
      </div>

      <div className="mt-5 overflow-hidden rounded-2xl ring-1 ring-slate-200 dark:ring-slate-700">
        <div className={cn('grid grid-cols-[1fr_auto] gap-4 px-4 py-3 text-xs font-black uppercase tracking-[0.12em]', isDarkMode ? 'bg-slate-950/60 text-slate-400' : 'bg-slate-50 text-slate-500')}>
          <span>{copy.invoiceItem}</span>
          <span>{copy.amount}</span>
        </div>
        <div className="grid grid-cols-[1fr_auto] gap-4 px-4 py-4 text-sm">
          <span className="min-w-0 break-words font-bold">{planName}</span>
          <span className="font-black tabular-nums">{amount}</span>
        </div>
      </div>

      <dl className="mt-4 space-y-2 text-sm">
        {[
          [copy.subtotal, amount],
          [copy.totalPaid, amount],
          [copy.orderId, transaction.orderId],
          [copy.txId, transaction.transactionId],
        ].map(([label, value], index) => (
          <div key={label} className={cn('flex items-start justify-between gap-4', index === 1 ? 'text-base font-black text-emerald-600' : '')}>
            <dt className="shrink-0 text-slate-500">{label}</dt>
            <dd className="min-w-0 break-all text-right font-bold tabular-nums">{valueOrDash(value)}</dd>
          </div>
        ))}
      </dl>

      <div className={cn('mt-5 flex flex-col gap-3 rounded-2xl p-4 sm:flex-row sm:items-center sm:justify-between', isDarkMode ? 'bg-slate-950/50' : 'bg-emerald-50/70')}>
        <div className="flex min-w-0 items-center gap-2 text-xs font-semibold text-slate-500">
          <MailCheck className="h-4 w-4 shrink-0 text-emerald-500" />
          <span>{copy.invoiceEmailSent}</span>
        </div>
        <Button
          type="button"
          onClick={onDownload}
          className="h-10 rounded-xl bg-emerald-600 px-4 text-xs font-black text-white hover:bg-emerald-700"
        >
          <Download className="h-3.5 w-3.5" />
          {copy.downloadInvoice}
        </Button>
      </div>
    </section>
  );
}
