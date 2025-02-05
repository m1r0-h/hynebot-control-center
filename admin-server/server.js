require("dotenv").config(); // Load environment variables from the .env file
const fs = require("fs");
const https = require("https");
const express = require("express");
const path = require("path");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const crypto = require("crypto");

// Check variables from the .env file
const certPath = process.env.SSL_CERT_PATH;
const keyPath = process.env.SSL_KEY_PATH;
const port = process.env.PORT;
const authAddress = process.env.AUTH_ADDRESS;

if (!certPath || !keyPath || !port || !authAddress) {
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
app.use((req, res, next) => {
    res.locals.nonce = Buffer.from(crypto.randomBytes(16)).toString('base64');
    res.setHeader("Content-Security-Policy", `script-src 'self' 'nonce-${res.locals.nonce}'`);
    next();
});

// Serve files from public folder
app.use(express.static("public"));

// Set EJS as a view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views")); // Use views folder

// Route for Index page
app.get("/", (req, res) => {
    res.render("index", { authAddress });
});

// Route for Admin page
app.get("/admin", (req, res) => {
    res.render("admin", { authAddress });
});

// Create an HTTPS server
const httpsServer = https.createServer(credentials, app);

// Start the server
httpsServer.listen(port, () => {
  console.log(`Admin server is running on port ${port}`);
});
