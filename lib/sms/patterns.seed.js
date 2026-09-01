// Canonical starter set of sms_parse_patterns rows. This is the single source of truth for both
// the parsing-engine unit tests (lib/sms/__tests__/parseEngine.test.js) and drizzle/0048's seed
// INSERT statements — kept in one file so the two can't silently drift apart. Regexes here are
// best-effort approximations of common Indian bank/UPI SMS formats; real bank wording varies by
// SMS gateway and changes over time, so these should be refined against real received SMS text
// once some are collected (Settings > SMS Auto-Detect will eventually let you manage these).
export const SMS_PATTERN_SEEDS = [
  {
    bank_or_app: 'HDFC Bank',
    sender_id_pattern: 'HDFCBK$',
    message_regex: String.raw`Rs\.?\s?(?<amount>[\d,]+\.\d{2}) debited from A\/c (?:XX|xx)?(?<last4>\d{4}) on [\w-]+ to VPA (?<merchant>[\w.@-]+)`,
    field_mapping: {
      amount: { from: 'amount', transform: 'stripCommas' },
      last4_hint: { from: 'last4' },
      merchant: { from: 'merchant', transform: 'trim' },
      type: { literal: 'expense' },
    },
    txn_type: 'expense',
    suggested_category_name: null,
    suggested_category_type: null,
    priority: 10,
  },
  {
    bank_or_app: 'ICICI Bank',
    sender_id_pattern: 'ICICIB$',
    message_regex: String.raw`Acct (?:XX|xx)?(?<last4>\d{4}) debited with INR (?<amount>[\d,]+\.\d{2}) on [\w-]+; (?<merchant>[\w &]+?) credited`,
    field_mapping: {
      amount: { from: 'amount', transform: 'stripCommas' },
      last4_hint: { from: 'last4' },
      merchant: { from: 'merchant', transform: 'trim' },
      type: { literal: 'expense' },
    },
    txn_type: 'expense',
    suggested_category_name: null,
    suggested_category_type: null,
    priority: 10,
  },
  {
    bank_or_app: 'State Bank of India',
    sender_id_pattern: 'SBI',
    message_regex: String.raw`A\/C (?:X{1,2})?(?<last4>\d{4}) debited by (?<amount>[\d,]+(?:\.\d{1,2})?) on date [\w]+ trf to (?<merchant>[\w ]+?) Refno`,
    field_mapping: {
      amount: { from: 'amount', transform: 'stripCommas' },
      last4_hint: { from: 'last4' },
      merchant: { from: 'merchant', transform: 'trim' },
      type: { literal: 'expense' },
    },
    txn_type: 'expense',
    suggested_category_name: null,
    suggested_category_type: null,
    priority: 5,
  },
  {
    bank_or_app: 'Axis Bank',
    sender_id_pattern: 'AXISBK$',
    message_regex: String.raw`INR (?<amount>[\d,]+\.\d{2}) debited from A\/c no\. (?:XX|xx)?(?<last4>\d{4}) on [\d-]+ towards UPI\/P2M\/\d+\/(?<merchant>\w+)\. Avl Bal`,
    field_mapping: {
      amount: { from: 'amount', transform: 'stripCommas' },
      last4_hint: { from: 'last4' },
      merchant: { from: 'merchant', transform: 'trim' },
      type: { literal: 'expense' },
    },
    txn_type: 'expense',
    suggested_category_name: null,
    suggested_category_type: null,
    priority: 10,
  },
  {
    bank_or_app: 'Google Pay (UPI)',
    sender_id_pattern: 'GPAY',
    message_regex: String.raw`You received Rs\.?(?<amount>[\d,]+(?:\.\d{1,2})?) from (?<merchant>[\w. ]+?) via UPI`,
    field_mapping: {
      amount: { from: 'amount', transform: 'stripCommas' },
      merchant: { from: 'merchant', transform: 'trim' },
      type: { literal: 'income' },
    },
    txn_type: 'income',
    suggested_category_name: null,
    suggested_category_type: null,
    priority: 10,
  },
  {
    bank_or_app: 'PhonePe (UPI)',
    sender_id_pattern: 'PHONEPE',
    message_regex: String.raw`Payment of Rs\.?(?<amount>[\d,]+(?:\.\d{1,2})?) made to (?<merchant>[\w. ]+?) via PhonePe UPI`,
    field_mapping: {
      amount: { from: 'amount', transform: 'stripCommas' },
      merchant: { from: 'merchant', transform: 'trim' },
      type: { literal: 'expense' },
    },
    txn_type: 'expense',
    // Bank/app alone doesn't reliably imply a category (a PhonePe payment could be to anyone) —
    // suggested_category_name stays null across every seed pattern for the same reason. Real
    // category suggestions need per-merchant keyword rules, which is future work, not this table.
    suggested_category_name: null,
    suggested_category_type: null,
    priority: 10,
  },
  {
    bank_or_app: 'Paytm (UPI)',
    sender_id_pattern: 'PAYTM',
    message_regex: String.raw`Paid Rs\.?(?<amount>[\d,]+(?:\.\d{1,2})?) to (?<merchant>[\w. ]+?) (?:via|using) Paytm`,
    field_mapping: {
      amount: { from: 'amount', transform: 'stripCommas' },
      merchant: { from: 'merchant', transform: 'trim' },
      type: { literal: 'expense' },
    },
    txn_type: 'expense',
    suggested_category_name: null,
    suggested_category_type: null,
    priority: 10,
  },
  {
    bank_or_app: 'Canara Bank',
    sender_id_pattern: 'CANBNK',
    message_regex: String.raw`A\/C (?:XX|xx)?(?<last4>\d{4}) Debited for Rs:?(?<amount>[\d,]+\.\d{2}) on [\d-]+ trf to (?<merchant>[\w ]+?) Refno`,
    field_mapping: {
      amount: { from: 'amount', transform: 'stripCommas' },
      last4_hint: { from: 'last4' },
      merchant: { from: 'merchant', transform: 'trim' },
      type: { literal: 'expense' },
    },
    txn_type: 'expense',
    suggested_category_name: null,
    suggested_category_type: null,
    priority: 10,
  },
  {
    bank_or_app: 'India Post Payments Bank',
    sender_id_pattern: 'IPPB',
    message_regex: String.raw`Rs\.?(?<amount>[\d,]+\.\d{2}) debited from your IPPB A\/c (?:XX|xx)?(?<last4>\d{4}).*?to VPA (?<merchant>[\w.@-]+?)\.\s`,
    field_mapping: {
      amount: { from: 'amount', transform: 'stripCommas' },
      last4_hint: { from: 'last4' },
      merchant: { from: 'merchant', transform: 'trim' },
      type: { literal: 'expense' },
    },
    txn_type: 'expense',
    suggested_category_name: null,
    suggested_category_type: null,
    priority: 10,
  },
  {
    // Credit card SPEND alerts are a different message shape than the bank-account debit alerts
    // above — the last4 here belongs to a card, not an account. lib/server/genericCrud.js's
    // ingestion enrichment already falls back to matching credit_cards.last4 whenever no account
    // matches first, so this resolves credit_card_id automatically the same way the others
    // resolve account_id — no extra wiring needed for this pattern specifically.
    bank_or_app: 'SBI Card',
    sender_id_pattern: 'SBICARD',
    message_regex: String.raw`Your SBI Credit Card (?:ending )?(?:XX|xx)?(?<last4>\d{4}) (?:has been )?used for Rs\.?(?<amount>[\d,]+(?:\.\d{1,2})?) at (?<merchant>[\w. ]+?) on`,
    field_mapping: {
      amount: { from: 'amount', transform: 'stripCommas' },
      last4_hint: { from: 'last4' },
      merchant: { from: 'merchant', transform: 'trim' },
      type: { literal: 'expense' },
    },
    txn_type: 'expense',
    suggested_category_name: null,
    suggested_category_type: null,
    priority: 10,
  },
]
