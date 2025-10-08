import { App } from './app.js'

const app = new App()

// If Vercel calls this file as a function export
export default async function handler(req: any, reply: any) {
    await app.handler(req, reply)
}

// If run directly with `node index.js`, start server normally
if (process.argv[1].includes('index.js') || process.argv[1].includes('index.ts')) {
    const PORT = process.env.PORT || 8080
    app.start(PORT)
}
