const request = require('supertest');
const app = require('../../server'); 

// Test for Slack Events API
describe('Slack Events API Tests', () => {
    
    // Test for Slack URL verification
    it('should respond with challenge for Slack URL verification', async () => {
        const res = await request(app)
            .post('/slack/events')
            .send({ type: 'url_verification', challenge: 'test_challenge' });

        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ challenge: 'test_challenge' });
    });

    //Test for Process approval request submission
    it('should process approval request submission', async () => {
        const res = await request(app)
            .post('/slack/events')
            .send({
                type: "view_submission",
                user: { id: "U12345" },
                view: {
                    state: {
                        values: {
                            approver: {
                                approver_select: {
                                    selected_user: "U67890"
                                }
                            },
                            request_text: {
                                request_input: {
                                    value: "Test Request"
                                }
                            }
                        }
                    }
                }
            });
    
        console.log("Response from API:", res.body); 
    
        expect(res.statusCode).toBe(200);
        expect(res.body).toEqual({ response_action: "clear" });
    });
    
     //Test for Process approve button action
    it('should process approve button action', async () => {
        const res = await request(app)
            .post('/slack/events')
            .send({
                type: "block_actions",
                user: { id: "U67890" },
                actions: [
                    {
                        name: "approve",
                        value: JSON.stringify({
                            requesterId: "U12345",
                            requestText: "Test Request"
                        })
                    }
                ]
            });
    
        console.log("Response from API:", res.body); 
    
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('text', 'Decision recorded:  Approved');
    });
    
     // Test for Process approve button action
    it('should process reject button action', async () => {
        const res = await request(app)
            .post('/slack/events')
            .send({
                type: "block_actions",
                user: { id: "U67890" },
                actions: [
                    {
                        name: "reject",
                        value: JSON.stringify({
                            requesterId: "U12345",
                            requestText: "Test Request"
                        })
                    }
                ]
            });
    
        console.log("Response from API:", res.body); 
    
        expect(res.statusCode).toBe(200);
        expect(res.body).toHaveProperty('text', 'Decision recorded:  Rejected');
    });
    
    

});
