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
import { createClient } from '@supabase/supabase-js';

// Get current file directory (equivalent to __dirname in CommonJS)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Initialize Supabase client
const SUPABASE_URL = "https://prhvwjzfpayezelqlmri.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InByaHZ3anpmcGF5ZXplbHFsbXJpIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDQ2MTI0MTEsImV4cCI6MjA2MDE4ODQxMX0.XpRRcUAqFrT2lEMc-4NgQFm79Eox0Wl4pOxjqdYSph8";

// Initialize Supabase client
const supabase = createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY);

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

// Set Mistral API key in environment for Python to access
process.env.MISTRAL_API_KEY = process.env.MISTRAL_API_KEY || "nKsx3Q2PS5NqHi90D2qumbVOBxjc7BrL";
process.env.USE_MISTRAL = process.env.USE_MISTRAL || "false";

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
    
    try {
        console.log('Starting Python server...');
        const pythonExecutable = getPythonExecutable();
        const appPath = path.resolve(process.cwd(), 'app.py');
        
        // Set environment variables for Python process
        const env = {
            ...process.env,
            MISTRAL_API_KEY: process.env.MISTRAL_API_KEY,
            USE_MISTRAL: process.env.USE_MISTRAL
        };
        
        pythonProcess = spawn(pythonExecutable, [appPath], {
            stdio: 'pipe',
            shell: true,
            env: env
        });
        
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
            pythonProcess = null;
        });
        
        // Wait for server to start
        let attempts = 0;
        while (attempts < 10) {
            await new Promise(resolve => setTimeout(resolve, 1000));
            try {
                const running = await checkPythonServer();
                if (running) {
                    serverStatus.pythonServer = true;
                    io.emit('serverStatus', serverStatus);
                    return true;
                }
            } catch (err) {
                console.log(`Waiting for Python server (attempt ${attempts + 1}/10)...`);
            }
            attempts++;
        }
        
        throw new Error('Python server failed to start');
    } catch (error) {
        console.error('Failed to start Python server:', error);
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

// Toggle Mistral AI usage
app.post('/toggle-mistral', (req, res) => {
  const { enabled } = req.body;
  process.env.USE_MISTRAL = enabled ? "true" : "false";
  
  // Restart Python server with new settings
  if (pythonProcess && pythonProcess.exitCode === null) {
    pythonProcess.kill();
    pythonProcess = null;
  }
  
  startPythonServer().then(started => {
    if (started) {
      res.json({ success: true, mistralEnabled: enabled });
    } else {
      res.status(500).json({ success: false, error: "Failed to restart Python server" });
    }
  });
});

// Get Mistral AI status
app.get('/mistral-status', (req, res) => {
  res.json({ 
    enabled: process.env.USE_MISTRAL === "true",
    apiKeyConfigured: !!process.env.MISTRAL_API_KEY
  });
});

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
    socket.emit('mistralStatus', { 
      enabled: process.env.USE_MISTRAL === "true",
      apiKeyConfigured: !!process.env.MISTRAL_API_KEY
    });
    
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
        
        try {
            // Start Python server if not running
            if (!serverStatus.pythonServer) {
                const pythonStarted = await startPythonServer();
                if (!pythonStarted) {
                    throw new Error('Failed to start Python server');
                }
            }
            
            socket.emit('serverStatus', serverStatus);
        } catch (error) {
            console.error('Error starting servers:', error);
            socket.emit('error', { message: 'Failed to start servers. Please check if Python is installed and try again.' });
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

// Add endpoint to handle Supabase candidate storage
app.post('/supabase-store', async (req, res) => {
  try {
    console.log('Storing candidate in Supabase:', req.body);
    
    const { data, error } = await supabase
      .from('candidates')
      .upsert(req.body, {
        onConflict: 'phone'
      });
      
    if (error) {
      console.error('Error storing candidate in Supabase:', error);
      return res.status(500).json({ error: error.message });
    }
    
    return res.json({ success: true, data });
  } catch (err) {
    console.error('Error in /supabase-store:', err);
    return res.status(500).json({ error: err.message });
  }
});

// Update the existing /store-candidate endpoint
app.post('/store-candidate', async (req, res) => {
  const { phone, answers } = req.body;
  
  try {
    // Forward the request to Python server
    const pythonResponse = await axios.post('http://localhost:5000/store-candidate', {
      phone: phone.split('@')[0],
      answers: answers
    });

    // If Python server handled it successfully, also try direct Supabase storage
    if (pythonResponse.data.success) {
      try {
        // Prepare data for Supabase
        const candidateData = {
          phone: phone.split('@')[0],
          name: answers.company || 'Unknown',
          experience: answers.experience || null,
          ctc: answers.ctc || null,
          notice_period: answers.notice || null,
          qualification: answers.qualified ? 'qualified' : 'not_qualified',
          status: 'new'
        };
        
        // Direct Supabase storage without going through Python
        const { error } = await supabase
          .from('candidates')
          .upsert(candidateData, {
            onConflict: 'phone'
          });
          
        if (error) {
          console.log('Supabase direct storage error:', error);
        }
      } catch (supabaseError) {
        console.error('Error in direct Supabase storage:', supabaseError);
      }
    }

    return res.json(pythonResponse.data);
  } catch (err) {
    console.error('Error in /store-candidate:', err);
    // If Python server is down, try to store directly in Supabase
    try {
      // Prepare data for Supabase
      const candidateData = {
        phone: phone.split('@')[0],
        name: answers.company || 'Unknown',
        experience: answers.experience || null,
        ctc: answers.ctc || null,
        notice_period: answers.notice || null,
        qualification: answers.qualified ? 'qualified' : 'not_qualified',
        status: 'new'
      };
      
      // Direct Supabase storage
      const { data, error } = await supabase
        .from('candidates')
        .upsert(candidateData, {
          onConflict: 'phone'
        });
        
      if (error) {
        return res.status(500).json({ error: error.message });
      }
      
      return res.json({ success: true, data });
    } catch (supabaseError) {
      return res.status(500).json({ error: err.message });
    }
  }
});

// Don't auto-initialize, let the frontend trigger it
// client.initialize();
server.listen(3000, () => {
    console.log('🌐 Express server running at http://localhost:3000');
});
