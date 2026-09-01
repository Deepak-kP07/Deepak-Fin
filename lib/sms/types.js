/**
 * @typedef {Object} SmsParsePattern
 * @property {string} [id]
 * @property {string} sender_id_pattern - Regex tested against the SMS sender header (e.g. "HDFCBK", "VM-SBIINB").
 * @property {string} message_regex - Regex with named capture groups, run against the SMS body.
 * @property {Record<string, {literal: any} | {from: string, transform?: string | string[]}>} field_mapping
 * @property {boolean} [is_active]
 * @property {number} [priority] - Higher tried first when multiple patterns match the same sender.
 */

/**
 * @typedef {Object} ParsedSms
 * @property {string} amount - Decimal string, commas stripped.
 * @property {'income'|'expense'} [type]
 * @property {string} [merchant]
 * @property {string} [last4_hint]
 * @property {string|null} matched_pattern_id
 * @property {string} sender_id
 */
