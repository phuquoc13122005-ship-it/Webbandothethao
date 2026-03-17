interface BuildVietQrImageUrlInput {
  bankCode: string;
  accountNo: string;
  amount: number;
  description: string;
}

const QR_EXPIRY_MS = 15 * 60 * 1000;

export function buildVietQrImageUrl(input: BuildVietQrImageUrlInput) {
  const query = new URLSearchParams({
    acc: input.accountNo,
    bank: input.bankCode,
    template: 'compact',
    amount: String(Math.max(0, Math.round(input.amount))),
    des: input.description,
  });
  const queryString = query.toString().replace(/\+/g, '%20');

  return `https://qr.sepay.vn/img?${queryString}`;
}

export function formatCountdown(remainingMs: number) {
  const totalSeconds = Math.max(0, Math.floor(remainingMs / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

export function getDefaultQrExpiry(nowMs = Date.now()) {
  return nowMs + QR_EXPIRY_MS;
}
