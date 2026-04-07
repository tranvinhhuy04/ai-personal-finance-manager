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
