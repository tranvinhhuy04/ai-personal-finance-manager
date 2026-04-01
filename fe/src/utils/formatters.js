function formatCurrencyVND(amount) {
  const numericAmount = Number(amount ?? 0);
  const safeAmount = Number.isFinite(numericAmount) ? numericAmount : 0;

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency: 'VND',
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(safeAmount);
}

export { formatCurrencyVND };
