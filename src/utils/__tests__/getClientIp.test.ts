import { Request } from 'express';
import { getClientIp } from '../getClientIp';

function mockRequest(partial: Partial<Request>): Request {
  return partial as Request;
}

describe('getClientIp', () => {
  it('returns the first IP from x-forwarded-for', () => {
    const req = mockRequest({
      headers: { 'x-forwarded-for': '203.0.113.1, 10.0.0.1' },
      socket: { remoteAddress: '127.0.0.1' } as Request['socket'],
    });

    expect(getClientIp(req)).toBe('203.0.113.1');
  });

  it('falls back to socket remoteAddress', () => {
    const req = mockRequest({
      headers: {},
      socket: { remoteAddress: '192.168.1.10' } as Request['socket'],
    });

    expect(getClientIp(req)).toBe('192.168.1.10');
  });

  it('falls back to req.ip when socket address is missing', () => {
    const req = mockRequest({
      headers: {},
      ip: '10.1.2.3',
      socket: { remoteAddress: undefined } as Request['socket'],
    });

    expect(getClientIp(req)).toBe('10.1.2.3');
  });
});
