const test = require('node:test');
const assert = require('node:assert/strict');
const express = require('express');
const request = require('supertest');
const jwt = require('jsonwebtoken');

process.env.JWT_SECRET = 'test-secret';

const { protect } = require('../dist/middlewares/authMiddleware');

test('protect middleware allows valid bearer token', async () => {
  const app = express();
  app.get('/secure', protect, (req, res) => {
    res.status(200).json({ ok: true, userId: req.user.userId });
  });

  const token = jwt.sign({ userId: 'u1', email: 'u1@example.com', role: 'USER' }, process.env.JWT_SECRET);
  const res = await request(app).get('/secure').set('Authorization', `Bearer ${token}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.ok, true);
  assert.equal(res.body.userId, 'u1');
});

test('protect middleware blocks missing token', async () => {
  const app = express();
  app.get('/secure', protect, (_req, res) => res.status(200).json({ ok: true }));

  const res = await request(app).get('/secure');
  assert.equal(res.status, 401);
});
