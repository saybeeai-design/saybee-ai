const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');

process.env.NODE_ENV = 'test';
process.env.DATABASE_URL = process.env.DATABASE_URL || 'postgresql://user:pass@localhost:5432/db?sslmode=require';
process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';
process.env.GEMINI_API_KEY = process.env.GEMINI_API_KEY || 'test-gemini';
process.env.GOOGLE_CLIENT_ID = process.env.GOOGLE_CLIENT_ID || 'google-client';
process.env.GOOGLE_CLIENT_SECRET = process.env.GOOGLE_CLIENT_SECRET || 'google-secret';
process.env.GOOGLE_CALLBACK_URL = process.env.GOOGLE_CALLBACK_URL || 'http://localhost:5000/api/auth/google/callback';

const app = require('../dist/app').default;

test('GET / returns API banner', async () => {
  const res = await request(app).get('/');
  assert.equal(res.status, 200);
  assert.match(res.text, /SayBee AI Backend is running/i);
});
