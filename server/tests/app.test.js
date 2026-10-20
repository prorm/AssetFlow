process.env.JWT_SECRET = process.env.JWT_SECRET || 'test-secret';

const request = require('supertest');
const app = require('../app');

describe('AssetFlow API basics', () => {
  test('GET /api/health returns UP', async () => {
    const res = await request(app).get('/api/health');

    expect(res.statusCode).toBe(200);
    expect(res.body.status).toBe('UP');
  });

  test('GET /api/ready returns 503 when MongoDB is disconnected', async () => {
    const res = await request(app).get('/api/ready');

    expect(res.statusCode).toBe(503);
    expect(res.body.status).toBe('NOT_READY');
  });

  test('Unknown route returns 404', async () => {
    const res = await request(app).get('/api/this-route-does-not-exist');

    expect(res.statusCode).toBe(404);
  });
});