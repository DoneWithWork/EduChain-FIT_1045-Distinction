import { App } from './app.js';

const app = new App();

// Local start (dev/build)
if (!process.env.VERCEL) {
    app.start(8080).catch((err) => {
        console.error(err);
        process.exit(1);
    });
}

// For Vercel serverless
export default async function handler(req: any, res: any) {
    await app.server.ready();
    app.server.routing(req, res);
}
