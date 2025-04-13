
@echo off
echo Starting WhatsApp Bot Servers...

REM Start Node.js server in a new window
start cmd /k "echo Starting Node.js server... && node server.js"

REM Wait a moment to ensure Node.js server starts first
timeout /t 2 /nobreak

REM Start Python Flask server in a new window
start cmd /k "echo Starting Python Flask server... && python app.py"

echo Servers starting in separate windows. Please do not close them.
