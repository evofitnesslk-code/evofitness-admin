import QRCode from 'qrcode';

/**
 * Renders a scannable QR code as an inline SVG string.
 * Styling is fixed here so every printed/screen surface matches: dark modules
 * on a light background (required for reliable scanning) with minimal margin.
 */
export async function generateQrSvg(text: string): Promise<string> {
  return QRCode.toString(text, {
    type: 'svg',
    errorCorrectionLevel: 'M',
    margin: 2,
    width: 320,
    color: { dark: '#09090B', light: '#FFFFFF' },
  });
}
