# 🧩 EduChain — Blockchain-Based Certificate Management System

![](./website.png)

EduChain is a web-based platform that integrates blockchain technology (via the Sui Network) to issue, verify, and manage academic certificates securely. The backend is built using Fastify (Node.js) with TypeScript, SQLite, and Eta for server-side rendering.
This project was developed as part of the FIT1045 coursework to demonstrate decentralised data integrity in education systems.

## 🚀 Features

User Authentication (Issuer & Student roles)

Issuer Dashboard — Create courses and issue certificates

Student Dashboard — View and verify certificates

Blockchain Integration — Mints certificates on the Sui blockchain

Decentralised Storage Ready (Pinata/IPFS integration planned)

Server-Side Rendering using Eta templates

Session-Based Auth Middleware

## 🧠 Tech Stack

Backend: Fastify + TypeScript

Database: SQLite (with async queries via execute())

Blockchain: Sui Network SDK

Templating: Eta

Storage: Local (to be extended to IPFS via Pinata)

## 🛠️ Installation & Setup

You’ll need Node.js v20+ and PNPM to run this project.

1. Clone the Repository
git clone https://github.com/DoneWithWork/EduChain-FIT_1045-Distinction.git

2. Install Dependencies

Navigate into the server directory:

cd EduChain-FIT_1045-Distinction/server

```bash
pnpm install
```


3. Build the Project

Compile the TypeScript source into JavaScript:

```bash
pnpm build
```


This creates a dist folder containing the compiled files and dependencies.

4. Run the Server

Start the Fastify web server:

```bash
pnpm start
```


By default, it will run on:

http://localhost:3000



⚙️ Environment Variables

Before running the project, create a .env file in the server folder.
You’ll need to include the following environment variables:

```
TURSO_AUTH_TOKEN=<>

TURSO_DATABASE_URL=<>

NODE_ENV="development"

SUI_PRIVATE_KEY=<>

SUI_SMART_CONTRACT=<>

SUI_FACTORY_OBJ=<>
```