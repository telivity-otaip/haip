/**
 * Mock Booking.com Connectivity Partner API Server
 *
 * Simulates Booking.com's OTA XML API for local development and testing.
 * Accepts OTA XML messages, validates basic structure, returns valid responses.
 * Stores received data in memory for test verification.
 *
 * Usage:
 *   node server.mjs              # starts on port 4000
 *   PORT=4001 node server.mjs    # starts on custom port
 */

import http from 'node:http';
import { XMLBuilder, XMLParser } from 'fast-xml-parser';

const PORT = parseInt(process.env.PORT ?? '4000', 10);
const AUTH_USER = process.env.AUTH_USER ?? 'haip_test';
const AUTH_PASS = process.env.AUTH_PASS ?? 'test_password';

const parser = new XMLParser({ ignoreAttributes: false, attributeNamePrefix: '@_' });
const builder = new XMLBuilder({ ignoreAttributes: false, attributeNamePrefix: '@_', format: true });

// In-memory storage
const store = {
  availability: [],
  rates: [],
  restrictions: [],
  reservations: [],
  confirmations: [],
  cancellations: [],
};

// Sample reservation for pull
const SAMPLE_RESERVATION_XML = `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelResNotifRS xmlns="http://www.opentravel.org/OTA/2003/05">
  <Success/>
  <HotelReservations>
    <HotelReservation ResStatus="Commit" CreateDateTime="2026-04-01T10:00:00Z">
      <UniqueID Type="14" ID="BDC-12345678"/>
      <RoomStays>
        <RoomStay>
          <RoomTypes><RoomType RoomTypeCode="DLXK"/></RoomTypes>
          <RatePlans><RatePlan RatePlanCode="BAR"/></RatePlans>
          <GuestCounts>
            <GuestCount AgeQualifyingCode="10" Count="2"/>
            <GuestCount AgeQualifyingCode="8" Count="1"/>
          </GuestCounts>
          <TimeSpan Start="2026-04-15" End="2026-04-18"/>
          <Total AmountAfterTax="450.00" CurrencyCode="USD"/>
        </RoomStay>
      </RoomStays>
      <ResGuests>
        <ResGuest>
          <Profiles>
            <ProfileInfo>
              <Profile>
                <Customer>
                  <PersonName>
                    <GivenName>John</GivenName>
                    <Surname>Doe</Surname>
                  </PersonName>
                  <Email>john.doe@example.com</Email>
                  <Telephone PhoneNumber="+1-555-0123"/>
                </Customer>
              </Profile>
            </ProfileInfo>
          </Profiles>
        </ResGuest>
      </ResGuests>
      <SpecialRequests>
        <SpecialRequest><Text>Late check-in after 10 PM</Text></SpecialRequest>
      </SpecialRequests>
    </HotelReservation>
  </HotelReservations>
</OTA_HotelResNotifRS>`;

/**
 * Verify Basic Auth credentials.
 */
function verifyAuth(req) {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith('Basic ')) return false;
  const decoded = Buffer.from(authHeader.slice(6), 'base64').toString();
  const [user, pass] = decoded.split(':');
  return user === AUTH_USER && pass === AUTH_PASS;
}

/**
 * Build a success response.
 */
function buildSuccessResponse(messageName) {
  return builder.build({
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    [messageName]: {
      '@_xmlns': 'http://www.opentravel.org/OTA/2003/05',
      Success: '',
    },
  });
}

/**
 * Build an error response.
 */
function buildErrorResponse(messageName, code, message) {
  return builder.build({
    '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
    [messageName]: {
      '@_xmlns': 'http://www.opentravel.org/OTA/2003/05',
      Errors: {
        Error: { '@_Code': code, '@_ShortText': message },
      },
    },
  });
}

/**
 * Read full request body.
 */
function readBody(req) {
  return new Promise((resolve) => {
    const chunks = [];
    req.on('data', (c) => chunks.push(c));
    req.on('end', () => resolve(Buffer.concat(chunks).toString()));
  });
}

// Route handlers
const handlers = {
  '/ota/OTA_HotelAvailNotif': async (body) => {
    const parsed = parser.parse(body);
    store.availability.push({ timestamp: new Date().toISOString(), data: parsed });
    return buildSuccessResponse('OTA_HotelAvailNotifRS');
  },

  '/ota/OTA_HotelRateAmountNotif': async (body) => {
    const parsed = parser.parse(body);
    // Check if it's rates or restrictions based on content
    const root = parsed.OTA_HotelRateAmountNotifRQ ?? parsed;
    const hasRestrictions = JSON.stringify(root).includes('StopSell') ||
                            JSON.stringify(root).includes('MinLOS') ||
                            JSON.stringify(root).includes('CTA');
    if (hasRestrictions) {
      store.restrictions.push({ timestamp: new Date().toISOString(), data: parsed });
    } else {
      store.rates.push({ timestamp: new Date().toISOString(), data: parsed });
    }
    return buildSuccessResponse('OTA_HotelRateAmountNotifRS');
  },

  '/ota/OTA_HotelResRQ': async (_body) => {
    store.reservations.push({ timestamp: new Date().toISOString(), type: 'pull' });
    return SAMPLE_RESERVATION_XML;
  },

  '/ota/OTA_HotelResRS': async (body) => {
    const parsed = parser.parse(body);
    store.confirmations.push({ timestamp: new Date().toISOString(), data: parsed });
    return buildSuccessResponse('OTA_HotelResRS');
  },

  '/ota/OTA_CancelRQ': async (body) => {
    const parsed = parser.parse(body);
    store.cancellations.push({ timestamp: new Date().toISOString(), data: parsed });
    return builder.build({
      '?xml': { '@_version': '1.0', '@_encoding': 'UTF-8' },
      OTA_CancelRS: {
        '@_xmlns': 'http://www.opentravel.org/OTA/2003/05',
        '@_Status': 'Cancelled',
        Success: '',
      },
    });
  },
};

// HTTP server
const server = http.createServer(async (req, res) => {
  // Health check
  if (req.method === 'GET' && req.url === '/health') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ status: 'ok', store: Object.fromEntries(
      Object.entries(store).map(([k, v]) => [k, v.length]),
    ) }));
    return;
  }

  // Store inspection (for tests)
  if (req.method === 'GET' && req.url === '/store') {
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(store));
    return;
  }

  // Reset store (for tests)
  if (req.method === 'POST' && req.url === '/reset') {
    for (const key of Object.keys(store)) store[key] = [];
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ reset: true }));
    return;
  }

  // Auth check for OTA endpoints
  if (req.url?.startsWith('/ota/')) {
    if (!verifyAuth(req)) {
      res.writeHead(401, { 'Content-Type': 'application/xml' });
      res.end(buildErrorResponse('Error', '401', 'Unauthorized'));
      return;
    }

    if (req.method !== 'POST') {
      res.writeHead(405, { 'Content-Type': 'text/plain' });
      res.end('Method Not Allowed');
      return;
    }

    const handler = handlers[req.url];
    if (!handler) {
      res.writeHead(404, { 'Content-Type': 'application/xml' });
      res.end(buildErrorResponse('Error', '404', `Unknown endpoint: ${req.url}`));
      return;
    }

    try {
      const body = await readBody(req);
      const responseXml = await handler(body);
      res.writeHead(200, { 'Content-Type': 'application/xml' });
      res.end(responseXml);
    } catch (err) {
      res.writeHead(500, { 'Content-Type': 'application/xml' });
      res.end(buildErrorResponse('Error', '500', err.message));
    }
    return;
  }

  res.writeHead(404, { 'Content-Type': 'text/plain' });
  res.end('Not Found');
});

server.listen(PORT, () => {
  console.log(`🏨 Mock Booking.com API running on http://localhost:${PORT}`);
  console.log(`   Auth: ${AUTH_USER}:${'*'.repeat(AUTH_PASS.length)}`);
  console.log(`   Endpoints: ${Object.keys(handlers).join(', ')}`);
  console.log(`   Test: GET /health, GET /store, POST /reset`);
});
