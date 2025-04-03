require('dotenv').config();
const express = require('express');
const axios = require('axios');

const app = express();
app.use(express.json({ verify: (req, res, buf) => { req.rawBody = buf.toString(); }})); 
app.use(express.urlencoded({ extended: true }));

const SLACK_BOT_TOKEN = process.env.SLACK_BOT_TOKEN;
if (!SLACK_BOT_TOKEN) {
    console.error(" SLACK_BOT_TOKEN is missing. Check your .env file.");
    process.exit(1);
}

//  Handle Slack Event Subscription
app.post('/slack/events', async (req, res) => {
    console.log("Received Event:", req.body);

    if (req.body.type === 'url_verification') {
        return res.json({ challenge: req.body.challenge });
    }

    if (req.body.payload) {
        const payload = JSON.parse(req.body.payload);

        // Handle Approval Request Submission
        if (payload.type === "view_submission") {
            const values = payload.view.state.values;
            const approverId = values.approver.approver_select.selected_user;
            const requestText = values.request_text.request_input.value;

            console.log("Approval Request Submitted!");
            console.log("Approver:", approverId);
            console.log("Request Details:", requestText);

            // Send Message with Approve/Reject Buttons
            await axios.post("https://slack.com/api/chat.postMessage", {
                channel: approverId,
                text: ` *New Approval Request!* \n\n *Request:* ${requestText} \n\n Please review and approve.`,
                attachments: [
                    {
                        text: "What would you like to do?",
                        fallback: "You must respond.",
                        callback_id: "approval_action",
                        actions: [
                            {
                                name: "approve",
                                text: " Approve",
                                type: "button",
                                value: JSON.stringify({ requestText, requesterId: payload.user.id })
                            },
                            {
                                name: "reject",
                                text: "Reject",
                                type: "button",
                                value: JSON.stringify({ requestText, requesterId: payload.user.id })
                            }
                        ]
                    }
                ]
            }, {
                headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, "Content-Type": "application/json" }
            });

            return res.json({ response_action: "clear" }); 
        }

        //Handle Approve/Reject Button
        if (payload.type === "interactive_message") {
            const action = payload.actions[0];
            const value = JSON.parse(action.value);
            const approverId = payload.user.id;
            const requesterId = value.requesterId;
            const requestText = value.requestText;
            const decision = action.name === "approve" ? "Approved" : " Rejected";

            console.log(`Approval decision: ${decision} by ${approverId}`);

            await axios.post("https://slack.com/api/chat.postMessage", {
                channel: requesterId,
                text: ` Your request *"${requestText}"* was *${decision}* by <@${approverId}>`
            }, {
                headers: { Authorization: `Bearer ${SLACK_BOT_TOKEN}`, "Content-Type": "application/json" }
            });

            return res.json({ text: `Decision recorded: ${decision}` });
        }
    }

    res.status(200).send();
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

app.listen(4000, () => console.log(" Server running on port 4000"));
