
const { Client, LocalAuth } = require('whatsapp-web.js');
const express = require('express');
const axios = require('axios');
const qrcode = require('qrcode-terminal');
const fs = require('fs');
const http = require('http');
const socketIo = require('socket.io');
const cors = require('cors');
const qr = require('qrcode');
const { spawn } = require('child_process');

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

// Server status tracking
let serverStatus = {
    nodeServer: true,  // Since we're running this file, Node.js server is active
    pythonServer: false
};

let pythonProcess = null;

// Function to check if Python server is running
const checkPythonServer = async () => {
    try {
        const response = await axios.get('http://localhost:5000/ping', { timeout: 2000 });
        return response.status === 200;
    } catch (error) {
        return false;
    }
};

// Function to start Python server
const startPythonServer = () => {
    if (pythonProcess) {
        // Python process already exists, check if it's still running
        if (pythonProcess.exitCode === null) {
            console.log('Python server is already running');
            return;
        }
    }
    
    console.log('Starting Python server...');
    // Adjust the path to your Python executable and app.py file as needed
    pythonProcess = spawn('python', ['app.py']);
    
    pythonProcess.stdout.on('data', (data) => {
        console.log(`Python server: ${data}`);
    });
    
    pythonProcess.stderr.on('data', (data) => {
        console.error(`Python server error: ${data}`);
    });
    
    pythonProcess.on('close', (code) => {
        console.log(`Python server process exited with code ${code}`);
        serverStatus.pythonServer = false;
        io.emit('serverStatus', serverStatus);
    });
    
    // Give the server a moment to start
    setTimeout(async () => {
        serverStatus.pythonServer = await checkPythonServer();
        io.emit('serverStatus', serverStatus);
    }, 3000);
};

// Initial check for Python server
(async () => {
    serverStatus.pythonServer = await checkPythonServer();
})();

// Handle socket connections
io.on('connection', (socket) => {
    console.log('New client connected');
    
    // Send current server and connection status
    socket.emit('serverStatus', serverStatus);
    socket.emit('connectionStatus', { isConnected });
    
    // Handle client request to initialize
    socket.on('initialize', () => {
        if (!isConnected) {
            client.initialize();
        } else {
            socket.emit('connectionStatus', { isConnected: true });
        }
    });
    
    // Handle client request to start servers
    socket.on('startServers', async () => {
        console.log('Request to start servers received');
        
        // Start Python server if not running
        if (!serverStatus.pythonServer) {
            startPythonServer();
        }
        
        // Send current server status
        socket.emit('serverStatus', serverStatus);
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

    // Load start messages if file exists
    let startMessages = [];
    try {
        if (fs.existsSync('start_messages.txt')) {
            startMessages = fs.readFileSync('start_messages.txt', 'utf-8')
                .split('\n')
                .map(line => line.trim())
                .filter(line => line.length > 0);
        } else {
            startMessages = [
                "Hi Pratyush here, I got your number from Naukri.com.",
                "I messaged you regarding a job opening in Shubham Housing Finance for the profile of Relationship Manager / Sales Manager in Home Loan, LAP and Mortgage.",
                "Are you interested in Kota Location?"
            ];
        }

        // Check if numbers.txt exists
        if (fs.existsSync('numbers.txt')) {
            const numbers = fs.readFileSync('numbers.txt', 'utf-8')
                .split('\n')
                .map(n => n.trim())
                .filter(n => n.length > 0);

            for (const number of numbers) {
                const chatId = number.includes('@c.us') ? number : `${number}@c.us`;
                for (const msg of startMessages) {
                    await client.sendMessage(chatId, msg);
                    await new Promise(r => setTimeout(r, 1000));
                }
            }
        }
    } catch (err) {
        console.error('Error sending initial messages:', err);
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

// Get active chat count
app.get('/active-chats', (req, res) => {
    try {
        if (fs.existsSync('state.json')) {
            const state = JSON.parse(fs.readFileSync('state.json', 'utf-8'));
            const activeChatsCount = Object.keys(state).length;
            res.json({ count: activeChatsCount });
        } else {
            res.json({ count: 0 });
        }
    } catch (error) {
        console.error('Error reading active chats:', error);
        res.json({ count: 0 });
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

// Add endpoint to check if Python server is alive
app.get('/ping', (req, res) => {
    res.status(200).send('pong');
});

// Status endpoint
app.get('/status', (req, res) => {
    res.json({ isConnected });
});

// Server status endpoint
app.get('/server-status', async (req, res) => {
    // Re-check Python server status
    serverStatus.pythonServer = await checkPythonServer();
    res.json(serverStatus);
});

server.listen(3000, () => {
    console.log('🌐 Express server running at http://localhost:3000');
});

// Don't auto-initialize, let the frontend trigger it
// client.initialize();
