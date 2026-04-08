import { XMLBuilder, XMLParser } from 'fast-xml-parser';

const XMLNS_SOAP = 'http://schemas.xmlsoap.org/soap/envelope/';
const XMLNS_WSSE =
  'http://docs.oasis-open.org/wss/2004/01/oasis-200401-wss-wssecurity-secext-1.0.xsd';
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
  removeNSPrefix: true,
});

/**
 * Build WSSE UsernameToken security header for SiteMinder pmsXchange.
 */
export function buildWsseHeader(
  username: string,
  password: string,
): Record<string, unknown> {
  return {
    'wsse:Security': {
      '@_xmlns:wsse': XMLNS_WSSE,
      'wsse:UsernameToken': {
        'wsse:Username': username,
        'wsse:Password': password,
      },
    },
  };
}

/**
 * Build a complete SOAP envelope wrapping an OTA message body.
 */
export function buildSoapEnvelope(
  messageName: string,
  body: Record<string, unknown>,
  username: string,
  password: string,
): string {
  const envelope = {
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    'soap:Envelope': {
      '@_xmlns:soap': XMLNS_SOAP,
      'soap:Header': buildWsseHeader(username, password),
      'soap:Body': {
        [messageName]: {
          '@_xmlns': XMLNS_OTA,
          '@_EchoToken': generateEchoToken(),
          '@_TimeStamp': new Date().toISOString(),
          '@_Version': '1.0',
          ...body,
        },
      },
    },
  };

  return builder.build(envelope);
}

/**
 * Parse a SOAP response from SiteMinder.
 * Unwraps the envelope and extracts the body or fault.
 */
export function parseSoapResponse(xmlString: string): {
  success: boolean;
  messageName: string;
  data: Record<string, unknown>;
  errors: Array<{ code: string; message: string }>;
  isFault: boolean;
} {
  const parsed = parser.parse(xmlString);

  // Navigate into SOAP envelope (with or without namespace prefix)
  const envelope =
    parsed['Envelope'] ?? parsed['soap:Envelope'] ?? parsed;
  const body =
    envelope['Body'] ?? envelope['soap:Body'] ?? {};
  const header =
    envelope['Header'] ?? envelope['soap:Header'] ?? {};

  // Check for SOAP Fault
  const fault = body['Fault'] ?? body['soap:Fault'];
  if (fault) {
    const faultCode = String(fault['faultcode'] ?? fault['Code'] ?? 'SOAP_FAULT');
    const faultString = String(
      fault['faultstring'] ?? fault['Reason'] ?? 'Unknown SOAP fault',
    );
    return {
      success: false,
      messageName: 'Fault',
      data: fault,
      errors: [{ code: faultCode, message: faultString }],
      isFault: true,
    };
  }

  // Extract the OTA response from the body
  const bodyKeys = Object.keys(body).filter(
    (k) => !k.startsWith('@_') && k !== '?xml',
  );
  const messageName = bodyKeys[0] ?? 'Unknown';
  const root = body[messageName] ?? {};

  // Check for OTA-level errors
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

  const hasSuccess = root.Success !== undefined || root['@_Success'] === true;
  const success = hasSuccess && errors.length === 0;

  return { success, messageName, data: root, errors, isFault: false };
}

function generateEchoToken(): string {
  return `HAIP-SM-${Date.now()}-${Math.random().toString(36).substring(2, 8)}`;
}
