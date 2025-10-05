import fastifyFormbody from '@fastify/formbody'
import fastifyStatic from '@fastify/static'
import fastifyView from '@fastify/view'
import { Eta } from 'eta'
import fastify from 'fastify'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import fastifyMultipart from "@fastify/multipart"
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import { loginRoute, signupRoute } from './routes/auth.js'
import { sessionAuth } from './libs/sessions.js'
import { newCourse } from './routes/user.js'
import { db } from './database.js'

const server = fastify()
const eta = new Eta()

const __filename = fileURLToPath(import.meta.url)
const __dirname = dirname(__filename)

// Plugins
server.register(fastifyFormbody)
server.register(cookie, {
    secret: "my-secret",
    hook: 'onRequest',
    parseOptions: {}
})
server.register(sessionAuth, {
    exclude: ['/auth/*', '/static/*', '/']
});
server.register(fastifyMultipart)

await server.register(cors, {
    origin: ['http://[::1]:8080'],
    methods: ['GET', 'POST']
})
server.register(fastifyStatic, {
    root: join(__dirname, 'public'),
    prefix: '/static/',
})
server.register(fastifyView, {
    engine: { eta },
    root: join(__dirname, 'views'),
    viewExt: 'eta'
})

// Routes
server.get('/', async (req, res) => {
    return res.view('index', { title: 'EduChain' }, { layout: 'base' })
})
server.get('/auth/signin', async (req, res) => {
    return res.view('signin', { title: 'Login' }, { layout: 'base' })
})
server.get('/auth/signup', async (req, res) => {
    return res.view('signup', { title: 'Register' }, { layout: 'base' })
})

server.register(function (app, _, done) {
    app.get("/issuer", async (req, res) => {
        const { id } = req.user!;
        const courses = await db.execute({
            sql: "SELECT * FROM courses WHERE issuer_id = ?",
            args: [id]
        });
        return res.view('issuer_dashboard', { title: 'Dashboard', courses: courses.rows || [] }, { layout: 'dashboard_base' })
    })
    app.get("/issuer/courses/new", async (req, res) => {
        return res.view('issuer_new_courses', { title: 'Dashboard' }, { layout: 'dashboard_base' })
    })
    app.get("/student", async (req, res) => {
        return res.view('student_dashboard', { title: 'Dashboard' }, { layout: 'dashboard_base' })
    })
    app.route(newCourse)
    done()
}, { prefix: '/dashboard' })


server.register(function (app, _, done) {
    app.route(loginRoute)
    app.route(signupRoute)
    done()
}, { prefix: '/auth' })
server.listen({ port: 8080 }, (err, address) => {
    if (err) {
        console.error(err)
        process.exit(1)
    }
    console.log(`🚀 Server listening at ${address}`)
})
