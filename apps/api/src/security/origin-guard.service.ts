import { Injectable } from '@nestjs/common';
import { classifySuspiciousPath, type SecurityPathDetection } from '@voxzin/shared';

const EVENT_LIMIT = 500;
const RECENT_IP_EVENT_LIMIT = 100;
const ATTACK_WINDOW_MS = 15 * 60_000;
const TEMP_BLOCK_MS = 30 * 60_000;
const ATTACKS_BEFORE_TEMP_BLOCK = 5;
const IP_TRACK_LIMIT = 5000;
const TEMP_BLOCK_LIMIT = 2000;
const DAY_MS = 24 * 60 * 60_000;

export interface SecurityEvent {
  timestamp: string;
  sourceIp: string;
  attack: string;
  rule: string;
  request: string;
  action: 'BLOCKED';
  status: 403;
}

interface HourBucket {
  requests: number;
  blocked: number;
  attacks: Map<string, number>;
}

@Injectable()
export class OriginGuardService {
  private readonly startedAt = Date.now();
  private observedRequests = 0;
  private readonly events: SecurityEvent[] = [];
  private readonly attackTimesByIp = new Map<string, number[]>();
  private readonly temporaryBlocks = new Map<string, number>();
  private readonly hourly = new Map<number, HourBucket>();

  inspectRequest(sourceIp: string, method: string, path: string): boolean {
    const now = Date.now();
    this.observedRequests++;
    this.bucket(now).requests++;
    this.prune(now);

    const request = `${method.slice(0, 12).toUpperCase()} ${path.slice(0, 300)}`;
    const blockedUntil = this.temporaryBlocks.get(sourceIp);
    if (blockedUntil && blockedUntil > now) {
      this.recordEvent(now, sourceIp, { attack: 'TEMPORARY BLOCK', rule: 'repeat-offender-block' }, request);
      return true;
    }

    const detection = classifySuspiciousPath(path);
    if (!detection) return false;

    this.recordEvent(now, sourceIp, detection, request);
    if (sourceIp !== 'unknown') {
      const attacks = (this.attackTimesByIp.get(sourceIp) ?? []).filter((time) => now - time <= ATTACK_WINDOW_MS);
      attacks.push(now);
      if (!this.attackTimesByIp.has(sourceIp) && this.attackTimesByIp.size >= IP_TRACK_LIMIT) {
        const oldestIp = this.attackTimesByIp.keys().next().value;
        if (oldestIp) this.attackTimesByIp.delete(oldestIp);
      }
      this.attackTimesByIp.set(sourceIp, attacks);
      if (attacks.length >= ATTACKS_BEFORE_TEMP_BLOCK) {
        if (!this.temporaryBlocks.has(sourceIp) && this.temporaryBlocks.size >= TEMP_BLOCK_LIMIT) {
          const oldestIp = this.temporaryBlocks.keys().next().value;
          if (oldestIp) this.temporaryBlocks.delete(oldestIp);
        }
        this.temporaryBlocks.set(sourceIp, now + TEMP_BLOCK_MS);
      }
    }
    return true;
  }

  overview() {
    const now = Date.now();
    this.prune(now);
    const dayStart = now - DAY_MS;
    let securityEvents = 0;
    let blockedRequests = 0;
    const classifications = new Map<string, number>();
    for (const [hour, bucket] of this.hourly) {
      if (hour < dayStart) continue;
      securityEvents += bucket.blocked;
      blockedRequests += bucket.blocked;
      for (const [attack, count] of bucket.attacks) classifications.set(attack, (classifications.get(attack) ?? 0) + count);
    }
    const recentEvents = this.events.slice(-RECENT_IP_EVENT_LIMIT).reverse();
    const suspiciousIps = new Set(recentEvents.map((event) => event.sourceIp).filter((ip) => ip !== 'unknown'));
    return {
      requestInspectionActive: true,
      requestsObserved: this.observedRequests,
      startedAt: new Date(this.startedAt).toISOString(),
      securityEvents,
      blockedRequests,
      suspiciousIps: suspiciousIps.size,
      temporaryBlocks: this.temporaryBlocks.size,
      attackClassifications: [...classifications].map(([attack, count]) => ({ attack, count })).sort((a, b) => b.count - a.count),
      activeTemporaryBlocks: [...this.temporaryBlocks].map(([sourceIp, expiresAt]) => ({ sourceIp, expiresAt: new Date(expiresAt).toISOString() })),
      recentEvents,
    };
  }

  private recordEvent(now: number, sourceIp: string, detection: SecurityPathDetection, request: string) {
    const event: SecurityEvent = {
      timestamp: new Date(now).toISOString(),
      sourceIp: sourceIp.slice(0, 64),
      attack: detection.attack,
      rule: detection.rule,
      request,
      action: 'BLOCKED',
      status: 403,
    };
    this.events.push(event);
    if (this.events.length > EVENT_LIMIT) this.events.splice(0, this.events.length - EVENT_LIMIT);
    const bucket = this.bucket(now);
    bucket.blocked++;
    bucket.attacks.set(detection.attack, (bucket.attacks.get(detection.attack) ?? 0) + 1);
  }

  private bucket(now: number) {
    const hour = Math.floor(now / 3_600_000) * 3_600_000;
    let bucket = this.hourly.get(hour);
    if (!bucket) {
      bucket = { requests: 0, blocked: 0, attacks: new Map() };
      this.hourly.set(hour, bucket);
    }
    return bucket;
  }

  private prune(now: number) {
    const oldestHour = Math.floor((now - DAY_MS) / 3_600_000) * 3_600_000;
    for (const hour of this.hourly.keys()) if (hour < oldestHour) this.hourly.delete(hour);
    for (const [ip, until] of this.temporaryBlocks) if (until <= now) this.temporaryBlocks.delete(ip);
    for (const [ip, times] of this.attackTimesByIp) {
      const recent = times.filter((time) => now - time <= ATTACK_WINDOW_MS);
      if (recent.length) this.attackTimesByIp.set(ip, recent);
      else this.attackTimesByIp.delete(ip);
    }
  }
}
