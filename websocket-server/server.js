require("dotenv").config(); // Load environment variables from the .env file
const express = require("express");
const https = require("https");
const fs = require("fs");
const socketIo = require("socket.io");
const jwt = require("jsonwebtoken");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");


// Check .env file
const clientTokenSecret = process.env.CLIENT_TOKEN_SECRET;
const botTokenSecret = process.env.BOT_TOKEN_SECRET;
const certPath = process.env.SSL_CERT_PATH;
const keyPath = process.env.SSL_KEY_PATH;
const port = process.env.PORT;
const verification_token = process.env.VERIFICATION_TOKEN;
const allowedOrigins = process.env.ALLOWED_ORIGINS === "*"
    ? "*" // if true - allow all origins
    : process.env.ALLOWED_ORIGINS.split(","); // if false - collect all allowed origins

if (!clientTokenSecret || !botTokenSecret || !certPath || !keyPath || !port || !allowedOrigins || !verification_token) {
    throw new Error("Unable to find necessary things from the .env file - Check README");
}

// Read key and certificate
let privateKey, certificate;
try {
    privateKey = fs.readFileSync(keyPath, "utf8");
    certificate = fs.readFileSync(certPath, "utf8");
} catch (error) {
    console.error(`Unable to access certificate or privatekey: ${error.message}`);
    process.exit(1);
}

const credentials = { key: privateKey, cert: certificate };

const limiter = rateLimit({
	windowMs: 15 * 60 * 1000, // 15 minutes
	limit: 100, // Limit each IP to 100 requests per "windowMs"
});

// Create a express application
const app = express();
app.use(helmet());
app.use(limiter)

// Create an HTTPS server
const httpsServer = https.createServer(credentials, app);

// Socket.io
const io = socketIo(httpsServer, {
    cors: {
        origin: allowedOrigins,
        methods: ["GET", "POST"]
    }
});

// Check token middleware
io.use((socket, next) => {
    console.log(`${new Date().toLocaleString()} ${socket.id} new client - Address ${socket.handshake.address}`);
    try {
        const authHeader =  socket.handshake.headers['authorization'];
        if (!authHeader) {
            next(new Error("Authentication error - No token provided"));
        }
        const token = authHeader.split(' ')[1];
        if (token) {
            // Try token with client secret
            jwt.verify(token, clientTokenSecret, (err, payload) => {
                if (!err) { // Client token verified
                    console.log(`${new Date().toLocaleString()} ${socket.id} client token verified `);
                    socket.user = payload; // Add id and expiresAt
                    socket.user.type = "type1";
                    return next(); // Proceed
                } else { // If verification with clientTokenSecret fails - Try with botTokenSecret
                    jwt.verify(token, botTokenSecret, (err, payload) => {
                        if (!err) { // Bot token verified
                            console.log(`${new Date().toLocaleString()} ${socket.id} bot token verified`);
                            socket.user = payload; // Add id and expiresAt
                            socket.user.type = "type2";
                            return next(); // Proceed
                        } else {
                            // Both verifications failed - Invalid token
                            return next(new Error("Authentication error - Invalid token"));
                        }
                    });
                }
            });
        } else { // No token
            next(new Error("Authentication error - No token provided"));
        }
    } catch (error) {
        next(new Error("Authentication error"));
    }
});

const MAX_TIMEOUT = 2147483647; // Maximum setTimeout value (32-bit signed integer)

// Function for scheduling user disconnect
function scheduleDisconnection(socket){
    const disconnectTime = new Date(socket.user.expiresAt).getTime();
    const currentTime = new Date(new Date().toISOString()).getTime(); // UTC+0

    if (isNaN(disconnectTime)) { // Cannot get time
        return socket.disconnect(true); // Disconnect user
    }

    let remainingTime = disconnectTime - currentTime; // How much time the user has left

    if (remainingTime > 0) {
        // Print
        const timeTotalSeconds = remainingTime / 1000
        const hours = Math.floor(timeTotalSeconds / 3600);
        const minutes = Math.floor((timeTotalSeconds % 3600) / 60);
        const seconds = Math.floor(timeTotalSeconds % 60);
        console.log(`${new Date().toLocaleString()} ${socket.id} will be disconnected in ${hours}h ${minutes}m ${seconds}s`);

        // Schedule disconnection
        function scheduleTimeout(remainingTime) {
            if (remainingTime > MAX_TIMEOUT) { // If remainingTime is too big (max 32-bit signed integer)
                // Schedule max setTimeout and try again
                setTimeout(() => {
                    scheduleTimeout(remainingTime - MAX_TIMEOUT);
                }, MAX_TIMEOUT);
            } else {
                // Schedule the final disconnection
                setTimeout(() => {
                    socket.emit("errorMessage", "The code expired - Ask for a new code");
                    setTimeout(() => {
                        socket.disconnect(true); // Force disconnection
                    }, 1000); // Delay to ensure the error message is sent
                    console.log(`${new Date().toLocaleString()} ${socket.id} disconnected - The code expired`);
                }, remainingTime - 1000);
            }
        };

        // Start disconnection scheduling
        scheduleTimeout(remainingTime);
    } else { // Disconnect user
        socket.emit("errorMessage", "The code expired - Ask for a new code");
        setTimeout(() => {
            socket.disconnect(true); // Force disconnection
        }, 1000); // Delay to ensure the error message is sent
        console.log(`${new Date().toLocaleString()} ${socket.id} disconnected - No time left`);
    }
};

// New user connect
io.on("connection", (socket) => {
    console.log(`${new Date().toLocaleString()} ${socket.id} connected - Type: ${socket.user.type}`);

    // Room name
    const room = socket.user.id;
    
    // Checked that there is not already a user of the same type in the room
    const usersInRoom = io.sockets.adapter.rooms.get(room);
    if (usersInRoom) {
        // Find all users in the room and their types
        const users = Array.from(usersInRoom).map(socketId => {
            const userSocket = io.sockets.sockets.get(socketId);
            return { id: socketId, type: userSocket.user?.type };
        });

        // Check that there is not same type of users
        if (!(users.filter(user => user.type === socket.user.type).length)) {
            socket.join(room); // Join room - No same type of users
        } else { // The user of that type is already in the room - Disconnect new user
            if (socket.user.type == "type1") { // Send correct error message
                socket.emit("errorMessage", {"errorMessage": "Someone is already controlling the bot"});
                console.log(`${new Date().toLocaleString()} ${socket.id} disconnected - Someone is already controlling the bot in the ${room}`);
            } else {
                socket.emit("errorMessage", {"errorMessage": "The control channel is already in use "});
                console.log(`${new Date().toLocaleString()} ${socket.id} disconnected - The control channel ${room} is already in use`);
            }
            setTimeout(() => {
                socket.disconnect(true);
            }, 1000); // Delay to ensure the message is sent
            return;
        }
    } else { // No users in the room - Join room
        socket.join(room);
    }

    console.log(`${new Date().toLocaleString()} ${socket.id} joined room ${room}`);

    // Schedule type 1 user disconnection
    if (socket.user.type === "type1") {
        scheduleDisconnection(socket);
    }

    // Give type 2 user check token - Bot can check is this the correct server
    if (socket.user.type === "type2") {
        io.to(socket.id).emit("auth", {"token": verification_token});
    };

    // Respond to ping message - Server latiency calculation
    socket.on("pingServer", (callback) => {
        callback(); // Send response back to client
    });
    
    // Pass the bot latiency measurement message
    socket.on("pingBot", (data) => {
        const usersInRoom = Array.from(io.sockets.adapter.rooms.get(room));
        const botId = usersInRoom.filter(id => id !== socket.id);
        if (!(botId.length)) {
            socket.emit("errorMessage", {"errorMessage": "No connection to bot"});
        }else {
            socket.emit("clear"); // Clear "errorMessage"
            io.to(botId).emit("latencyTestRequest", {startTime: data.startTime} );
        }
    });

    // Broadcast the error message
    socket.on("errorMessage", (data) => {
        io.to(room).emit("errorMessage", data);
    });

    // Broadcast the error message - Bot can send error messages to the client
    socket.on("botErrorMessage", (data) => {
        io.to(room).emit("botErrorMessage", data);
    });
    
    // Clear bot error message
    socket.on("clearBot", (data) => {
        io.to(room).emit("clearBot", data);
    });

    // Listen for "latencyTestResult" and broadcast it - Bot latiency calculation
    socket.on("latencyTestResult", (data) => {
        io.to(room).emit("latencyTestResult", data);
    });

    // Listen for control message and broadcast it
    socket.on("controlMessage", (data) => {
        io.to(room).emit("controlMessage", data);
    });

    // Listen for sensor data and broadcast it
    socket.on("sensorData", (data) => {
        io.to(room).emit("sensorData", data);
    });

    // Handle disconnections
    socket.on("disconnect", () => {
        console.log(`${new Date().toLocaleString()} ${socket.id} disconnected`);
    });
});

// Start the server
httpsServer.listen(port, () => {
  console.log(`Socket.io server is running on port ${port}`);
});