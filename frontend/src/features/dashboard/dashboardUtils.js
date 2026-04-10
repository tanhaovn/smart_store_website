export const moneyFormatter = new Intl.NumberFormat("vi-VN", {
  style: "currency",
  currency: "VND",
  maximumFractionDigits: 0,
});

export function formatMoney(value) {
  return moneyFormatter.format(Number(value || 0));
}

export function formatDateTime(value) {
  if (!value) {
    return "-";
  }
  const parsedDate = new Date(value);
  if (Number.isNaN(parsedDate.getTime())) {
    return String(value);
  }
  return parsedDate.toLocaleString("vi-VN");
}

export function safeItems(value) {
  return Array.isArray(value) ? value : [];
}
