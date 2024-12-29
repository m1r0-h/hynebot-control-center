const token = localStorage.getItem("authToken");
const sentConsole = document.getElementById("sentConsoleList");
const receivedConsole = document.getElementById("receivedConsoleList");
const latencyServer = document.getElementById("latencyServer");
const latencyBot = document.getElementById("latencyBot");
const sensor1 = document.getElementById("sensor1");
const sensor2 = document.getElementById("sensor2");
const sensor3 = document.getElementById("sensor3");
const errorMessage = document.getElementById("errorMessage");
const botErrorMessage = document.getElementById("botErrorMessage");
const disconnectMessage = document.getElementById("disconnectMessage");

// Check socket io libary
if (typeof io === "undefined") { // No socket io libary
  console.error("Error with Socket.IO client library.");
  errorMessage.textContent = "Unable to load the Socket.IO client library. Try again later.";
}else { // socket io libary OK
  if (token) { // Check token
    // Connect to the websocket server
    const socket = io(WEBSOCKET_URL, {
    extraHeaders: {
      Authorization: `Bearer ${token}`
    }
    });

    // Pressed keys - A list of controls to send to the bot
    const keysPressed = {};

    // Button inputs - Find all buttons from the page
    const keyButtons = {
      w: document.getElementById("forward"),
      a: document.getElementById("left"),
      s: document.getElementById("back"),
      d: document.getElementById("right"),
      q: document.getElementById("rotateLeft"),
      e: document.getElementById("rotateRight"),
      arrowup: document.getElementById("up"),
      arrowdown: document.getElementById("down"),
    };
    // --- Listen to control inputs ---
    // List keyboard keystrokes to "keysPressed" list
    document.addEventListener("keydown", (e) => { // Add key
      e.preventDefault();
      keysPressed[e.key.toLowerCase()] = true;  // Mark the key as pressed
    });
    // Remove keyboard keystrokes from "keysPressed" list
    document.addEventListener("keyup", (e) => { // Remove key
      delete keysPressed[e.key.toLowerCase()]; // Remove old input
    });
    
    // Add event listeners for all buttons inputs
    addButtonListeners(keyButtons, keysPressed);
    
    // Send control inputs - Send keysPressed list
    sendMessageInterval = setInterval(() => {
      sendControlMessage(keysPressed, socket);
    }, 100);

    // --- Check latency ---
    setInterval(() => calculateServerLatency(socket), 100);
    setInterval(() => calculateBotLatency(socket), 100);

    // Listen "latencyTestResult"
    socket.on("latencyTestResult", (data) => {
      latencyBot.textContent = new Date(new Date().toISOString()) - new Date(data.startTime);
    });

    // ---Receive messages---
    // Show received control message
    socket.on("controlMessage", (data) => {
      if (!data.controlMessage) {
        return;
      }
      // Add messages to console
      Object.keys(data.controlMessage).forEach(key => {
        const item = document.createElement("li");
        item.textContent = `${key} - ${new Date(data.time).toLocaleTimeString()}`;
        sentConsole.appendChild(item);
        while (sentConsole.children.length > 100) { // Remove old messges
        sentConsole.removeChild(sentConsole.firstChild);
        }
      });
    });

    // Show received sensor data
    socket.on("sensorData", (data) => {
      // Add messages to console
      const item = document.createElement("li");
      item.textContent = `Sensor data - ${new Date(data.time).toLocaleTimeString()}`;
      receivedConsoleList.appendChild(item);
      // Put main sersor data to the sensor box
      const sensors = [sensor1, sensor2, sensor3];
      sensors.forEach((sensor, index) => {
          const key = `Sensor${index + 1}`;
          sensor.textContent = data.sensorData[key];
      });
      // Remove old messages from the received console - Max 100 messages
      while (receivedConsole.children.length > 100) {
        receivedConsole.removeChild(receivedConsole.firstChild);
      }
    });

    // Connect
    socket.on("connect", () => {
      errorMessage.textContent = ""; // Remove error text
      disconnectMessage.textContent = ""; // Remove error text
    });

    // Show errors
    socket.on("errorMessage", (data) => {
      errorMessage.textContent = `Error - ${data.errorMessage}`;
      if (data.errorMessage = "No connection to bot") {
        latencyBot.textContent = "-";
      }
    });

    // Show bot errors
    socket.on("botErrorMessage", (data) => {
      botErrorMessage.textContent = `Error from bot - ${data.errorMessage}`;
    });

    // Clear errors
    socket.on("clear", () => {
      errorMessage.textContent = ""; // Remove error text
      disconnectMessage.textContent = ""; // Remove error text
    });

    // Clear bot errors
    socket.on("clearBot", () => {
      botErrorMessage.textContent = "";
    });
  
    // Disconnect
    socket.on("disconnect", () => {
      disconnectMessage.textContent = "Disconnected";
    });

    // Show connection error
    socket.on("connect_error", (err) => {
      errorMessage.innerHTML = `${err}<br>Try to login again`;
    });
  
  } else { // No token
    errorMessage.textContent = "Authentication error - No token";
  }
}


// Send control input function
function sendControlMessage(message, socket) {
  const data = {
    controlMessage: message,
    time: new Date(new Date().toISOString()).getTime()
  }
  socket.emit("controlMessage", data);
}

// Set buttons to add that key to the keysPressed list.
function addButtonListeners(keyButtons, keysPressed) {
  for (let key in keyButtons) {
    const button = keyButtons[key]; // Get element from the list
    // Register desktop devise clicks
    button.addEventListener("mousedown", () => {
      keysPressed[key] = true;  // Mark the key as pressed
      return;
    });
    button.addEventListener("mouseup", () => {
      delete keysPressed[key];  // Remove old input
    });
    // Register mobile device clicks
    button.addEventListener("touchstart", () => {
      keysPressed[key] = true;  // Mark the key as pressed
      return;
    });
    button.addEventListener("touchend", () => {
      delete keysPressed[key];  // Remove old input
    });
  }
}

// For checking server latiency
function calculateServerLatency(socket) {
  const startTimeServer = new Date().toISOString();
  
  socket.emit("pingServer", () => {
    const latency = new Date(new Date().toISOString()) - new Date(startTimeServer);
    latencyServer.textContent = latency;
  });
}

// For checking bot latiency
function calculateBotLatency(socket) {
  const startTimeBot = new Date().toISOString();
  socket.emit("pingBot", ({"startTime": startTimeBot}));
}


function logout() {
  // Remove the JWT from localStorage
  localStorage.removeItem("authToken");
  
  // Redirect to the index page
  window.location.href = "/";
}

// Delete authToken when logout button is pressed
document.getElementById("logout").addEventListener("click", function(e) {
  e.preventDefault();
  logout();
});