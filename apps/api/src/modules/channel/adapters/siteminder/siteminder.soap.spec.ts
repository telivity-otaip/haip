import { describe, it, expect } from 'vitest';
import { buildSoapEnvelope, parseSoapResponse, buildWsseHeader } from './siteminder.soap';

describe('SiteMinder SOAP Utilities', () => {
  describe('buildWsseHeader', () => {
    it('should build WSSE UsernameToken header', () => {
      const header = buildWsseHeader('user1', 'pass1');
      const security = header['wsse:Security'] as any;

      expect(security['@_xmlns:wsse']).toContain('wss-wssecurity-secext');
      expect(security['wsse:UsernameToken']['wsse:Username']).toBe('user1');
      expect(security['wsse:UsernameToken']['wsse:Password']).toBe('pass1');
    });
  });

  describe('buildSoapEnvelope', () => {
    it('should wrap OTA body in SOAP envelope with WSSE', () => {
      const xml = buildSoapEnvelope(
        'OTA_HotelAvailNotifRQ',
        { AvailStatusMessages: { '@_HotelCode': 'H1' } },
        'testuser',
        'testpass',
      );

      expect(xml).toContain('soap:Envelope');
      expect(xml).toContain('soap:Header');
      expect(xml).toContain('wsse:Security');
      expect(xml).toContain('wsse:Username');
      expect(xml).toContain('testuser');
      expect(xml).toContain('soap:Body');
      expect(xml).toContain('OTA_HotelAvailNotifRQ');
      expect(xml).toContain('H1');
    });

    it('should include EchoToken and TimeStamp', () => {
      const xml = buildSoapEnvelope('ReadRQ', {}, 'u', 'p');
      expect(xml).toContain('EchoToken');
      expect(xml).toContain('TimeStamp');
    });

    it('should generate unique echo tokens', () => {
      const xml1 = buildSoapEnvelope('ReadRQ', {}, 'u', 'p');
      const xml2 = buildSoapEnvelope('ReadRQ', {}, 'u', 'p');

      const token1 = xml1.match(/EchoToken="([^"]+)"/)?.[1];
      const token2 = xml2.match(/EchoToken="([^"]+)"/)?.[1];
      expect(token1).not.toEqual(token2);
    });
  });

  describe('parseSoapResponse', () => {
    it('should parse success response', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <OTA_HotelAvailNotifRS xmlns="http://www.opentravel.org/OTA/2003/05">
      <Success/>
    </OTA_HotelAvailNotifRS>
  </soap:Body>
</soap:Envelope>`;

      const result = parseSoapResponse(xml);
      expect(result.success).toBe(true);
      expect(result.isFault).toBe(false);
      expect(result.errors).toHaveLength(0);
    });

    it('should parse SOAP fault (auth failure)', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <soap:Fault>
      <faultcode>wsse:FailedAuthentication</faultcode>
      <faultstring>Invalid credentials</faultstring>
    </soap:Fault>
  </soap:Body>
</soap:Envelope>`;

      const result = parseSoapResponse(xml);
      expect(result.success).toBe(false);
      expect(result.isFault).toBe(true);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.code).toContain('FailedAuthentication');
      expect(result.errors[0]!.message).toBe('Invalid credentials');
    });

    it('should parse OTA-level errors within SOAP body', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <OTA_HotelAvailNotifRS>
      <Errors>
        <Error Code="450" ShortText="Invalid hotel code"/>
      </Errors>
    </OTA_HotelAvailNotifRS>
  </soap:Body>
</soap:Envelope>`;

      const result = parseSoapResponse(xml);
      expect(result.success).toBe(false);
      expect(result.isFault).toBe(false);
      expect(result.errors[0]!.code).toBe('450');
    });

    it('should extract reservation data from body', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<soap:Envelope xmlns:soap="http://schemas.xmlsoap.org/soap/envelope/">
  <soap:Body>
    <OTA_ResRetrieveRS>
      <Success/>
      <ReservationsList>
        <HotelReservation ResStatus="Commit"/>
      </ReservationsList>
    </OTA_ResRetrieveRS>
  </soap:Body>
</soap:Envelope>`;

      const result = parseSoapResponse(xml);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('ReservationsList');
    });
  });
});
