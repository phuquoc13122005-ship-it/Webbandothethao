import { describe, expect, it } from 'vitest';
import { buildVietQrImageUrl, formatCountdown, getDefaultQrExpiry } from './vietQr';

describe('vietQr helpers', () => {
  it('builds SePay QR image url with encoded query', () => {
    const url = buildVietQrImageUrl({
      bankCode: 'MBBank',
      accountNo: '913122005',
      amount: 1550000,
      description: 'DH-12345',
    });

    expect(url).toBe(
      'https://qr.sepay.vn/img?acc=913122005&bank=MBBank&template=compact&amount=1550000&des=DH-12345',
    );
  });

  it('formats countdown in mm:ss', () => {
    expect(formatCountdown(65_000)).toBe('01:05');
    expect(formatCountdown(1_000)).toBe('00:01');
    expect(formatCountdown(0)).toBe('00:00');
    expect(formatCountdown(-100)).toBe('00:00');
  });

  it('returns default expiry 15 minutes ahead', () => {
    const now = Date.now();
    const expiresAt = getDefaultQrExpiry(now);

    expect(expiresAt - now).toBe(15 * 60 * 1000);
  });
});
