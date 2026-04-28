function escapeHtml(value) {
  return String(value ?? '')
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#39;');
}

function normalizeFilePart(value) {
  const normalized = String(value || '')
    .trim()
    .replace(/[^a-zA-Z0-9_-]+/g, '-')
    .replace(/^-+|-+$/g, '');

  return normalized || 'receipt';
}

function getInvoiceLabels(lang) {
  const isEnglish = String(lang || '').toLowerCase().startsWith('en');

  if (isEnglish) {
    return {
      title: 'QuizMate AI invoice',
      invoiceNo: 'Invoice no.',
      status: 'Paid',
      issuedAt: 'Issued at',
      billTo: 'Bill to',
      item: 'Item',
      amount: 'Amount',
      subtotal: 'Subtotal',
      total: 'Total paid',
      method: 'Payment method',
      orderId: 'Order ID',
      transactionId: 'Transaction ID',
      footer: 'This invoice was generated from the verified QuizMate AI payment record.',
    };
  }

  return {
    title: 'Hóa đơn QuizMate AI',
    invoiceNo: 'Số hóa đơn',
    status: 'Đã thanh toán',
    issuedAt: 'Phát hành lúc',
    billTo: 'Người thanh toán',
    item: 'Nội dung',
    amount: 'Số tiền',
    subtotal: 'Tạm tính',
    total: 'Đã thanh toán',
    method: 'Phương thức',
    orderId: 'Mã đơn',
    transactionId: 'Mã giao dịch',
    footer: 'Hóa đơn này được tạo từ bản ghi thanh toán đã xác thực của QuizMate AI.',
  };
}

function buildInvoiceHtml({ lang, transaction, planName }) {
  const labels = getInvoiceLabels(lang);
  const itemName = planName || transaction?.planName || '-';
  const invoiceNo = transaction?.invoiceNumber || transaction?.orderId || '-';
  const issuedAt = transaction?.issuedAt || transaction?.time || '-';
  const customer = transaction?.customer || 'QuizMate AI customer';
  const amount = transaction?.amountLabel || '-';

  return `<!doctype html>
<html lang="${escapeHtml(String(lang || 'vi').slice(0, 2))}">
<head>
  <meta charset="utf-8" />
  <title>${escapeHtml(labels.title)} ${escapeHtml(invoiceNo)}</title>
  <style>
    :root { color: #172033; background: #f7fbfa; font-family: Inter, Arial, sans-serif; }
    body { margin: 0; padding: 40px; }
    main { max-width: 760px; margin: 0 auto; background: #ffffff; border: 1px solid #dbe7e4; border-radius: 18px; padding: 32px; }
    header { display: flex; justify-content: space-between; gap: 24px; border-bottom: 1px solid #dbe7e4; padding-bottom: 24px; }
    h1 { margin: 0 0 8px; font-size: 28px; line-height: 1.15; }
    .brand { color: #0f766e; font-weight: 800; letter-spacing: .04em; text-transform: uppercase; font-size: 12px; }
    .status { display: inline-block; border-radius: 999px; background: #dcfce7; color: #047857; padding: 7px 12px; font-weight: 800; font-size: 12px; }
    .meta { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 16px; margin: 28px 0; }
    .box { border: 1px solid #e5ecea; border-radius: 14px; padding: 14px; }
    .label { color: #65758b; font-size: 12px; margin-bottom: 6px; }
    .value { font-weight: 750; overflow-wrap: anywhere; }
    table { width: 100%; border-collapse: collapse; margin-top: 18px; }
    th { text-align: left; color: #65758b; font-size: 12px; border-bottom: 1px solid #dbe7e4; padding: 12px 0; }
    td { padding: 16px 0; border-bottom: 1px solid #edf3f1; font-weight: 700; vertical-align: top; }
    td:last-child, th:last-child { text-align: right; }
    .total { margin-top: 20px; display: grid; gap: 10px; max-width: 320px; margin-left: auto; }
    .line { display: flex; justify-content: space-between; gap: 16px; }
    .grand { font-size: 20px; font-weight: 850; color: #0f766e; }
    footer { margin-top: 28px; color: #65758b; font-size: 12px; line-height: 1.6; }
    @media print {
      body { padding: 0; background: #ffffff; }
      main { border: 0; border-radius: 0; box-shadow: none; }
    }
  </style>
</head>
<body>
  <main>
    <header>
      <div>
        <div class="brand">QuizMate AI</div>
        <h1>${escapeHtml(labels.title)}</h1>
        <div>${escapeHtml(labels.invoiceNo)}: <strong>${escapeHtml(invoiceNo)}</strong></div>
      </div>
      <div><span class="status">${escapeHtml(labels.status)}</span></div>
    </header>
    <section class="meta">
      <div class="box"><div class="label">${escapeHtml(labels.issuedAt)}</div><div class="value">${escapeHtml(issuedAt)}</div></div>
      <div class="box"><div class="label">${escapeHtml(labels.billTo)}</div><div class="value">${escapeHtml(customer)}</div></div>
      <div class="box"><div class="label">${escapeHtml(labels.method)}</div><div class="value">${escapeHtml(transaction?.method || '-')}</div></div>
      <div class="box"><div class="label">${escapeHtml(labels.orderId)}</div><div class="value">${escapeHtml(transaction?.orderId || '-')}</div></div>
    </section>
    <table>
      <thead><tr><th>${escapeHtml(labels.item)}</th><th>${escapeHtml(labels.amount)}</th></tr></thead>
      <tbody><tr><td>${escapeHtml(itemName)}</td><td>${escapeHtml(amount)}</td></tr></tbody>
    </table>
    <section class="total">
      <div class="line"><span>${escapeHtml(labels.subtotal)}</span><strong>${escapeHtml(amount)}</strong></div>
      <div class="line grand"><span>${escapeHtml(labels.total)}</span><span>${escapeHtml(amount)}</span></div>
    </section>
    <footer>
      <div>${escapeHtml(labels.transactionId)}: <strong>${escapeHtml(transaction?.transactionId || '-')}</strong></div>
      <div>${escapeHtml(labels.footer)}</div>
    </footer>
  </main>
</body>
</html>`;
}

export function downloadPaymentInvoice({ lang = 'vi', transaction = {}, planName = '' } = {}) {
  if (typeof window === 'undefined' || typeof document === 'undefined') {
    return false;
  }

  const html = buildInvoiceHtml({ lang, transaction, planName });
  const blob = new Blob([html], { type: 'text/html;charset=utf-8' });
  const objectUrl = window.URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = `quizmate-invoice-${normalizeFilePart(transaction.invoiceNumber || transaction.orderId)}.html`;
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
  window.URL.revokeObjectURL(objectUrl);
  return true;
}
