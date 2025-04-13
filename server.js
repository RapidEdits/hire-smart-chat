const express = require('express');
const http = require('http');
const { Server } = require("socket.io");
const qrcode = require('qrcode');
const fs = require('fs');
const { exec } = require('child_process');
const cors = require('cors');
const axios = require('axios');

const app = express();
app.use(cors());
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*",
    methods: ["GET", "POST"]
  }
});

const port = 3000;

let client;
let qrCodeData;
let isConnected = false;

// Function to generate QR code
const generateQrCode = async (qr) => {
  try {
    qrCodeData = await qrcode.toDataURL(qr);
    io.emit('qrCode', { qrDataURL: qrCodeData });
  } catch (err) {
    console.error('Could not generate QR code', err);
    io.emit('error', { message: 'Could not generate QR code' });
  }
};

// Function to check server status
async function checkServerStatus() {
  let nodeServer = true;
  let pythonServer = false;

  try {
    // Check if Python server is running
    const pythonResponse = await axios.get('http://localhost:5000/ping');
    pythonServer = pythonResponse.status === 200;
  } catch (error) {
    pythonServer = false;
  }

  return { nodeServer: true, pythonServer: pythonServer };
}

// WhatsApp connection logic
async function initWhatsapp() {
  const { Client, LocalAuth } = require('whatsapp-web.js');

  client = new Client({
    authStrategy: new LocalAuth(),
    puppeteer: {
      headless: true,
      args: ['--no-sandbox']
    }
  });

  client.on('qr', qr => {
    generateQrCode(qr);
  });

  client.on('ready', () => {
    console.log('Client is ready!');
    isConnected = true;
    io.emit('connectionStatus', { isConnected: true });
    io.emit('authenticated');
  });

  client.on('disconnected', (reason) => {
    console.log('Client was disconnected:', reason);
    isConnected = false;
    io.emit('connectionStatus', { isConnected: false });
  });

  client.on('message', msg => {
    console.log('MESSAGE RECEIVED', msg.body);
  });

  client.initialize();
}

// Listen for startServers command
io.on('connection', (socket) => {
  console.log('A user connected');

  socket.on('initialize', () => {
    console.log('Received initialize command');
    initWhatsapp();
  });

  socket.on('disconnect', () => {
    console.log('User disconnected');
  });

  socket.on('startServers', async (options = {}) => {
    console.log('Received startServers command', options);
    try {
      if (options.useBatchFile) {
        // Use the batch file to start both servers
        console.log('Starting servers using batch file');
        const { exec } = await import('child_process');
        
        exec('start-servers.bat', (error, stdout, stderr) => {
          if (error) {
            console.error(`Error starting servers: ${error.message}`);
            socket.emit('error', { message: `Failed to start servers: ${error.message}` });
            return;
          }
          
          if (stderr) {
            console.error(`stderr: ${stderr}`);
          }
          
          console.log(`stdout: ${stdout}`);
          
          // We'll still check server status separately as the batch file
          // starts the servers in separate windows
          checkServerStatus().then(status => {
            socket.emit('serverStatus', status);
          });
        });
      } else {
        // Start Python server
        console.log('Starting Python Flask server');
        exec('python app.py', (error, stdout, stderr) => {
          if (error) {
            console.error(`Error starting Python server: ${error.message}`);
            socket.emit('error', { message: `Failed to start Python server: ${error.message}` });
            return;
          }
          if (stderr) {
            console.error(`Python server stderr: ${stderr}`);
          }
          console.log(`Python server stdout: ${stdout}`);
        });
      }
    } catch (error) {
      console.error('Error starting servers:', error);
      socket.emit('error', { message: 'Failed to start servers' });
    }
  });
});

// Server routes
app.get('/status', (req, res) => {
  res.json({ isConnected: isConnected });
});

app.get('/server-status', async (req, res) => {
  const status = await checkServerStatus();
  res.json(status);
});

app.post('/notify', (req, res) => {
  const { to, message } = req.body;
  if (!to || !message) {
    return res.status(400).json({ error: 'Missing parameters' });
  }

  if (!client) {
    return res.status(500).json({ error: 'WhatsApp client not initialized' });
  }

  client.sendMessage(to, message).then(response => {
    console.log('Message sent:', response);
    res.json({ success: true, message: 'Message sent successfully' });
  }).catch(err => {
    console.error('Error sending message:', err);
    res.status(500).json({ error: 'Failed to send message' });
  });
});

server.listen(port, () => {
  console.log(`Server listening on port ${port}`);
});
