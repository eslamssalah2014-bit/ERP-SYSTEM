// ZATCA (Saudi Arabia) & ETA (Egypt) TLV QR Code Generator
// Encodes:
// Tag 1: Seller's name
// Tag 2: VAT registration number
// Tag 3: Time stamp (ISO8601)
// Tag 4: Invoice total (with VAT)
// Tag 5: VAT total

export function generateZatcaTlvBase64(
  sellerName: string,
  vatNumber: string,
  timestamp: string,
  totalAmount: number,
  vatAmount: number
): string {
  try {
    const tag1 = toTLS(1, sellerName || "Sanad ERP");
    const tag2 = toTLS(2, vatNumber || "300000000000003");
    const tag3 = toTLS(3, timestamp || new Date().toISOString());
    const tag4 = toTLS(4, totalAmount.toFixed(2));
    const tag5 = toTLS(5, vatAmount.toFixed(2));

    const totalBuffer = concatBuffers([tag1, tag2, tag3, tag4, tag5]);
    return bufferToBase64(totalBuffer);
  } catch (err) {
    console.error("Failed to encode TLV:", err);
    return "";
  }
}

function toTLS(tagNumber: number, value: string): Uint8Array {
  const encoder = new TextEncoder();
  const valBytes = encoder.encode(value);
  const tagByte = tagNumber;
  const lengthByte = valBytes.length;

  const result = new Uint8Array(2 + valBytes.length);
  result[0] = tagByte;
  result[1] = lengthByte;
  result.set(valBytes, 2);
  return result;
}

function concatBuffers(buffers: Uint8Array[]): Uint8Array {
  let totalLength = 0;
  for (const b of buffers) {
    totalLength += b.length;
  }
  const result = new Uint8Array(totalLength);
  let offset = 0;
  for (const b of buffers) {
    result.set(b, offset);
    offset += b.length;
  }
  return result;
}

function bufferToBase64(buffer: Uint8Array): string {
  let binary = "";
  for (let i = 0; i < buffer.byteLength; i++) {
    binary += String.fromCharCode(buffer[i]);
  }
  if (typeof window !== "undefined") {
    return window.btoa(binary);
  } else {
    return Buffer.from(buffer).toString("base64");
  }
}

export async function generateZatcaQrDataUrl(
  sellerName: string,
  vatNumber: string,
  timestamp: string,
  totalAmount: number,
  vatAmount: number
): Promise<string> {
  const base64Data = generateZatcaTlvBase64(sellerName, vatNumber, timestamp, totalAmount, vatAmount);
  // Using public QR code SVG renderer or canvas fallback
  return `https://api.qrserver.com/v1/create-qr-code/?size=200x200&data=${encodeURIComponent(base64Data)}`;
}
