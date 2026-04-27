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

const ORDER_STATUS_META = {
  CHO_XAC_NHAN: {
    label: "Chờ xác nhận",
    className: "status-cho-xac-nhan",
  },
  DANG_CHUAN_BI: {
    label: "Đang chuẩn bị",
    className: "status-dang-chuan-bi",
  },
  DANG_GIAO: {
    label: "Đang giao",
    className: "status-dang-giao",
  },
  DA_GIAO: {
    label: "Đã giao",
    className: "status-da-giao",
  },
  DA_HUY: {
    label: "Đã hủy",
    className: "status-da-huy",
  },
};

const PAYMENT_STATUS_LABELS = {
  PENDING: "Chờ thanh toán",
  PAID: "Đã thanh toán",
  FAILED: "Thất bại",
  CANCELLED: "Đã hủy",
};

function normalizeStatusCode(value) {
  return String(value || "")
    .trim()
    .toUpperCase();
}

export function getOrderStatusLabel(status) {
  const code = normalizeStatusCode(status);
  return ORDER_STATUS_META[code]?.label || String(status || "-");
}

export function getOrderStatusClass(status) {
  const code = normalizeStatusCode(status);
  return ORDER_STATUS_META[code]?.className || "status-khac";
}

export function getPaymentStatusLabel(status) {
  const code = normalizeStatusCode(status);
  return PAYMENT_STATUS_LABELS[code] || String(status || "-");
}
