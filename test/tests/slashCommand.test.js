const request = require('supertest');
const app = require('../../server'); 


// Test for Slack Slash Command API
describe('Slash Command API Tests', () => {

    // Test for error for missing `trigger_id`
    it('should return an error for missing trigger_id', async () => {
        const res = await request(app)
            .post('/approval-test')
            .send({}); 

        expect(res.statusCode).toBe(400);
        expect(res.body).toHaveProperty('error', 'Missing trigger_id');
    });

    //Test for when `trigger_id` is provided
    it('should successfully open modal with a valid trigger_id', async () => {
        const res = await request(app)
            .post('/approval-test')
            .send({ trigger_id: 'test_trigger' });

        expect(res.statusCode).toBe(200);
    });

});
