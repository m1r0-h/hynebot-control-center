# Admin server

This Node.js server serves dynamic frontend pages for admins. It uses EJS as a templating engine.

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
PORT=8080
AUTH_ADDRESS=https://xxx.xxx.xxx.xxx:8081
```

## File structure

```bash
admin-server/
│
├── public/             # Folder for static assets
│   ├── css             # Folder for css files
│   │   └── styles.css
│   ├── img             # Folder for image files
│   └── js              # Folder for js files
│       ├── admin.js    # Admin page js file
│       └── index.js    # Index page js file
│
├── views/              # Folder for EJS templates
│   ├── admin.ejs       # Admin page
│   └── index.ejs       # Index page
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
