require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf.toString(); } }));
app.use(express.urlencoded({ extended: true }));

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
if (!SLACK_BOT_TOKEN) {
    console.error(" SLACK_BOT_TOKEN is missing. Check your .env file.");
    process.exit(1);
}

// Handle Slack Event Subscription
app.post('/slack/events', async (req, res) => {
    const payload = req.body;
    console.log("Received Event:", payload);

    if (payload.type === "url_verification") {
        return res.json({ challenge: payload.challenge });
    }

    if (payload.type === "view_submission") {
        console.log(" Approval Request Submitted!");
        
        const view = payload.view;
        const approverId = view.state.values.approver.approver_select.selected_user;
        const requestText = view.state.values.request_text.request_input.value;

        console.log("Approver:", approverId);
        console.log("Request Details:", requestText);

        return res.status(200).json({ response_action: "clear" });
    }

    //  response for approve/reject
    if (payload.type === "block_actions") {
        const action = payload.actions[0]; 
        const actionName = action.name; 
        const actionValue = JSON.parse(action.value); 
        const decision = actionName === "approve" ? " Approved" : " Rejected";

        console.log(`Approval decision: ${decision} by ${payload.user.id}`);

        
        return res.status(200).json({ text: `Decision recorded: ${decision}` });
    }

    return res.status(200).send(); 
});




//Handle Slash Command
app.post('/approval-test', async (req, res) => {
    const trigger_id = req.body.trigger_id || req.query.trigger_id;
    if (!trigger_id) {
        return res.status(400).json({ error: "Missing trigger_id" });
    }

    const modalData = {
        trigger_id: trigger_id,
        view: {
            type: "modal",
            callback_id: "approval_modal",
            title: { type: "plain_text", text: "Request Approval" },
            blocks: [
                {
                    type: "input",
                    block_id: "approver",
                    element: {
                        type: "users_select",
                        action_id: "approver_select",
                        placeholder: { type: "plain_text", text: "Select an approver" }
                    },
                    label: { type: "plain_text", text: "Approver" }
                },
                {
                    type: "input",
                    block_id: "request_text",
                    element: {
                        type: "plain_text_input",
                        action_id: "request_input",
                        multiline: true,
                        placeholder: { type: "plain_text", text: "Enter request details" }
                    },
                    label: { type: "plain_text", text: "Approval Request" }
                }
            ],
            submit: { type: "plain_text", text: "Submit" }
        }
    };

    try {
        await axios.post("https://slack.com/api/views.open", modalData, {
            headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, "Content-Type": "application/json" }
        });
        res.sendStatus(200);
    } catch (error) {
        console.error(" Error opening modal:", error.response?.data || error.message);
        res.status(500).json({ error: "Failed to open modal" });
    }
});

// Get the user ID
app.get('/api/users/:id', (req, res) => {
    const userId = req.params.id;
    const mockUser = { id: userId, username: "testuser" };

    if (!mockUser) {
        return res.status(404).json({ error: "User not found" });
    }

    res.status(200).json(mockUser);
});


module.exports = app;

app.listen(4000, () => console.log("Server running on port 4000"));
