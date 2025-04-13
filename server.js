import pkg from 'whatsapp-web.js';
const { Client, LocalAuth } = pkg;
import express from 'express';
import axios from 'axios';
import qrcode from 'qrcode-terminal';
import fs from 'fs';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import qr from 'qrcode';
import { spawn } from 'child_process';
import path from 'path';
import { fileURLToPath } from 'url';

// Get current file directory (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
app.use(cors());
app.use(express.json());

const server = http.createServer(app);
const io = new Server(server, {
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
let pythonStartAttempts = 0;
const MAX_PYTHON_START_ATTEMPTS = 3;

// Function to check if Python server is running
const checkPythonServer = async () => {
    try {
        const response = await axios.get('http://localhost:5000/ping', { timeout: 5000 });
        return response.status === 200;
    } catch (error) {
        console.error('Python server check failed:', error.message);
        return false;
    }
};

// Find the Python executable
const getPythonExecutable = () => {
    // Common Python executable names
    const pythonExecutables = ['python', 'python3', 'py'];
    
    // Try each executable
    for (const executable of pythonExecutables) {
        try {
            const result = spawn(executable, ['-c', 'print("Python found")']);
            if (result.pid) {
                return executable;
            }
        } catch (err) {
            console.log(`Executable ${executable} not found or not working`);
        }
    }
    
    // If no executable is found, default to 'python'
    return 'python';
};

// Function to start Python server
const startPythonServer = async () => {
    if (pythonProcess) {
        // Python process already exists, check if it's still running
        if (pythonProcess.exitCode === null) {
            console.log('Python server is already running');
            return true;
        }
        // Process exists but has exited, clean it up
        pythonProcess = null;
    }
    
    // Check if Python server is already running
    const isRunning = await checkPythonServer();
    if (isRunning) {
        console.log('Python server is already running on port 5000');
        serverStatus.pythonServer = true;
        return true;
    }
    
    if (pythonStartAttempts >= MAX_PYTHON_START_ATTEMPTS) {
        console.log('Maximum Python start attempts reached, giving up');
        return false;
    }
    
    pythonStartAttempts++;
    console.log(`Starting Python server (attempt ${pythonStartAttempts})...`);
    
    try {
        // Find the Python executable
        const pythonExecutable = getPythonExecutable();
        
        // Get the absolute path to app.py
        const appPath = path.resolve(process.cwd(), 'app.py');
        console.log(`Starting Python with ${pythonExecutable} ${appPath}`);
        
        // Start the Python process
        pythonProcess = spawn(pythonExecutable, [appPath], {
            stdio: 'pipe', // Capture stdout and stderr
            shell: true // Use shell to resolve path issues
        });
        
        // Log stdout
        pythonProcess.stdout.on('data', (data) => {
            console.log(`Python server: ${data}`);
        });
        
        // Log stderr
        pythonProcess.stderr.on('data', (data) => {
            console.error(`Python server error: ${data}`);
        });
        
        // Handle process exit
        pythonProcess.on('close', (code) => {
            console.log(`Python server process exited with code ${code}`);
            serverStatus.pythonServer = false;
            io.emit('serverStatus', serverStatus);
            pythonProcess = null;
        });
        
        // Wait for the server to start
        console.log('Waiting for Python server to start...');
        let attempts = 0;
        let isServerRunning = false;
        
        while (attempts < 10 && !isServerRunning) {
            await new Promise(resolve => setTimeout(resolve, 1000)); // Wait 1 second
            attempts++;
            try {
                isServerRunning = await checkPythonServer();
                if (isServerRunning) {
                    console.log(`Python server started after ${attempts} seconds`);
                    break;
                }
            } catch (err) {
                console.log(`Still waiting for Python server (${attempts}/10)...`);
            }
        }
        
        serverStatus.pythonServer = isServerRunning;
        io.emit('serverStatus', serverStatus);
        
        return isServerRunning;
    } catch (error) {
        console.error('Error starting Python server:', error);
        serverStatus.pythonServer = false;
        io.emit('serverStatus', serverStatus);
        return false;
    }
};

// Initial check for Python server
(async () => {
    serverStatus.pythonServer = await checkPythonServer();
    console.log(`Initial Python server status: ${serverStatus.pythonServer ? 'running' : 'not running'}`);
})();

// Create candidates.json if it doesn't exist
if (!fs.existsSync('candidates.json')) {
  fs.writeFileSync('candidates.json', JSON.stringify([], null, 2));
}

// Get candidates list
app.get('/candidates', (req, res) => {
  try {
    if (fs.existsSync('candidates.json')) {
      const candidates = JSON.parse(fs.readFileSync('candidates.json', 'utf-8'));
      res.json(candidates);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error reading candidates:', error);
    res.json([]);
  }
});

// Get conversations endpoint
app.get('/conversations', (req, res) => {
  try {
    if (fs.existsSync('state.json')) {
      const state = JSON.parse(fs.readFileSync('state.json', 'utf-8'));
      const conversations = Object.keys(state).map(id => {
        const user = state[id];
        return {
          id,
          phoneNumber: id.split('@')[0],
          lastMessage: user.answers ? Object.values(user.answers).pop() || "Started conversation" : "Started conversation",
          timestamp: new Date().toISOString(),
          status: "active"
        };
      });
      res.json(conversations);
    } else {
      res.json([]);
    }
  } catch (error) {
    console.error('Error reading conversations:', error);
    res.json([]);
  }
});

// Handle socket connections
io.on('connection', (socket) => {
    console.log('New client connected');
    
    // Reset Python start attempts on new connection
    pythonStartAttempts = 0;
    
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
    socket.on('startServers', async (options = {}) => {
        console.log('Request to start servers received', options);
        
        // Start Python server if not running
        if (!serverStatus.pythonServer) {
            const pythonStarted = await startPythonServer();
            console.log(`Python server start result: ${pythonStarted ? 'success' : 'failure'}`);
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
    const { to, message } = req.body;
    try {
        const recipient = to || ADMIN_NUMBER;
        await client.sendMessage(recipient, message);
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
