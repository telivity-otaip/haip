import { XMLBuilder, XMLParser } from 'fast-xml-parser';

const XMLNS_OTA = 'http://www.opentravel.org/OTA/2003/05';

const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
  suppressEmptyNode: true,
});

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  parseAttributeValue: true,
});

/**
 * Build an OTA-standard XML envelope for Booking.com messages.
 */
export function buildOtaXml(
  messageName: string,
  payload: Record<string, unknown>,
): string {
  const envelope = {
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    [messageName]: {
      '@_xmlns': XMLNS_OTA,
      '@_EchoToken': generateEchoToken(),
      '@_TimeStamp': new Date().toISOString(),
      '@_Version': '1.0',
      ...payload,
    },
  };

  return builder.build(envelope);
}

/**
 * Parse an OTA XML response from Booking.com.
 * Returns the root element content and status info.
 */
export function parseOtaXml(xmlString: string): {
  success: boolean;
  messageName: string;
  data: Record<string, unknown>;
  errors: Array<{ code: string; message: string }>;
} {
  const parsed = parser.parse(xmlString);

  // Find the root element (skip ?xml declaration)
  const rootKeys = Object.keys(parsed).filter((k) => k !== '?xml');
  const messageName = rootKeys[0] ?? 'Unknown';
  const root = parsed[messageName] ?? {};

  // Check for errors in OTA standard format
  const errors: Array<{ code: string; message: string }> = [];

  if (root.Errors?.Error) {
    const errorList = Array.isArray(root.Errors.Error)
      ? root.Errors.Error
      : [root.Errors.Error];

    for (const err of errorList) {
      errors.push({
        code: String(err['@_Code'] ?? 'UNKNOWN'),
        message: String(err['@_ShortText'] ?? err['#text'] ?? 'Unknown error'),
      });
    }
  }

  // Check Success element
  const hasSuccess = root.Success !== undefined || root['@_Success'] === true;
  const success = hasSuccess && errors.length === 0;

  return { success, messageName, data: root, errors };
}

/**
 * Generate a unique echo token for request tracking.
 */
function generateEchoToken(): string {
  return `HAIP-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}
