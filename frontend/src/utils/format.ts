// src/utils/format.ts

export const formatPrice = (price: number, currency: string = 'VND'): string => {
  if (price === 0) return 'Miễn phí';
  if (currency === 'VND') {
    return new Intl.NumberFormat('vi-VN', {
      style: 'currency',
      currency: 'VND',
      maximumFractionDigits: 0,
    }).format(price);
  }
  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency,
  }).format(price);
};

export const formatNumber = (n: number): string => {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000)     return `${(n / 1_000).toFixed(1)}k`;
  return n.toString();
};

export const formatDate = (dateStr: string): string => {
  return new Date(dateStr).toLocaleDateString('vi-VN', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  });
};

export const getDiscountPercent = (original: number, current: number): number => {
  if (!original || original <= current) return 0;
  return Math.round((1 - current / original) * 100);
};
