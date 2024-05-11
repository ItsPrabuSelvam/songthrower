const express = require('express');
const WebSocket = require('ws');
const ffmpeg = require('fluent-ffmpeg');
const fs = require('fs');
const { PassThrough } = require('stream');
const http = require('http');

// Increase the maximum number of listeners for EventEmitters
require('events').EventEmitter.defaultMaxListeners = 50;

const app = express();
const port = 3000;

let isPlaying = true;  // State to track if the audio is playing
let currentTime = 0;   // Current playback time in seconds
const clients = new Set();  // Set to track connected clients
let audioStream = new PassThrough();
const audioFilePath = 'd:/Theemai-Dhan-Vellum.mp3';  // Replace with your local file path

// Function to handle streaming audio
function startStreaming() {
    audioStream = new PassThrough();
    ffmpeg(fs.createReadStream(audioFilePath))
        .setStartTime(currentTime)
        .audioBitrate(128)
        .format('mp3')
        .on('error', (err) => {
            console.error('Error in ffmpeg processing:', err);
        })
        .pipe(audioStream);
}

// Function to broadcast the current state to all clients
function broadcastState(action, time) {
    clients.forEach(client => {
        if (client.readyState === WebSocket.OPEN) {
            client.send(JSON.stringify({ action, time }));
        }
    });
}

// WebSocket server
const wss = new WebSocket.Server({ noServer: true });

wss.on('connection', (ws) => {
    clients.add(ws);

    ws.on('message', (message) => {
        const data = JSON.parse(message);

        if (data.action === 'pause') {
            isPlaying = false;
        } else if (data.action === 'play') {
            isPlaying = true;
        } else if (data.action === 'seek') {
            currentTime = data.time;
            isPlaying = true;
            startStreaming();
        }

        broadcastState(data.action, data.time);
    });

    ws.on('close', () => {
        clients.delete(ws);
    });
});

// HTTP server for Express
const server = app.listen(port, () => {
    console.log(`Server is listening on port ${port}`);
});

// Handle WebSocket connections
server.on('upgrade', (request, socket, head) => {
    wss.handleUpgrade(request, socket, head, (ws) => {
        wss.emit('connection', ws, request);
    });
});

// Serve the audio stream to connected clients
app.get('/audio', (req, res) => {
    res.setHeader('Content-Type', 'audio/mpeg');
    
    const interval = setInterval(() => {
        if (!isPlaying) {
            audioStream.unpipe(res);
        } else {
            audioStream.pipe(res);
        }
    }, 100);

    res.on('close', () => {
        clearInterval(interval);
        audioStream.unpipe(res);  // Ensure the stream is unpiped on close

        // Remove all listeners to prevent memory leak
        audioStream.removeAllListeners('data');
        audioStream.removeAllListeners('end');
        audioStream.removeAllListeners('error');
    });
});
