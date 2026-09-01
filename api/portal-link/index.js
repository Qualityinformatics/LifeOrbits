const Stripe = require('stripe')
const { getTableClient } = require('../lib/tables')

const json = (status, obj) => ({ status, headers: { 'Content-Type': 'application/json' }, body: obj })

// Generates a Stripe Billing Portal link scoped to the exact customer behind
// this access token — unlike the generic shared portal login URL, this
// always resolves to the right subscription, even when the same email has
// multiple Stripe Customer records across products.
module.exports = async function (context, req) {
  const token = req.query.token
  if (!token) {
    context.res = json(400, { error: 'missing token' })
    return
  }

  try {
    const tokens = getTableClient('AccessTokens')
    const entity = await tokens.getEntity('token', token)

    const stripe = Stripe(process.env.STRIPE_SECRET_KEY)
    const session = await stripe.billingPortal.sessions.create({
      customer: entity.customerId,
      return_url: 'https://orbits.healthguru.fit/',
    })

    context.res = json(200, { url: session.url })
  } catch (err) {
    context.log.error('portal-link failed:', err)
    context.res = json(404, { error: 'could not create portal link' })
  }
}
