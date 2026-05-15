const test = require('node:test');
const assert = require('node:assert/strict');
const crypto = require('crypto');

process.env.RAZORPAY_KEY_SECRET = 'rzp_secret_test';

const { verifyCheckoutSignature } = require('../dist/controllers/paymentController');

test('verifyCheckoutSignature validates correct signature', () => {
  const body = 'order_123|pay_123';
  const sig = crypto.createHmac('sha256', process.env.RAZORPAY_KEY_SECRET).update(body).digest('hex');

  const isValid = verifyCheckoutSignature({
    razorpay_order_id: 'order_123',
    razorpay_payment_id: 'pay_123',
    razorpay_signature: sig,
    plan: 'pro',
  });

  assert.equal(isValid, true);
});

test('verifyCheckoutSignature rejects invalid signature', () => {
  const isValid = verifyCheckoutSignature({
    razorpay_order_id: 'order_123',
    razorpay_payment_id: 'pay_123',
    razorpay_signature: 'invalid',
    plan: 'pro',
  });

  assert.equal(isValid, false);
});
