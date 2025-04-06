const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const axios = require('axios');
const qrcode = require('qrcode-terminal');
const fs = require('fs');

const app = express();
app.use(express.json());

const client = new Client({
    authStrategy: new LocalAuth()
});

const ADMIN_NUMBER = '916200083509@c.us';

// Show QR code for login
client.on('qr', qr => {
    console.log("📱 Scan this QR code to login:");
    qrcode.generate(qr, { small: true });
});

// WhatsApp bot is ready
client.on('ready', async () => {
    console.log('✅ WhatsApp Bot is ready!');

    const numbers = fs.readFileSync('C:/Users/Susic/Documents/whatsapp-bot/whatsapp-node-bridge/numbers.txt', 'utf-8')
        .split('\n')
        .map(n => n.trim())
        .filter(n => n.length > 0);

    const startMessages = [
        "Hi Pratyush here, I got your number from Naukri.com.",
        "I messaged you regarding a job opening in Shubham Housing Finance for the profile of Relationship Manager / Sales Manager in Home Loan, LAP and Mortgage.",
        "Are you interested in Kota Location?"
    ];

    for (const number of numbers) {
        const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
        for (const msg of startMessages) {
            await client.sendMessage(chatId, msg);
            await new Promise(r => setTimeout(r, 1000));
        }
    }
});

// Handle incoming user message
client.on('message', async msg => {
    const userMessage = msg.body;
    const sender = msg.from;

    try {
        const response = await axios.post('http://localhost:5000/ask', {
            sender: sender,
            message: userMessage
        });

        if (response.data && response.data.reply) {
            const reply = response.data.reply;

            // If Python bot signals end of flow (reply is null), notify admin
            if (reply === "__COMPLETE__") {
                const userNumber = sender.split('@')[0];
                await client.sendMessage(ADMIN_NUMBER, `✅ Info collected from user: ${userNumber}`);
                return; // do NOT reply to user
            }

            await msg.reply(reply);
        }
    } catch (err) {
        console.error('❌ Error from Python bot:', err.message);
        const userNumber = sender.split('@')[0];
        await client.sendMessage(ADMIN_NUMBER, `⚠️ Bot error for user: ${userNumber}`);
    }
});

// Listen for /notify to send admin messages from Python
app.post('/notify', async (req, res) => {
    const { message } = req.body;
    try {
        await client.sendMessage(ADMIN_NUMBER, message);
        res.status(200).send({ status: 'sent' });
    } catch (err) {
        console.error('❌ Failed to notify admin:', err.message);
        res.status(500).send({ error: 'Failed to send message' });
    }
});

app.listen(3000, () => {
    console.log('🌐 Express server running at http://localhost:3000');
});

client.initialize();
