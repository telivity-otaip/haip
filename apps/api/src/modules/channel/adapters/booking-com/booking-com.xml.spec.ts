import { describe, it, expect } from 'vitest';
import { buildOtaXml, parseOtaXml } from './booking-com.xml';

describe('BookingCom XML Utilities', () => {
  describe('buildOtaXml', () => {
    it('should build valid OTA XML envelope', () => {
      const xml = buildOtaXml('OTA_HotelAvailNotifRQ', {
        AvailStatusMessages: {
          '@_HotelCode': 'HOTEL1',
        },
      });

      expect(xml).toContain('<?xml');
      expect(xml).toContain('OTA_HotelAvailNotifRQ');
      expect(xml).toContain('xmlns');
      expect(xml).toContain('EchoToken');
      expect(xml).toContain('TimeStamp');
      expect(xml).toContain('HOTEL1');
    });

    it('should include version attribute', () => {
      const xml = buildOtaXml('OTA_TestRQ', {});
      expect(xml).toContain('Version="1.0"');
    });

    it('should generate unique echo tokens', () => {
      const xml1 = buildOtaXml('OTA_TestRQ', {});
      const xml2 = buildOtaXml('OTA_TestRQ', {});

      const token1 = xml1.match(/EchoToken="([^"]+)"/)?.[1];
      const token2 = xml2.match(/EchoToken="([^"]+)"/)?.[1];

      expect(token1).toBeDefined();
      expect(token2).toBeDefined();
      expect(token1).not.toEqual(token2);
    });
  });

  describe('parseOtaXml', () => {
    it('should parse success response', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelAvailNotifRS xmlns="http://www.opentravel.org/OTA/2003/05">
  <Success/>
</OTA_HotelAvailNotifRS>`;

      const result = parseOtaXml(xml);
      expect(result.success).toBe(true);
      expect(result.messageName).toBe('OTA_HotelAvailNotifRS');
      expect(result.errors).toHaveLength(0);
    });

    it('should parse error response', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelAvailNotifRS xmlns="http://www.opentravel.org/OTA/2003/05">
  <Errors>
    <Error Code="450" ShortText="Unable to process request"/>
  </Errors>
</OTA_HotelAvailNotifRS>`;

      const result = parseOtaXml(xml);
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(1);
      expect(result.errors[0]!.code).toBe('450');
      expect(result.errors[0]!.message).toBe('Unable to process request');
    });

    it('should parse multiple errors', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OTA_ErrorRS>
  <Errors>
    <Error Code="100" ShortText="Error one"/>
    <Error Code="200" ShortText="Error two"/>
  </Errors>
</OTA_ErrorRS>`;

      const result = parseOtaXml(xml);
      expect(result.success).toBe(false);
      expect(result.errors).toHaveLength(2);
    });

    it('should return data from root element', () => {
      const xml = `<?xml version="1.0" encoding="UTF-8"?>
<OTA_HotelResNotifRS>
  <Success/>
  <HotelReservations>
    <HotelReservation ResStatus="Commit"/>
  </HotelReservations>
</OTA_HotelResNotifRS>`;

      const result = parseOtaXml(xml);
      expect(result.success).toBe(true);
      expect(result.data).toHaveProperty('HotelReservations');
    });
  });
});
