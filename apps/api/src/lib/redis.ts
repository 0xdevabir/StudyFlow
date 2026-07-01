/**
 * Optional Redis. When `REDIS_URL` is unset we hand back a no-op shim so
 * rate-limiter and cache calls stay safe to call.
 */
import { config } from './env.js';
import { logger } from './logger.js';

export interface KVStore {
  get(key: string): Promise<string | null>;
  set(key: string, value: string, opts?: { ttlSec?: number }): Promise<void>;
  del(key: string): Promise<void>;
  incr(key: string, windowSec: number): Promise<{ count: number; ttl: number }>;
}

class MemoryStore implements KVStore {
  private map = new Map<string, { v: string; expiresAt?: number }>();
  async get(key: string) {
    const e = this.map.get(key);
    if (!e) return null;
    if (e.expiresAt && e.expiresAt < Date.now()) {
      this.map.delete(key);
      return null;
    }
    return e.v;
  }
  async set(key: string, value: string, opts?: { ttlSec?: number }) {
    this.map.set(key, {
      v: value,
      expiresAt: opts?.ttlSec ? Date.now() + opts.ttlSec * 1000 : undefined,
    });
  }
  async del(key: string) {
    this.map.delete(key);
  }
  async incr(key: string, windowSec: number) {
    const cur = await this.get(key);
    const next = (cur ? Number(cur) : 0) + 1;
    await this.set(key, String(next), { ttlSec: windowSec });
    return { count: next, ttl: windowSec };
  }
}

let _store: KVStore | null = null;
export function getKV(): KVStore {
  if (_store) return _store;
  if (config.REDIS_URL) {
    // Lazy import to avoid bundling ioredis when unused.
    import('ioredis').then(async ({ default: Redis }) => {
      const client = new Redis(config.REDIS_URL!, { lazyConnect: false });
      _store = buildRedisStore(client);
      logger.info('Redis cache enabled.');
    }).catch((err) => {
      logger.warn({ err }, 'Redis unavailable; falling back to in-memory.');
      _store = new MemoryStore();
    });
    // Return memory store immediately; will be replaced on connect.
    _store = new MemoryStore();
  } else {
    _store = new MemoryStore();
  }
  return _store;
}

function buildRedisStore(client: { get: Function; set: Function; del: Function; incr: Function; ttl: Function; expire: Function }): KVStore {
  return {
    async get(key) {
      return (await client.get(key)) as string | null;
    },
    async set(key, value, opts) {
      if (opts?.ttlSec) await client.set(key, value, 'EX', opts.ttlSec);
      else await client.set(key, value);
    },
    async del(key) {
      await client.del(key);
    },
    async incr(key, windowSec) {
      const count = await client.incr(key);
      if (count === 1) await client.expire(key, windowSec);
      const ttl = await client.ttl(key);
      return { count, ttl: typeof ttl === 'number' ? ttl : windowSec };
    },
  };
}