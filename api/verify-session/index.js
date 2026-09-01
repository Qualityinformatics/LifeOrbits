const Stripe = require('stripe')
const crypto = require('crypto')
const { getTableClient, priceAllowed } = require('../lib/tables')

const json = (status, obj) => ({ status, headers: { 'Content-Type': 'application/json' }, body: obj })

// Called right after Stripe redirects back with ?session_id=... from
// checkout. Confirms the session directly with Stripe (never trusts the
// client) and issues an opaque access token tied to the Stripe customer.
module.exports = async function (context, req) {
  const sessionId = req.query.session_id
  if (!sessionId) {
    context.res = json(400, { error: 'missing session_id' })
    return
  }

  const stripe = Stripe(process.env.STRIPE_SECRET_KEY)

  let session
  try {
    session = await stripe.checkout.sessions.retrieve(sessionId, { expand: ['subscription'] })
  } catch (err) {
    context.res = json(404, { active: false, error: 'session not found' })
    return
  }

  const priceId = session.subscription?.items?.data?.[0]?.price?.id || ''
  const paid = session.mode === 'subscription' && session.payment_status === 'paid' && priceAllowed(priceId)

  if (!paid || !session.customer) {
    context.res = json(200, { active: false })
    return
  }

  const customerId = typeof session.customer === 'string' ? session.customer : session.customer.id
  const token = crypto.randomUUID()

  try {
    const tokens = getTableClient('AccessTokens')
    await tokens.createEntity({ partitionKey: 'token', rowKey: token, customerId, createdAt: new Date().toISOString() })
  } catch (err) {
    context.log.error('verify-session failed to store token:', err)
    context.res = json(500, { active: false, error: 'internal error' })
    return
  }

  context.res = json(200, { active: true, token })
}
