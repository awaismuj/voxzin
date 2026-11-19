import { afterEach, describe, expect, it, vi } from 'vitest';
import { classifySuspiciousPath } from '@voxzin/shared';
import { OriginGuardService } from './origin-guard.service';

describe('classifySuspiciousPath', () => {
  it.each([
    ['/.env', 'SENSITIVE FILE PROBE'],
    ['/v2/.env.production', 'SENSITIVE FILE PROBE'],
    ['/public/content/pages/bless.php', 'PHP EXPLOIT'],
    ['/wp-login.php', 'PHP EXPLOIT'],
    ['/%252e%252e/etc/passwd', 'PATH TRAVERSAL'],
  ])('classifies %s', (path, attack) => {
    expect(classifySuspiciousPath(path)?.attack).toBe(attack);
  });

  it.each(['/articles/example', '/api/v1/health', '/.well-known/security.txt'])('allows normal path %s', (path) => {
    expect(classifySuspiciousPath(path)).toBeNull();
  });
});

describe('OriginGuardService', () => {
  afterEach(() => vi.useRealTimers());

  it('blocks exploit probes and reports bounded request and security metrics', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-11-19T10:00:00Z'));
    const service = new OriginGuardService();

    expect(service.inspectRequest('203.0.113.7', 'GET', '/.env')).toBe(true);
    expect(service.inspectRequest('203.0.113.8', 'GET', '/articles/news')).toBe(false);
    const overview = service.overview();
    expect(overview.requestsObserved).toBe(2);
    expect(overview.securityEvents).toBe(1);
    expect(overview.blockedRequests).toBe(1);
    expect(overview.recentEvents[0]?.request).toBe('GET /.env');
    expect(overview.recentEvents[0]?.status).toBe(403);
  });

  it('temporarily blocks an IP after repeated probes and expires the block', () => {
    vi.useFakeTimers().setSystemTime(new Date('2026-11-19T10:00:00Z'));
    const service = new OriginGuardService();
    for (let i = 0; i < 5; i++) expect(service.inspectRequest('203.0.113.7', 'GET', '/.env')).toBe(true);

    expect(service.overview().temporaryBlocks).toBe(1);
    expect(service.inspectRequest('203.0.113.7', 'GET', '/articles/news')).toBe(true);

    vi.advanceTimersByTime(30 * 60_000);
    expect(service.overview().temporaryBlocks).toBe(0);
    expect(service.inspectRequest('203.0.113.7', 'GET', '/articles/news')).toBe(false);
  });
});
