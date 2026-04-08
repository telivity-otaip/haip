/**
 * Mock SiteMinder pmsXchange API Server
 *
 * Simulates SiteMinder's SOAP-based pmsXchange API for local development.
 * Accepts SOAP XML with WSSE auth, routes by message type, returns valid responses.
 *
 * Usage:
 *   node server.mjs                # starts on port 4001
 *   PORT=4002 node server.mjs      # starts on custom port
 */

import http from 'node:http';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';

const PORT = parseInt(process.env.PORT ?? '4001', 10);
const AUTH_USER = process.env.AUTH_USER ?? 'haip_test';
const AUTH_PASS = process.env.AUTH_PASS ?? 'test_password';

const parser = new XMLParser({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  removeNSPrefix: true,
});
const builder = new XMLBuilder({
  ignoreAttributes: false,
  attributeNamePrefix: '@_',
  format: true,
});

// In-memory storage
const store = {
  availability: [],
  rates: [],
  reservationPolls: [],
  confirmations: [],
};

const SAMPLE_RESERVATION = {
  '@_ResStatus': 'Commit',
  '@_CreateDateTime': '2026-04-02T14:30:00Z',
  UniqueID: { '@_Type': 14, '@_ID': 'SM-98765432' },
  POS: {
    Source: {
      BookingChannel: { CompanyName: 'Expedia' },
    },
  },
  RoomStays: {
    RoomStay: {
      RoomTypes: { RoomType: { '@_RoomTypeCode': 'SGLK' } },
      RatePlans: { RatePlan: { '@_RatePlanCode': 'FLEX' } },
      GuestCounts: {
        GuestCount: [
          { '@_AgeQualifyingCode': 10, '@_Count': 1 },
        ],
      },
      TimeSpan: { '@_Start': '2026-04-20', '@_End': '2026-04-22' },
      Total: { '@_AmountAfterTax': '280.00', '@_CurrencyCode': 'EUR' },
    },
  },
  ResGuests: {
    ResGuest: {
      Profiles: {
        ProfileInfo: {
          Profile: {
            Customer: {
              PersonName: { GivenName: 'Maria', Surname: 'Garcia' },
              Email: 'maria.garcia@example.com',
              Telephone: { '@_PhoneNumber': '+34-555-0456' },
            },
          },
        },
      },
    },
  },
  SpecialRequests: {
    SpecialRequest: { Text: 'Non-smoking room, high floor' },
  },
};

/**
 * Verify WSSE credentials from SOAP header.
 */
function verifyWsse(parsed) {
  const envelope = parsed.Envelope ?? parsed['soap:Envelope'] ?? {};
  const header = envelope.Header ?? envelope['soap:Header'] ?? {};
  const security = header.Security ?? {};
  const token = security.UsernameToken ?? {};

  const username = token.Username ?? '';
  const password = token.Password ?? '';

  return username === AUTH_USER && password === AUTH_PASS;
}

/**
 * Extract the SOAP body content.
 */
function extractBody(parsed) {
  const envelope = parsed.Envelope ?? parsed['soap:Envelope'] ?? {};
  const body = envelope.Body ?? envelope['soap:Body'] ?? {};
  return body;
}

/**
 * Build a SOAP success response.
 */
function buildSoapResponse(messageName, content = {}) {
  return builder.build({
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    'soap:Envelope': {
      '@_xmlns:soap': 'http://schemas.xmlsoap.org/soap/envelope/',
      'soap:Body': {
        [messageName]: {
          '@_xmlns': 'http://www.opentravel.org/OTA/2003/05',
          Success: '',
          ...content,
        },
      },
    },
  });
}

/**
 * Build a SOAP fault response.
 */
function buildSoapFault(code, message) {
  return builder.build({
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    'soap:Envelope': {
      '@_xmlns:soap': 'http://schemas.xmlsoap.org/soap/envelope/',
      'soap:Body': {
        'soap:Fault': {
          faultcode: code,
          faultstring: message,
        },
      },
    },
  });
}

function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
  });
}

const server = http.createServer(async (req, res) => {
  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      status: 'ok',
      store: Object.fromEntries(Object.entries(store).map(([k, v]) => [k, v.length])),
    }));
    return;
  }

  // Store inspection
  if (req.method === 'GET' && req.url === '/store') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(store));
    return;
  }

  // Reset
  if (req.method === 'POST' && req.url === '/reset') {
    for (const key of Object.keys(store)) store[key] = [];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ reset: true }));
    return;
  }

  // pmsXchange SOAP endpoint
  if (req.method === 'POST' && req.url === '/pmsxchange') {
    try {
      const rawBody = await readBody(req);
      const parsed = parser.parse(rawBody);

      // Verify WSSE auth
      if (!verifyWsse(parsed)) {
        res.writeHead(500, { 'Content-Type': 'text/xml; charset=utf-8' });
        res.end(buildSoapFault('wsse:FailedAuthentication', 'Invalid credentials'));
        return;
      }

      const body = extractBody(parsed);
      const messageTypes = Object.keys(body).filter((k) => !k.startsWith('@_'));
      const messageType = messageTypes[0] ?? 'Unknown';

      let responseXml;

      switch (messageType) {
        case 'OTA_HotelAvailNotifRQ':
          store.availability.push({ timestamp: new Date().toISOString(), data: body });
          responseXml = buildSoapResponse('OTA_HotelAvailNotifRS');
          break;

        case 'OTA_HotelRateAmountNotifRQ':
          store.rates.push({ timestamp: new Date().toISOString(), data: body });
          responseXml = buildSoapResponse('OTA_HotelRateAmountNotifRS');
          break;

        case 'ReadRQ':
          store.reservationPolls.push({ timestamp: new Date().toISOString() });
          responseXml = buildSoapResponse('OTA_ResRetrieveRS', {
            ReservationsList: {
              HotelReservation: SAMPLE_RESERVATION,
            },
          });
          break;

        case 'NotifRQ':
          store.confirmations.push({ timestamp: new Date().toISOString(), data: body });
          responseXml = buildSoapResponse('NotifRS');
          break;

        default:
          res.writeHead(500, { 'Content-Type': 'text/xml; charset=utf-8' });
          res.end(buildSoapFault('Client', `Unknown message type: ${messageType}`));
          return;
      }

      res.writeHead(200, { 'Content-Type': 'text/xml; charset=utf-8' });
      res.end(responseXml);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'text/xml; charset=utf-8' });
      res.end(buildSoapFault('Server', err.message));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`🏨 Mock SiteMinder pmsXchange running on http://localhost:${PORT}`);
  console.log(`   Auth: WSSE ${AUTH_USER}:${'*'.repeat(AUTH_PASS.length)}`);
  console.log(`   Endpoint: POST /pmsxchange`);
  console.log(`   Test: GET /health, GET /store, POST /reset`);
});
