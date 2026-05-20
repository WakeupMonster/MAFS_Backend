/**
 * ═══════════════════════════════════════════════════════════════
 * MAFS Chat Module — Production Load Test (k6)
 * ═══════════════════════════════════════════════════════════════
 *
 * PURPOSE:
 *   Test REST APIs and WebSocket performance for Chat module.
 *   Simulates:
 *   1. Fetching chat list.
 *   2. Fetching chat history for a match.
 *   3. Connecting to Socket.io via WebSockets.
 *   4. Joining chat room, typing, and sending messages.
 *
 * RUN:
 *   k6 run k6/scripts/chat_load_test.js
 *   k6 run -e API_URL=http://<ec2-ip>:3001/api/v1 -e WS_URL=ws://<ec2-ip>:3001 k6/scripts/chat_load_test.js
 */

import http from 'k6/http';
import ws from 'k6/ws';
import { check, sleep } from 'k6';
import { SharedArray } from 'k6/data';
import { Counter, Rate, Trend } from 'k6/metrics';

// ═══════════════════════════════════════
// CUSTOM METRICS
// ═══════════════════════════════════════
const serverErrors = new Rate('server_error_rate');
const chatListLatency = new Trend('chat_list_response_ms');
const chatHistoryLatency = new Trend('chat_history_response_ms');
const uploadMediaLatency = new Trend('upload_media_response_ms');
const deleteMessageLatency = new Trend('delete_message_response_ms');
const wsConnections = new Counter('ws_connections');
const wsMessagesSent = new Counter('ws_msgs_sent');
const wsMessagesReceived = new Counter('ws_msgs_received');

// ═══════════════════════════════════════
// LOAD TEST DATA
// ═══════════════════════════════════════
const tokens = new SharedArray('tokens', function () {
    return JSON.parse(open('../data/load_test_tokens.json'));
});

const BASE_URL = __ENV.API_URL || 'http://localhost:3001/api/v1';

// Automatically derive WS_URL from API_URL if not explicitly provided
let defaultWsUrl = 'ws://localhost:3001';
if (__ENV.API_URL) {
    // Convert https://api.../api/v1 -> wss://api...
    // Convert http://api.../api/v1 -> ws://api...
    try {
        // k6 doesn't have full URL API in standard lib, so we use string manipulation
        let urlPart = __ENV.API_URL.split('/api/v1')[0]; 
        if (urlPart.startsWith('https://')) {
            defaultWsUrl = urlPart.replace('https://', 'wss://');
        } else if (urlPart.startsWith('http://')) {
            defaultWsUrl = urlPart.replace('http://', 'ws://');
        }
    } catch (e) {
        // fallback
    }
}
const WS_URL = __ENV.WS_URL || defaultWsUrl;

// ═══════════════════════════════════════
// STAGES (Ramp up to 1000 users)
// ═══════════════════════════════════════
export const options = {
    stages: [
        { duration: '30s', target: 50 },
        { duration: '1m', target: 50 },
        { duration: '30s', target: 200 },
        { duration: '1m', target: 200 },
        { duration: '1m', target: 500 },
        { duration: '2m', target: 500 },
        { duration: '1m', target: 1000 },
        { duration: '2m', target: 1000 },
        { duration: '1m', target: 0 },
    ],
    thresholds: {
        'chat_list_response_ms': ['p(95)<1500'],
        'chat_history_response_ms': ['p(95)<1000'],
        'upload_media_response_ms': ['p(95)<2000'],
        'delete_message_response_ms': ['p(95)<1000'],
        'server_error_rate': ['rate<0.05'],
    },
};

// ═══════════════════════════════════════
// HELPERS
// ═══════════════════════════════════════
function getMyToken() {
    const index = (__VU - 1) % tokens.length;
    return tokens[index];
}

function getHeaders() {
    return {
        headers: {
            'Authorization': `Bearer ${getMyToken()}`,
            'Content-Type': 'application/json',
            'x-bypass-cloudinary': 'true',
            'x-bypass-rate-limit': 'true',
        },
        timeout: '15s',
    };
}

// ═══════════════════════════════════════
// MAIN USER FLOW
// ═══════════════════════════════════════
export default function () {
    const token = getMyToken();
    const params = getHeaders();

    // 1. Fetch Chat List
    const chatListRes = http.get(`${BASE_URL}/chat/list`, params);
    chatListLatency.add(chatListRes.timings.duration);
    check(chatListRes, { 'Chat List status 200': (r) => r.status === 200 });

    if (chatListRes.status !== 200) {
        serverErrors.add(1);
        return; // exit early if error
    }

    let chatList = [];
    try {
        const body = JSON.parse(chatListRes.body);
        if (body.success && body.data) {
            chatList = body.data;
        }
    } catch (e) {
        // ignore
    }

    if (chatList.length === 0) {
        // If user has no chats, just wait and exit
        sleep(Math.random() * 2 + 1);
        return;
    }

    // Pick a random chat room to interact with
    const randomChat = chatList[Math.floor(Math.random() * chatList.length)];
    const matchId = randomChat.matchId;

    // 2. Fetch Chat History
    const historyRes = http.get(`${BASE_URL}/chat/messages/${matchId}?page=1&limit=20`, params);
    chatHistoryLatency.add(historyRes.timings.duration);
    check(historyRes, { 'Chat History status 200': (r) => r.status === 200 });
    if (historyRes.status !== 200) serverErrors.add(1);

    // 3. Upload Media (mocked Cloudinary bypass)
    const dummyFile = http.file('dummy file content', 'test.jpg', 'image/jpeg');
    const uploadData = {
        matchId: matchId,
        media: dummyFile,
    };
    const uploadParams = {
        headers: {
            'Authorization': `Bearer ${getMyToken()}`,
            'x-bypass-cloudinary': 'true',
        },
        timeout: '15s',
    };
    const uploadRes = http.post(`${BASE_URL}/chat/upload-media`, uploadData, uploadParams);
    uploadMediaLatency.add(uploadRes.timings.duration);
    check(uploadRes, { 'Upload Media status 201': (r) => r.status === 201 });
    if (uploadRes.status !== 201) serverErrors.add(1);

    let createdMessageId = null;
    try {
        const body = JSON.parse(uploadRes.body);
        if (body.success && body.data) {
            createdMessageId = body.data.id;
        }
    } catch (e) {
        // ignore
    }

    // 4. Delete Message (with Media)
    if (createdMessageId) {
        const deleteRes = http.del(`${BASE_URL}/chat/messages/${createdMessageId}?deleteForEveryone=true`, null, uploadParams);
        deleteMessageLatency.add(deleteRes.timings.duration);
        check(deleteRes, { 'Delete Message status 200': (r) => r.status === 200 });
        if (deleteRes.status !== 200) serverErrors.add(1);
    }

    // 5. Connect to WebSocket
    // Construct Socket.io engine.io URL v4
    const url = `${WS_URL}/socket.io/?EIO=4&transport=websocket&token=${token}`;

    const res = ws.connect(url, {}, function (socket) {
        wsConnections.add(1);
        
        let pingInterval;

        socket.on('open', () => {
            // Send socket.io connection payload
            socket.send('40'); // 4 = engine.io message, 0 = socket.io connect
        });

        socket.on('message', (msg) => {
            if (typeof msg === 'string') {
                // Engine.io Handshake Response (0{...})
                if (msg.startsWith('0')) {
                    const handshakeData = JSON.parse(msg.substring(1));
                    const pingIntervalMs = handshakeData.pingInterval || 25000;
                    
                    // Setup ping/pong
                    pingInterval = socket.setInterval(() => {
                        socket.send('2'); // engine.io ping
                    }, pingIntervalMs);
                }
                
                // Socket.io connection accepted (40{...})
                if (msg.startsWith('40')) {
                    // Connected successfully! Now join chat room
                    const joinPayload = `42["join_chat",{"matchId":"${matchId}"}]`;
                    socket.send(joinPayload);
                    
                    // After joining, emit typing indicator periodically
                    socket.setTimeout(() => {
                        socket.send(`42["typing",{"matchId":"${matchId}","isTyping":true}]`);
                    }, 2000);
                    
                    socket.setTimeout(() => {
                        socket.send(`42["typing",{"matchId":"${matchId}","isTyping":false}]`);
                    }, 4000);

                    // Send an actual message using Socket emit (or REST fallback could be done)
                    // send_message requires Ack from server in Socket-server, but we can emit without ack
                    socket.setTimeout(() => {
                        const sendPayload = `42["send_message",{"matchId":"${matchId}","text":"Load test message from k6 ${__VU}","type":"text"}]`;
                        socket.send(sendPayload);
                        wsMessagesSent.add(1);
                    }, 6000);
                    
                    // Close socket after 10-15s of interaction
                    socket.setTimeout(() => {
                        socket.close();
                    }, Math.random() * 5000 + 10000);
                }

                // Parse incoming events (42["event", {...}])
                if (msg.startsWith('42')) {
                    wsMessagesReceived.add(1);
                    
                    // Examples of events we could handle:
                    // new_message, messages_read, user_typing
                }
                
                // Server pong response (3)
                if (msg === '3') {
                    // Pong received
                }
            }
        });

        socket.on('close', () => {
            if (pingInterval) socket.clearInterval(pingInterval);
        });
        
        socket.on('error', (e) => {
            if (e.error() != 'websocket: close sent') {
                serverErrors.add(1);
            }
        });
    });

    check(res, { 'WebSocket connected': (r) => r && r.status === 101 });
    sleep(1);
}
