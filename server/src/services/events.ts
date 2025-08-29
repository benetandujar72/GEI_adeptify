import { EventBus } from '../../shared/event-bus';
import type { EventTopic, DomainEventName } from '../../shared/events';

let singletonBus: EventBus | null = null;

export async function getEventBus(): Promise<EventBus> {
  if (!singletonBus) {
    singletonBus = new EventBus({});
    await singletonBus.connect();
  }
  return singletonBus;
}

export async function publishEvent<TName extends DomainEventName, TPayload>(
  topic: EventTopic,
  name: TName,
  payload: TPayload,
  extra?: { tenantId?: string; actor?: { userId?: string; role?: string; ip?: string } }
): Promise<string> {
  const bus = await getEventBus();
  return bus.publish(topic, name, payload, extra);
}


