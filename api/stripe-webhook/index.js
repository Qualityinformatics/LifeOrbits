const Stripe = require('stripe')
const { getTableClient, priceAllowed } = require('../lib/tables')

module.exports = async function (context, req) {
  const stripe = Stripe(process.env.STRIPE_SECRET_KEY)

  let event
  try {
    event = stripe.webhooks.constructEvent(req.rawBody, req.headers['stripe-signature'], process.env.STRIPE_WEBHOOK_SECRET)
  } catch (err) {
    context.log.error('Webhook signature verification failed:', err.message)
    context.res = { status: 400, body: `Webhook Error: ${err.message}` }
    return
  }

  try {
    const subscribers = getTableClient('Subscribers')
    const emailIndex = getTableClient('EmailIndex')

    const upsertSubscriber = (customerId, fields) =>
      subscribers.upsertEntity({ partitionKey: 'cus', rowKey: customerId, ...fields }, 'Merge')

    const linkEmail = (email, customerId) => {
      if (!email) return Promise.resolve()
      return emailIndex.upsertEntity({ partitionKey: 'email', rowKey: email.toLowerCase(), customerId }, 'Replace')
    }

    switch (event.type) {
      case 'checkout.session.completed': {
        const session = event.data.object
        if (session.mode !== 'subscription' || !session.customer) break

        const sub = session.subscription ? await stripe.subscriptions.retrieve(session.subscription) : null
        const priceId = sub?.items?.data?.[0]?.price?.id || ''
        const email = session.customer_details?.email || ''

        await upsertSubscriber(session.customer, {
          active: priceAllowed(priceId),
          email,
          subscriptionId: session.subscription || '',
          priceId,
          updatedAt: new Date().toISOString(),
        })
        await linkEmail(email, session.customer)
        break
      }

      case 'customer.subscription.created':
      case 'customer.subscription.updated': {
        const sub = event.data.object
        const priceId = sub.items?.data?.[0]?.price?.id || ''
        const active = ['active', 'trialing'].includes(sub.status) && priceAllowed(priceId)

        await upsertSubscriber(sub.customer, {
          active,
          subscriptionId: sub.id,
          priceId,
          updatedAt: new Date().toISOString(),
        })
        break
      }

      case 'customer.subscription.deleted': {
        const sub = event.data.object
        await upsertSubscriber(sub.customer, { active: false, updatedAt: new Date().toISOString() })
        break
      }

      default:
        break // ignore everything else
    }

    context.res = { status: 200, body: 'ok' }
  } catch (err) {
    context.log.error('Webhook handling failed:', err)
    context.res = { status: 500, body: 'internal error' }
  }
}
