import { randomUUID } from 'node:crypto';

export async function recordRevision(connection, { entityType, entityId, actorId, action, changes = [], snapshot = null }) {
  await connection.execute(
    `INSERT INTO entity_revisions (id, entity_type, entity_id, actor_id, action, changes_json, snapshot_json)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [randomUUID(), entityType, entityId, actorId, action, JSON.stringify(changes), snapshot == null ? null : JSON.stringify(snapshot)]
  );
}

export async function enqueueOutbox(connection, { eventType, aggregateType, aggregateId, version = null, payload, requestId, recipients = [] }) {
  const id = randomUUID();
  await connection.execute(
    `INSERT INTO outbox_events (id, event_type, aggregate_type, aggregate_id, aggregate_version, payload_json, request_id)
     VALUES (?, ?, ?, ?, ?, ?, ?)`,
    [id, eventType, aggregateType, aggregateId, version, JSON.stringify(payload), requestId]
  );
  for (const userId of new Set(recipients.filter(Boolean))) {
    await connection.execute('INSERT INTO outbox_recipients (event_id, user_id) VALUES (?, ?)', [id, userId]);
  }
  return id;
}
