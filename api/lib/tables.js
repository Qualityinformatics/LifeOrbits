const { TableClient } = require('@azure/data-tables')

function getTableClient(tableName) {
  const conn = process.env.SUBSCRIBERS_STORAGE_CONNECTION_STRING
  if (!conn) throw new Error('SUBSCRIBERS_STORAGE_CONNECTION_STRING is not configured')
  return TableClient.fromConnectionString(conn, tableName)
}

// Only subscriptions on these Stripe Price IDs grant access. Empty = allow
// any active subscription on the account. Set this to Life Orbits' own
// price IDs so a HealthGuRu-only subscriber can't get in for free — Stripe
// delivers checkout/subscription events account-wide, not per product.
function priceAllowed(priceId) {
  const allowed = (process.env.ALLOWED_PRICE_IDS || '').split(',').map(s => s.trim()).filter(Boolean)
  return allowed.length === 0 || allowed.includes(priceId)
}

module.exports = { getTableClient, priceAllowed }
