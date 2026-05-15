const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');

process.env.RAZORPAY_WEBHOOK_SECRET = 'webhook-secret';

const { webhookPayment } = require('../dist/controllers/paymentController');

test('webhook rejects invalid signature', async () => {
  const app = express();
  app.post('/webhook', express.raw({ type: 'application/json' }), webhookPayment);

  const payload = Buffer.from(JSON.stringify({ event: 'payment.captured' }));
  const res = await request(app)
    .post('/webhook')
    .set('content-type', 'application/json')
    .set('x-razorpay-signature', 'bad-signature')
    .send(payload);

  assert.equal(res.status, 400);
  assert.match(res.body.message, /Invalid webhook signature/i);
});
