const crypto = require('crypto')
const { getTableClient } = require('../lib/tables')

const json = (status, obj) => ({ status, headers: { 'Content-Type': 'application/json' }, body: obj })

// Two ways in:
//  - ?token=...   fast re-check on every app open, using the token issued
//                 by verify-session (or a previous restore).
//  - ?email=...   "restore access" on a new device/browser — looks up the
//                 Stripe customer by email and issues a fresh token.
module.exports = async function (context, req) {
  const token = req.query.token
  const email = req.query.email

  if (!token && !email) {
    context.res = json(400, { error: 'missing token or email' })
    return
  }

  try {
    const subscribers = getTableClient('Subscribers')

    async function activeForCustomer(customerId) {
      try {
        const entity = await subscribers.getEntity('cus', customerId)
        return !!entity.active
      } catch {
        return false
      }
    }

    if (token) {
      try {
        const tokens = getTableClient('AccessTokens')
        const entity = await tokens.getEntity('token', token)
        const active = await activeForCustomer(entity.customerId)
        context.res = json(200, { active })
      } catch {
        context.res = json(200, { active: false })
      }
      return
    }

    try {
      const emailIndex = getTableClient('EmailIndex')
      const entity = await emailIndex.getEntity('email', email.toLowerCase())
      const active = await activeForCustomer(entity.customerId)

      let newToken = null
      if (active) {
        newToken = crypto.randomUUID()
        const tokens = getTableClient('AccessTokens')
        await tokens.createEntity({ partitionKey: 'token', rowKey: newToken, customerId: entity.customerId, createdAt: new Date().toISOString() })
      }

      context.res = json(200, { active, token: newToken })
    } catch {
      context.res = json(200, { active: false })
    }
  } catch (err) {
    context.log.error('check-access failed:', err)
    context.res = json(500, { error: 'internal error' })
  }
}
