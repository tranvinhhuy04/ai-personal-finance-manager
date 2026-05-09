export function formatCurrency(value: number | string, currency: 'VND' | 'USD' = 'VND') {
  const amount = Number(value) || 0;

  return new Intl.NumberFormat('vi-VN', {
    style: 'currency',
    currency,
    maximumFractionDigits: 0,
  }).format(amount);
}

export function formatCompactCurrency(value: number | string) {
  const amount = Number(value) || 0;
  const abs = Math.abs(amount);

  if (abs >= 1_000_000_000) return `${(amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '')} tỷ`;
  if (abs >= 1_000_000) return `${(amount / 1_000_000).toFixed(1).replace(/\.0$/, '')} triệu`;
  if (abs >= 1_000) return `${(amount / 1_000).toFixed(1).replace(/\.0$/, '')}k`;

  return `${Math.round(amount)}`;
}

/**
 * Format currency for display on card/balance fields with short notation
 * >= 1B: "X.X Tỷ đ"
 * >= 1M: "X.X Triệu đ"  
 * >= 1K: "X.X K đ"
 * < 1K: "X đ"
 * Designed to prevent text overflow on mobile screens
 */
export function formatCurrencyShort(value: number | string, currency: 'VND' | 'USD' = 'VND') {
  const amount = Number(value) || 0;
  const abs = Math.abs(amount);
  const sign = amount < 0 ? '-' : '';
  const unit = currency === 'USD' ? '$' : 'đ';

  if (abs >= 1_000_000_000) {
    const val = (amount / 1_000_000_000).toFixed(1).replace(/\.0$/, '');
    return `${sign}${val} Tỷ ${unit}`;
  }

  if (abs >= 1_000_000) {
    const val = (amount / 1_000_000).toFixed(1).replace(/\.0$/, '');
    return `${sign}${val} Tr ${unit}`;
  }

  if (abs >= 1_000) {
    const val = (amount / 1_000).toFixed(0);
    return `${sign}${val}K ${unit}`;
  }

  return `${sign}${Math.round(amount)} ${unit}`;
}
