require('dotenv').config();
const express = require("express");
const axios = require("axios");
const twilio = require("twilio");

const { TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN, PUBLIC_WEBHOOK_URL } = process.env;
if (!TWILIO_ACCOUNT_SID || !TWILIO_AUTH_TOKEN || !PUBLIC_WEBHOOK_URL) {
    // Without these we can't check Twilio's signature, and anyone could make the bot send messages
    console.error("Set TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN and PUBLIC_WEBHOOK_URL (e.g. https://xxxx.ngrok.app/webhook) in .env");
    process.exit(1);
}

const ML_API_URL = process.env.ML_API_URL || "http://localhost:8000/scan/offer/";
const FROM_NUMBER = process.env.TWILIO_WHATSAPP_NUMBER || "whatsapp:+14155238886"; // Default Twilio Sandbox number

const app = express();
app.use(express.urlencoded({ extended: false }));

const twilioClient = twilio(TWILIO_ACCOUNT_SID, TWILIO_AUTH_TOKEN);

// twilio.webhook rejects requests without a valid X-Twilio-Signature for this exact URL
app.post("/webhook", twilio.webhook({ url: PUBLIC_WEBHOOK_URL }), (req, res) => {
    console.log("=== Received Webhook from Twilio ===");
    console.log("Body:", req.body);

    const message = req.body.Body || "";
    const sender = req.body.From;

    if (!message) {
        console.log("Empty message, asking for text.");
        return sendReply(res, "Please send a text message");
    }

    // 1. Send "Please wait..." immediately
    sendReply(res, "Please wait...");

    // 2. Process message in background
    processMessageInBackground(message, sender).catch(err => {
        console.error("Error in background processing:", err);
    });
});

async function processMessageInBackground(message, sender) {
    try {
        const reply = await analyzeMessage(message);

        // Push the processed message via Twilio API
        await twilioClient.messages.create({ body: reply, from: FROM_NUMBER, to: sender });
        console.log("Successfully sent the processed reply:", reply);

    } catch (error) {
        console.error("Error sending reply:", error.message);

        // Notify the user about the error
        await twilioClient.messages.create({
            body: "Sorry, there was an error processing your request.",
            from: FROM_NUMBER,
            to: sender
        }).catch(e => console.error("Could not send error message to user:", e));
    }
}

async function analyzeMessage(message) {
    // Basic heuristic to check if it looks like a general greeting or an offer/email to scan
    const normalized = message.toLowerCase().trim();
    if (normalized === "hello" || normalized === "hi") {
        return "Hi! Send me an internship offer or email text, and I'll tell you if it's safe or a scam.";
    }

    let data;
    try {
        // Long timeout: a sleeping Render instance can take ~30s to wake up
        const response = await axios.post(ML_API_URL, { message }, { timeout: 45000 });
        data = response.data;
    } catch (error) {
        console.error("Error communicating with ML API:", error.message);
        return "I'm having trouble analyzing this right now. Please try again later.";
    }

    const { is_offer, prediction, confidence, red_flags } = data;

    if (!is_offer) {
        return "🤖 This message doesn't look like an internship or job offer.\n\nI'm designed to analyze internship and job offer messages for scams. Try sending me a job/internship offer message!";
    }
    if (prediction === "Fake") {
        let reply = `⚠️ *SCAM ALERT*\n\nThis offer looks suspiciously like a scam. I am ${confidence}% confident it's fake.\n\n`;
        if (red_flags && red_flags.length > 0) {
            reply += `*Red Flags Found:*\n- ${red_flags.join("\n- ")}\n\n`;
        }
        return reply + "Please do not click on any links or pay any fees. Be safe!";
    }
    return `✅ *SAFE*\n\nThis looks like a legitimate offer. I am ${confidence}% confident it's safe. However, always verify the sender's official email and company website before accepting.`;
}

function sendReply(res, text) {
    res.set("Content-Type", "text/xml");
    res.send(`
        <Response>
            <Message>${text}</Message>
        </Response>
    `);
}

app.listen(5000, () => {
    console.log("Webhook server running on port 5000");
});
