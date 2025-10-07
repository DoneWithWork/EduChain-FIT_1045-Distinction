/**
 * Application entrypoint class.
 * 
 * This class encapsulates all setup and bootstrapping logic for a Fastify web server,
 * including plugin registration, middleware, and modular route grouping.
 * 
 * Structure Overview:
 * - Registers essential Fastify plugins (body parsing, CORS, cookies, static assets, etc.)
 * - Configures Eta templating engine for rendering views
 * - Defines modular route registration methods for:
 *   - Root/public routes
 *   - Authentication routes
 *   - User dashboard routes (issuer and student dashboards)
 * - Provides an async `start()` method to boot the server.
 */

import fastifyFormbody from '@fastify/formbody'
import fastifyStatic from '@fastify/static'
import fastifyView from '@fastify/view'
import fastifyMultipart from '@fastify/multipart'
import cookie from '@fastify/cookie'
import cors from '@fastify/cors'
import fastify, { FastifyInstance } from 'fastify'
import { Eta } from 'eta'
import { dirname, join } from 'path'
import { fileURLToPath } from 'url'
import { db } from './database.js'
import { loginRoute, signupRoute } from './routes/auth.js'
import { mintCert, newCourse } from './routes/user.js'
import { sessionAuth } from './libs/sessions.js'

export class App {
    /** Fastify instance that handles all HTTP requests. */
    public server: FastifyInstance

    /** Eta templating engine instance used by fastify-view for server-side rendering. */
    private eta: Eta

    /** Absolute filename of this module. */
    private __filename: string

    /** Directory path of this module. */
    private __dirname: string

    /**
     * A list of async route registration callbacks.
     * Each function receives the Fastify instance and registers a related set of routes.
     */
    private routeRegistrations: Array<(app: FastifyInstance) => Promise<void> | void>

    constructor() {
        // Resolve file and directory paths for ESM context
        const __filename = fileURLToPath(import.meta.url)
        const __dirname = dirname(__filename)

        // Create the Fastify application instance
        this.server = fastify()

        // Initialize the Eta template engine
        this.eta = new Eta()

        // Assign resolved paths to class properties
        this.__filename = __filename
        this.__dirname = __dirname

        /**
         * -------------------------------
         * 🔧 Plugin Registrations
         * -------------------------------
         * The order of registration is preserved from the original file.
         * Fastify plugins extend or modify request/response lifecycle hooks.
         */

        this.server.register(fastifyFormbody) // Parse URL-encoded form data

        this.server.register(cookie, {
            secret: 'my-secret',      // Cookie signing secret
            hook: 'onRequest'         // Attach cookies early in lifecycle
        })

        this.server.register(fastifyMultipart) // Support file uploads

        // CORS configuration allows specific frontend origins and methods
        this.server.register(cors, {
            origin: ['http://[::1]:8080'],
            methods: ['GET', 'POST']
        })

        // Register custom session authentication middleware
        this.server.register(sessionAuth, {
            exclude: ['/auth/*', '/static/*', '/'] // Routes excluded from session checks
        })

        // Serve static files (images, CSS, JS) from the /public directory
        this.server.register(fastifyStatic, {
            root: join(this.__dirname, 'public'),
            prefix: '/static/'
        })

        // Register Eta view engine for template rendering
        this.server.register(fastifyView, {
            engine: { eta: this.eta },
            root: join(this.__dirname, 'views'),
            viewExt: 'eta'
        })

        /**
         * Modular route registration functions.
         * Each item corresponds to a route group, allowing separation of logic.
         */
        this.routeRegistrations = [
            this.registerRootRoutes.bind(this),
            this.registerAuthRoutes.bind(this),
            this.registerDashboardRoutes.bind(this)
        ]
    }

    /**
     * Start the Fastify web server.
     * 
     * @param port - Port number or string to listen on.
     * 
     * The method registers all routes, then starts listening on the given port.
     * Returns a Promise that resolves once the server has successfully started.
     */
    public async start(port: number | string) {
        // Register each route group sequentially
        for (const register of this.routeRegistrations) {
            await register(this.server)
        }

        // Mint certificate route is added after all others (preserves original order)
        this.server.route(mintCert)

        // Normalize port input
        const portNumber = typeof port === 'string' ? parseInt(port, 10) : port

        // Begin listening
        await this.server.listen({ port: portNumber })
        console.log(`🚀 Server listening at http://localhost:${portNumber}`)
    }

    /**
     * Register all root-level public routes (non-authenticated pages).
     * 
     * @param app - Fastify instance
     */
    private async registerRootRoutes(app: FastifyInstance) {
        // Home page
        app.get('/', async (req, res) => {
            return res.view('index', { title: 'EduChain' }, { layout: 'base' })
        })

        // Certificate viewer page
        app.get('/cert-viewer', async (req, res) => {
            return res.view('cert_viewer', { title: 'Cert Viewer' }, { layout: 'base' })
        })

        // Login page
        app.get('/auth/signin', async (req, res) => {
            return res.view('signin', { title: 'Login' }, { layout: 'base' })
        })

        // Registration page
        app.get('/auth/signup', async (req, res) => {
            return res.view('signup', { title: 'Register' }, { layout: 'base' })
        })
    }

    /**
     * Register authentication routes under `/auth`.
     * 
     * Routes:
     * - POST /auth/login
     * - POST /auth/signup
     * 
     * @param app - Fastify instance
     */
    private async registerAuthRoutes(app: FastifyInstance) {
        app.register(async (appInner) => {
            appInner.route(loginRoute)
            appInner.route(signupRoute)
        }, { prefix: '/auth' })
    }

    /**
     * Register user dashboard routes under `/dashboard`.
     * 
     * Contains routes for:
     * - Issuer dashboard (creating and managing courses)
     * - Student dashboard (viewing owned certificates)
     * 
     * @param app - Fastify instance
     */
    private async registerDashboardRoutes(app: FastifyInstance) {
        app.register(async (appInner) => {

            /**
             * ---------------------------------------
             * Issuer Dashboard Routes (/dashboard/issuer)
             * ---------------------------------------
             */

            // Dashboard home showing issuer's courses
            appInner.get('/issuer', async (req, res) => {
                const { id } = req.user! // Populated by sessionAuth
                const courses = await db.execute({
                    sql: 'SELECT * FROM courses WHERE issuer_id = ?',
                    args: [id]
                })

                return res.view('issuer_dashboard', {
                    title: 'Dashboard',
                    courses: courses.rows || []
                }, { layout: 'dashboard_base' })
            })

            // New course creation page
            appInner.get('/issuer/courses/new', async (req, res) => {
                return res.view('issuer_new_courses', {
                    title: 'Create Course'
                }, { layout: 'dashboard_base' })
            })

            // Individual course detail page
            appInner.get('/issuer/courses/:course_id', async (req, res) => {
                const { course_id } = req.params as { course_id: string }
                const { id: issuer_id } = req.user!

                const course = await db.execute({
                    sql: 'SELECT * FROM courses WHERE id = ? AND issuer_id = ?',
                    args: [course_id, issuer_id]
                })

                // Redirect if course not found
                if (!course.rows?.length) return res.redirect('/dashboard/issuer')

                return res.view('issuer_course_detail', {
                    title: 'Course Detail',
                    course: course.rows[0]
                }, { layout: 'dashboard_base' })
            })

            /**
             * ---------------------------------------
             * Student Dashboard Routes (/dashboard/student)
             * ---------------------------------------
             */

            // Student dashboard home showing certificates
            appInner.get('/student', async (req, res) => {
                const { email } = req.user!

                const courses = await db.execute({
                    sql: `
                        SELECT 
                          courses.*, users.full_name
                        FROM certs
                        LEFT JOIN courses ON certs.course_id = courses.id
                        LEFT JOIN users ON certs.email = users.email
                        WHERE certs.email = ?
                    `,
                    args: [email]
                })

                return res.view('student_dashboard', {
                    title: 'Dashboard',
                    courses: courses.rows || []
                }, { layout: 'dashboard_base' })
            })

            // Student course detail view
            appInner.get('/student/courses/:course_id', async (req, res) => {
                const { email } = req.user!
                const { course_id } = req.params as { course_id: string }

                const courses = await db.execute({
                    sql: `
                        SELECT 
                          courses.*, users.full_name, 
                          certs.id as cert_id, certs.cert_hash as cert_hash 
                        FROM certs
                        LEFT JOIN courses ON certs.course_id = courses.id
                        LEFT JOIN users ON certs.email = users.email
                        WHERE certs.email = ? AND certs.course_id = ?
                    `,
                    args: [email, course_id]
                })

                console.log(courses.rows[0]) // Preserve original debug log

                if (!courses.rows?.length) return res.redirect('/dashboard/student')

                return res.view('student_course_detail', {
                    title: 'Course Detail',
                    course: courses.rows[0]
                }, { layout: 'dashboard_base' })
            })

            // Register "create new course" POST route (from user.js)
            appInner.route(newCourse)

        }, { prefix: '/dashboard' })
    }
}
