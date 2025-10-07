

import { App } from "./app.js"

const app = new App()
app.start(8080).catch((err) => {
    // Logging mirrors original behaviour: surface critical errors and exit.
    // Any uncaught startup error should fail fast to avoid partial runs.
    console.error(err)
    process.exit(1)
})

