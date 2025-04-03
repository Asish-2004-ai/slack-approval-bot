const request = require('supertest');
const app = require('../../server'); 

// Test for User API
describe('User API Tests', () => {
    it('should return user details', async () => {
        const res = await request(app).get('/api/users/1'); 
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('username');
    });
});
