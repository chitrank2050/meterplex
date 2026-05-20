/**
 * Kafka topic and consumer group constants.
 *
 * All topic names and consumer group IDs are defined here.
 * No magic strings scattered across the codebase.
 *
 * Naming convention:
 *   Topics:  <domain>.<event-type>    e.g., usage.raw, usage.validated
 *   Groups:  <service>-<purpose>      e.g., meterplex-usage-validator
 */
export const KAFKA_TOPICS = {
  /** Raw usage events as received from clients. */
  USAGE_RAW: 'usage.raw',

  /** Validated and enriched usage events, ready for aggregation. */
  USAGE_VALIDATED: 'usage.validated',

  /** Failed events that need manual investigation or retry. */
  USAGE_DEAD_LETTER: 'usage.dead-letter',

  /** Duplicate events detected during processing (monitoring only). */
  USAGE_DUPLICATES: 'usage.duplicates',
} as const;

export const KAFKA_CONSUMER_GROUPS = {
  /** Validates raw events and publishes to usage.validated. */
  USAGE_VALIDATOR: 'meterplex-usage-validator',

  /** Aggregates validated events into usage_aggregates table. */
  USAGE_AGGREGATOR: 'meterplex-usage-aggregator',

  /** Persists dead letter events for investigation. */
  DEAD_LETTER_HANDLER: 'meterplex-dead-letter-handler',
} as const;

/** Kafka broker connection string. */
export const KAFKA_BROKER =
  process.env.KAFKA_BROKER ?? ('localhost:9092' as const);

/** Client ID for Kafka connections. */
export const KAFKA_CLIENT_ID = 'meterplex' as const;
