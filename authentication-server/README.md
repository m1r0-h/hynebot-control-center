# Authentication server

This Node.js server handles authentication with json web tokens.

## Setup

Make an .env file and add necessary variables to it ([Example .env file](#example-env-file)):

```bash
nano .env
```

Install production dependencies:

```bash
npm install --production
```

or install all dependencies (for development):

```bash
npm install
```

## Run server

Start server:

```bash
npm start
```

Start server with nodemon (for development):

```bash
npm run dev
```

## Example .env file

```
SSL_CERT_PATH=../certificate.cert
SSL_KEY_PATH=../key.key
CLIENT_TOKEN_SECRET=secret_client
BOT_TOKEN_SECRET=secret_bot
ADMIN_TOKEN_SECRET=secret_admin
PORT=123
DATABASEURL=mongodb://localhost:27017
DATABASENAME=Hynebot
LOGINCODEMINIMUM=3
ALLOWED_ORIGINS=*
```

## File structure

```bash
client-server/
│
├── .env                # Environment variables
│
├── package-lock.json
│
├── package.json
│
├── server.js           # Main server file
│
└── README.md           # Documentation file (this file)
```
