import Redis from 'redis';
import { randomUUID } from 'crypto';
import type { BaseEvent, EventTopic, DomainEventName } from './events';

interface EventBusOptions {
  url?: string;
  consumerGroup?: string;
}

export class EventBus {
  private client: Redis.RedisClientType | null = null;
  private readonly url: string;
  private readonly group: string;

  constructor(options: EventBusOptions = {}) {
    this.url = options.url || process.env.REDIS_URL || 'redis://localhost:6379';
    this.group = options.consumerGroup || (process.env.EVENTS_CONSUMER_GROUP || 'gei-consumers');
  }

  async connect(): Promise<void> {
    if (this.client) return;
    this.client = Redis.createClient({ url: this.url });
    await this.client.connect();
  }

  async disconnect(): Promise<void> {
    if (!this.client) return;
    await this.client.quit();
    this.client = null;
  }

  private ensureClient(): asserts this is { client: Redis.RedisClientType } {
    if (!this.client) {
      throw new Error('EventBus not connected');
    }
  }

  // Publicar evento en un stream según tópico
  async publish<TName extends DomainEventName, TPayload>(
    topic: EventTopic,
    name: TName,
    payload: TPayload,
    extra?: Partial<BaseEvent<TName, TPayload>>
  ): Promise<string> {
    this.ensureClient();
    const event: BaseEvent<TName, TPayload> = {
      id: extra?.id || randomUUID(),
      name,
      occurredAt: extra?.occurredAt || new Date().toISOString(),
      tenantId: extra?.tenantId,
      actor: extra?.actor,
      payload,
      meta: extra?.meta,
    };

    const entryId = await this.client.xAdd(topic, '*', {
      name: event.name,
      occurredAt: event.occurredAt,
      tenantId: event.tenantId || '',
      actor: JSON.stringify(event.actor || {}),
      payload: JSON.stringify(event.payload),
      meta: JSON.stringify(event.meta || {}),
      id: event.id,
    });
    return entryId;
  }

  // Suscribirse con Consumer Group
  async subscribe(
    topic: EventTopic,
    consumerName: string,
    handler: (event: BaseEvent) => Promise<void> | void
  ): Promise<void> {
    this.ensureClient();
    // Crear stream y grupo si no existen
    try {
      await this.client.xGroupCreate(topic, this.group, '0', { MKSTREAM: true });
    } catch (e: any) {
      if (!String(e?.message || '').includes('BUSYGROUP')) {
        throw e;
      }
    }

    // Loop de consumo (no bloqueante; delegar a quien use la clase si quiere cancelación)
    const loop = async () => {
      while (true) {
        const res = await this.client!.xReadGroup(this.group, consumerName, [{ key: topic, id: '>' }], {
          COUNT: 10,
          BLOCK: 5000,
        });
        if (!res) continue;
        for (const stream of res) {
          for (const msg of stream.messages) {
            try {
              const map = msg.message as Record<string, string>;
              const event: BaseEvent = {
                id: map.id,
                name: map.name as DomainEventName,
                occurredAt: map.occurredAt,
                tenantId: map.tenantId || undefined,
                actor: JSON.parse(map.actor || '{}'),
                payload: JSON.parse(map.payload || '{}'),
                meta: JSON.parse(map.meta || '{}'),
              };
              await handler(event);
              await this.client!.xAck(topic, this.group, msg.id);
            } catch (err) {
              // No hacer ack para reintento
              // Opcional: enviar a DLQ
              console.error('Event handler error:', err);
            }
          }
        }
      }
    };
    // Disparar sin bloquear
    // eslint-disable-next-line @typescript-eslint/no-floating-promises
    loop();
  }
}


