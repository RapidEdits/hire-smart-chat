import { Client, LocalAuth } from 'whatsapp-web.js';
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

// Default settings
const DEFAULT_SETTINGS = {
  adminNumber: '916200083509@c.us',
  initialMessages: [
    "Hi Pratyush here, I got your number from Naukri.com.",
    "I messaged you regarding a job opening in Shubham Housing Finance for the profile of Relationship Manager / Sales Manager in Home Loan, LAP and Mortgage.",
    "Are you interested in Kota Location?"
  ],
  autoStart: false,
  numbersPerBatch: 10,
  messageDelay: 1000,
  qualification: {
    ctcThreshold: 5,
    experienceThreshold: 2,
    incentiveThreshold: 5000
  }
};

// Initialize settings from file or create with defaults
let botSettings = DEFAULT_SETTINGS;
if (fs.existsSync('bot_settings.json')) {
  try {
    botSettings = JSON.parse(fs.readFileSync('bot_settings.json', 'utf-8'));
  } catch (error) {
    console.error('Error reading bot settings:', error);
  }
} else {
  fs.writeFileSync('bot_settings.json', JSON.stringify(botSettings, null, 2));
}

const client = new Client({
    authStrategy: new LocalAuth()
});

const ADMIN_NUMBER = botSettings.adminNumber;
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
    socket.on('startServers', async () => {
        console.log('Request to start servers received');
        
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

    // Load start messages from settings
    let startMessages = botSettings.initialMessages;

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
                await new Promise(r => setTimeout(r, botSettings.messageDelay));
            }
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

// Get conversation logs for a specific number
app.get('/conversation/:phoneNumber', (req, res) => {
    const { phoneNumber } = req.params;
    const chatId = phoneNumber.includes('@c.us') ? phoneNumber : `${phoneNumber}@c.us`;
    const logPath = path.join(CHATLOG_DIR, `${chatId}.txt`);
    
    try {
        if (fs.existsSync(logPath)) {
            const logs = fs.readFileSync(logPath, 'utf-8')
                .split('\n')
                .filter(line => line.trim().length > 0)
                .map(line => {
                    // Parse log line format: timestamp - step: message
                    const timestampEnd = line.indexOf(' - ');
                    if (timestampEnd > 0) {
                        const timestamp = line.substring(0, timestampEnd);
                        const remainder = line.substring(timestampEnd + 3);
                        
                        const stepEnd = remainder.indexOf(': ');
                        if (stepEnd > 0) {
                            const step = remainder.substring(0, stepEnd);
                            const message = remainder.substring(stepEnd + 2);
                            
                            return {
                                timestamp,
                                step,
                                message,
                                role: 'user'
                            };
                        }
                    }
                    return null;
                })
                .filter(entry => entry !== null);
            
            // Get conversation flow to recreate bot messages
            const df = JSON.parse(fs.readFileSync('flow.json', 'utf-8'));
            const flow = df.map(q => ({
                step: q.step,
                ask: q.ask
            }));
            
            // Reconstruct the conversation with bot messages
            const conversation = [];
            for (let i = 0; i < logs.length; i++) {
                const log = logs[i];
                const stepIndex = flow.findIndex(f => f.step === log.step);
                
                if (stepIndex >= 0) {
                    // Add bot message before user response
                    conversation.push({
                        role: 'bot',
                        message: flow[stepIndex].ask,
                        timestamp: new Date(new Date(log.timestamp).getTime() - 30000).toISOString()
                    });
                    
                    // Add user response
                    conversation.push({
                        role: 'user',
                        message: log.message,
                        timestamp: log.timestamp
                    });
                }
            }
            
            res.json({ 
                phoneNumber: phoneNumber,
                flow: conversation.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
            });
        } else {
            res.status(404).json({ error: 'Conversation not found' });
        }
    } catch (error) {
        console.error(`Error reading conversation logs for ${phoneNumber}:`, error);
        res.status(500).json({ error: 'Failed to retrieve conversation' });
    }
});

// Get all conversations
app.get('/conversations', (req, res) => {
    try {
        const CHATLOG_DIR = 'chatlogs';
        if (!fs.existsSync(CHATLOG_DIR)) {
            return res.json([]);
        }
        
        const files = fs.readdirSync(CHATLOG_DIR);
        const conversations = files
            .filter(file => file.endsWith('.txt'))
            .map(file => {
                const phoneNumber = file.replace('.txt', '');
                try {
                    const content = fs.readFileSync(path.join(CHATLOG_DIR, file), 'utf-8');
                    const lines = content.split('\n').filter(line => line.trim().length > 0);
                    const lastLine = lines[lines.length - 1] || '';
                    
                    // Parse last line to get timestamp and message
                    const timestampEnd = lastLine.indexOf(' - ');
                    let lastMessage = '';
                    let timestamp = new Date().toISOString();
                    
                    if (timestampEnd > 0) {
                        timestamp = lastLine.substring(0, timestampEnd);
                        const remainder = lastLine.substring(timestampEnd + 3);
                        
                        const messageStart = remainder.indexOf(': ');
                        if (messageStart > 0) {
                            lastMessage = remainder.substring(messageStart + 2);
                        }
                    }
                    
                    return {
                        id: phoneNumber,
                        phoneNumber: phoneNumber.split('@')[0],
                        lastMessage,
                        timestamp,
                        status: 'active'
                    };
                } catch (error) {
                    console.error(`Error reading file ${file}:`, error);
                    return null;
                }
            })
            .filter(conv => conv !== null)
            .sort((a, b) => new Date(b.timestamp) - new Date(a.timestamp));
        
        res.json(conversations);
    } catch (error) {
        console.error('Error reading conversations:', error);
        res.json([]);
    }
});

// Get and update bot settings
app.get('/settings', (req, res) => {
    res.json(botSettings);
});

app.post('/settings', (req, res) => {
    try {
        const newSettings = req.body;
        botSettings = { ...botSettings, ...newSettings };
        
        // Update ADMIN_NUMBER if it changed
        if (newSettings.adminNumber) {
            ADMIN_NUMBER = newSettings.adminNumber;
        }
        
        // Save settings to file
        fs.writeFileSync('bot_settings.json', JSON.stringify(botSettings, null, 2));
        
        // Update Python server qualification criteria if it's running
        if (serverStatus.pythonServer) {
            axios.post('http://localhost:5000/update-criteria', {
                criteria: botSettings.qualification
            }).catch(err => {
                console.error('Error updating Python qualification criteria:', err.message);
            });
        }
        
        res.json({ success: true, settings: botSettings });
    } catch (error) {
        console.error('Error updating settings:', error);
        res.status(500).json({ error: 'Failed to update settings' });
    }
});

// Get and notify admin
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
