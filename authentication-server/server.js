require("dotenv").config(); // Load environment variables from the .env file
const fs = require("fs");
const https = require("https");
const express = require("express");
const jwt = require("jsonwebtoken");
const crypto = require("crypto");
const cors = require("cors");
const { MongoClient } = require("mongodb");
const helmet = require("helmet");
const rateLimit = require("express-rate-limit");
const { body, validationResult } = require("express-validator");

// Check .env file
const clientTokenSecret = process.env.CLIENT_TOKEN_SECRET;
const botTokenSecret = process.env.BOT_TOKEN_SECRET;
const adminTokenSecret = process.env.ADMIN_TOKEN_SECRET;
const certPath = process.env.SSL_CERT_PATH;
const keyPath = process.env.SSL_KEY_PATH;
const port = process.env.PORT;
const databaseUrl = process.env.DATABASEURL;
const databaseName = process.env.DATABASENAME;
const loginCodeMinimum = process.env.LOGINCODEMINIMUM;
const allowedOrigins = process.env.ALLOWED_ORIGINS === "*"
    ? "*" // if true - allow all origins
    : process.env.ALLOWED_ORIGINS.split(","); // if false - collect all allowed origins

if (
  !clientTokenSecret ||
  !botTokenSecret ||
  !adminTokenSecret ||
  !certPath ||
  !keyPath ||
  !port ||
  !databaseUrl ||
  !databaseName ||
  !loginCodeMinimum ||
  !allowedOrigins
) {
  throw new Error(
    "Unable to find necessary things from the .env file - Check README"
  );
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
app.use(express.json());
app.use(helmet());
app.use(limiter)

// Cors
app.use(
  cors({
    origin: allowedOrigins,
  })
);

// Database initialization
const dbClient = new MongoClient(databaseUrl);
dbClient
  .connect()
  .then(() => {
    db = dbClient.db(databaseName);
    console.log("Connecting to the database was successful");
  })
  .catch((err) => {
    console.error("Database connection error:", err);
  });

// --- ROUTES ---
const validationRules1 = [ // Validation rules for "/login" route
  body("code")
  .trim()
  .notEmpty().withMessage("Code is required.")
  .isString().withMessage("Code must be a string.")
];

// Client login
app.post("/login", validationRules1, async (req, res) => {
  const validationErrors = validationResult(req);
  // Check errors
  if (!validationErrors.isEmpty()) {
    return res.status(400).json({
      message: validationErrors.array()[0].msg // Send only the error messages in json - frontend can use it
    });
  }
  // Get token
  const logincode = req.body.code;

  try {
    const hashedCode = crypto
      .createHash("sha512")
      .update(logincode)
      .digest("hex");
    // Check that the code is in the database and that it is valid
    const loginCodeCollection = db.collection("LoginCode");
    const existingCode = await loginCodeCollection.findOne({
      code: hashedCode,
    });
    if (!existingCode) { // No matching code in database
      return res.status(400).json({ message: "Invalid code." });
    }
    // Check the validity period of the code 
    if (new Date(existingCode.startsAt) > new Date(new Date().toISOString())) {
      return res
        .status(400)
        .json({ message: "The code is not yet available - Try again later." });
    } else if (new Date(existingCode.expiresAt) < new Date(new Date().toISOString())) {
      return res.status(400).json({ message: "Expired code." });
    }
    // Make payload
    const payload = {
      id: existingCode.id, // Bot id
      expiresAt: existingCode.expiresAt, // Token expiration time
      startsAt: existingCode.startsAt, // Token start time
    };

    // If login is successful - Send token
    const token = jwt.sign(payload, clientTokenSecret, { expiresIn: "10m" }); // Make token
    res.json({ accessToken: token }); // Send token
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

const validationRules2 = [ // Validation rules for "/login/admin" route
  body("username")
  .trim()
  .notEmpty().withMessage("Username is required.")
  .isString().withMessage("Username must be a string."),

  body("password")
  .trim()
  .notEmpty().withMessage("Password is required.")
  .isString().withMessage("Password must be a string."),
];

// Admin login
app.post("/login/admin", validationRules2, async (req, res) => {
  const validationErrors = validationResult(req);
  // Check errors
  if (!validationErrors.isEmpty()) {
    return res.status(400).json({
      message: validationErrors.array()[0].msg // Send only the error messages in json - Frontend can use it
    });
  }
  const { username, password } = req.body;

  try {
    const hashedPassword = crypto.createHash("sha512").update(password).digest("hex");
    // Check that the user is in the database
    const adminCollection = db.collection("Admin");
    const existingUser = await adminCollection.findOne({
      username: username,
      password: hashedPassword
    });

    if (!existingUser) { // No matching user in database
      return res.status(400).json({ message: "Invalid username or password." });
    }
    // If login is successful - Send token
    const token = jwt.sign({}, adminTokenSecret, {expiresIn: "2m"}); // Make token
    res.json({ accessToken: token }); // Send token
  } catch (err) {
    console.error(err);
    res.sendStatus(500);
  }
});

const validationRules3 = [ // Validation rules for "/code" route
  body("code")
  .trim()
  .notEmpty().withMessage("Code is required.")
  .isString().withMessage("Code must be a string.")
  .isLength({ min: loginCodeMinimum }).withMessage(`Code is too short - at least ${loginCodeMinimum}.`),

  body("id")
  .trim()
  .notEmpty().withMessage("ID is required.")
  .isString().withMessage("ID must be a string."),

  body("startsAt")
  .trim()
  .notEmpty().withMessage("Start date is required.")
  .isISO8601().withMessage('Start date must be a valid date in ISO 8601 format.'),

  body("expiresAt")
  .trim()
  .notEmpty().withMessage("Expire date is required.")
  .isISO8601().withMessage('Expire date must be a valid date in ISO 8601 format.'),
];

// Make new client code
app.post("/code", authenticateToken, validationRules3, async (req, res) => {
  const validationErrors = validationResult(req);
  // Check errors
  if (!validationErrors.isEmpty()) {
    console.log(validationErrors)
    return res.status(400).json({
      message: validationErrors.array()[0].msg // Send only the error messages in json - Frontend can use it
    });
  }

  const {
    code: newcode,
    id: codeId,
    startsAt: startsAt,
    expiresAt: expiresAt,
  } = req.body;

  const startDate = new Date(startsAt);
  const expDate = new Date(expiresAt);

  if (
    isNaN(startDate.getTime()) ||
    isNaN(expDate.getTime())
  ) {
    return res.status(400).json({ message: "Invalid time format" });
  }
  if (startDate > expDate) {
    return res.status(400).json({ message: "Start time cannot be after expiration date." });
  }

  try {
    // Encrypt the code
    const hashedCode = crypto
      .createHash("sha512")
      .update(newcode)
      .digest("hex");
    // Database collection
    const loginCodeCollection = db.collection("LoginCode");
    // Check if the code already exists
    const existingCode = await loginCodeCollection.findOne({
      code: hashedCode,
    });
    if (existingCode) {
      return res.status(400).json({ message: "Code already exists." });
    }
    // Save the new code to the database
    await loginCodeCollection.insertOne({
      code: hashedCode,
      id: codeId,
      startsAt: startDate,
      expiresAt: expDate,
    });
    res.status(201).json({ message: "Code created successfully." });
  } catch (err) {
    console.error("Error generating code:", err);
    res.status(500).json({ message: "Error generating code." });
  }
});

const validationRules4 = [ // Validation rules for "/bot/token" route
  body("id")
  .trim()
  .notEmpty().withMessage("ID is required.")
  .isString().withMessage("ID must be a string.")
];

// Make new bot token
app.post("/bot/token", authenticateToken, validationRules4, async (req, res) => {
  const validationErrors = validationResult(req);
  // Check errors
  if (!validationErrors.isEmpty()) {
    return res.status(400).json({
      message: validationErrors.array()[0].msg // Send only the error messages in json - Frontend can use it
    });
  }
  // Make and send token
  try {
    const token = jwt.sign({id: req.body.id}, botTokenSecret, {});
    res.status(201).json({ botToken: token });
  } catch (err) {
    console.error("Error while creating bot token:", err);
    res.sendStatus(500);
  }
});

// --- FUNCTIONS ---
function authenticateToken(req, res, next) { // Used to authenticate admin
  try { // Check authorization
    // Find auth header
    const authHeader = req.headers["authorization"];
    if (!authHeader) {
      return res.status(401).json({ message: "Authorization header is missing." });
    };
    // Extract token
    const token = authHeader.split(" ")[1];
    if (!token) {
      return res.status(401).json({ message: "Token is missing from the authorization header." });
    };
    // Check token
    jwt.verify(token, adminTokenSecret);
    next();
  } catch (error) {
    // Check error
    if (error.name === "TokenExpiredError") {
      return res.status(403).json({ message: "Token has expired - Login again." });
    };
    if (error.name === "JsonWebTokenError") {
      return res.status(403).json({ message: "Invalid token." });
    };
    // Handle other errors
    console.error("Token verification failed:", error);
    return res.sendStatus(500);
  }
}

// Create an HTTPS server
const httpsServer = https.createServer(credentials, app);

// Start the server
httpsServer.listen(port, () => {
  console.log(`Authentiaction server is running on port ${port}`);
});
