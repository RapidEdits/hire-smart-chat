const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const axios = require('axios');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const qr = require('qrcode');

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = socketIo(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const client = new Client({
    authStrategy: new LocalAuth()
});

const ADMIN_NUMBER = '916200083509@c.us';
let isConnected = false;

// Handle socket connections
io.on('connection', (socket) => {
    console.log('New client connected');
    
    // Send current connection status
    socket.emit('connectionStatus', { isConnected });
    
    // Handle client request to initialize
    socket.on('initialize', () => {
        if (!isConnected) {
            client.initialize();
        } else {
            socket.emit('connectionStatus', { isConnected: true });
        }
    });
    
    socket.on('disconnect', () => {
        console.log('Client disconnected');
    });
});

// Show QR code for login
client.on('qr', async (qrCode) => {
    console.log("📱 Scan this QR code to login:");
    qrcode.generate(qrCode, { small: true });
    
    try {
        // Convert QR code to data URL
        const qrDataURL = await qr.toDataURL(qrCode);
        io.emit('qrCode', { qrDataURL });
    } catch (err) {
        console.error('Error generating QR code:', err);
    }
});

// WhatsApp bot is ready
client.on('ready', async () => {
    console.log('✅ WhatsApp Bot is ready!');
    isConnected = true;
    io.emit('connectionStatus', { isConnected: true });

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

// Handle authenticated event
client.on('authenticated', () => {
    console.log('✅ WhatsApp authenticated');
    io.emit('authenticated');
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

// Status endpoint
app.get('/status', (req, res) => {
    res.json({ isConnected });
});

server.listen(3000, () => {
    console.log('🌐 Express server running at http://localhost:3000');
});

// Don't auto-initialize, let the frontend trigger it
// client.initialize();
