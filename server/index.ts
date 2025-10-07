import { App } from './app.js'

const app = new App()

// Local mode (when run via `node index.js`)
if (process.env.VERCEL === undefined) {
    app.start(8080).catch(err => {
        console.error(err)
        process.exit(1)
    })
}

// Serverless mode (Vercel)
export default async function handler(req: any, res: any) {
    await app.server.ready()
    app.server.server.emit('request', req, res)
}
