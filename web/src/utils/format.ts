export const formatCurrency = (n: number | null | undefined): string => {
  const value = Number(n ?? 0);
  return new Intl.NumberFormat('es-MX', {
    style: 'currency',
    currency: 'MXN',
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(value);
};

export const formatNumber = (n: number | null | undefined): string => {
  const value = Number(n ?? 0);
  return new Intl.NumberFormat('es-MX').format(value);
};
