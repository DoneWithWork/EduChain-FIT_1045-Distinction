import { App } from './app.js'

const app = new App()


if (process.argv[1].includes('index.js') || process.argv[1].includes('index.ts')) {
    const PORT = process.env.PORT || 3000
    app.start(PORT)
}
