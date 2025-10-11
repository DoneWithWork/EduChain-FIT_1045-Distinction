import { FastifyReply, FastifyRequest, RouteOptions } from "fastify"
import { db } from "../database.js"
import { comparePasswords, hashPassword } from "../libs/bcrypt.js"
import { newPrivateKey } from "../libs/sui.js"
import { generateSessionId, hashSessionId } from "../libs/sessions.js"

/* ============================
   SIGNUP ROUTE
============================ */
const signupRoute = {
    method: 'POST',
    url: '/signup',
    handler: async (req: FastifyRequest<{
        Body: {
            email: string
            password: string
            confirm_password: string
            is_issuer?: boolean | string | null
            institution_name?: string
            full_name?: string
        }
    }>, res: FastifyReply) => {
        let { email, password, confirm_password, is_issuer, institution_name, full_name } = req.body

        const isIssuerBool =
            is_issuer === true ||
            is_issuer === 'true' ||
            is_issuer === 'on'

        if (password !== confirm_password) {
            return res.status(400).send({ error: 'Passwords do not match' })
        }
        if (password.length < 5) {
            return res.status(400).send({ error: 'Password must be at least 5 characters' })
        }

        const existing = await db.execute({
            sql: 'SELECT 1 FROM users WHERE email = ? LIMIT 1',
            args: [email]
        })
        if (existing.rows.length > 0) {
            return res.status(400).send({ error: 'Email already in use' })
        }

        const hashedPassword = await hashPassword(password)
        const address = await newPrivateKey()

        const role = isIssuerBool ? 'issuer' : 'student'

        try {
            await db.execute({
                sql: `
          INSERT INTO users (email, password, full_name, role, address, institution_name)
          VALUES (?, ?, ?, ?, ?, ?)
        `,
                args: [
                    email,
                    hashedPassword,
                    full_name || institution_name || '',
                    role,
                    address,
                    isIssuerBool ? institution_name || '' : null
                ]
            })

            if (req.headers['content-type']?.includes('application/json')) {
                return res.send({ success: true })
            } else {
                return res.redirect('/login')
            }
        } catch (err) {
            console.error('Signup error:', err)
            res.status(500).send({ error: 'Failed to register user' })
        }
    },

    schema: {
        body: {
            type: 'object',
            properties: {
                email: { type: 'string' },
                password: { type: 'string' },
                confirm_password: { type: 'string' },
                is_issuer: { type: ['boolean', 'string', 'null'], default: false },
                institution_name: { type: 'string' },
                full_name: { type: 'string' }
            },
            required: ['email', 'password', 'confirm_password']
        }
    }
}

/* ============================
   LOGIN ROUTE
============================ */
const loginRoute: RouteOptions = {
    method: 'POST',
    url: '/login',
    handler: async (req: FastifyRequest, res: FastifyReply) => {
        const { email, password } = req.body as { email: string; password: string }
        console.log("hi");
        const userQuery = await db.execute({
            sql: 'SELECT id, password, role FROM users WHERE email = ? LIMIT 1',
            args: [email]
        })
        const user = userQuery.rows[0]

        if (!user) {
            return res.status(401).send({ error: 'Invalid email or password' })
        }

        // Compare password
        const validPassword = await comparePasswords(password, user.password as string)
        if (!validPassword) {
            return res.status(401).send({ error: 'Invalid email or password' })
        }

        const sessionId = generateSessionId()
        const sessionHash = hashSessionId(sessionId)
        const expires = Date.now() + 1000 * 60 * 60 * 24

        await db.execute({
            sql: 'INSERT INTO sessions (id, user_id, expires) VALUES (?, ?, ?)',
            args: [sessionHash, user.id, expires]
        })

        // Set cookie
        res.setCookie('session_id', sessionHash, {
            httpOnly: true,
            sameSite: 'lax',
            secure: process.env.NODE_ENV !== 'development',
            path: '/',
            maxAge: 60 * 60 * 24
        })
        if (user.role === 'issuer') {
            res.redirect("/dashboard/issuer");
        } else {
            res.redirect("/dashboard/student");
        }
    },
    schema: {
        body: {
            type: 'object',
            properties: {
                email: { type: 'string' },
                password: { type: 'string' }
            },
            required: ['email', 'password']
        }
    }
}

/* ============================
   LOGOUT ROUTE
============================ */
const logoutRoute: RouteOptions = {
    method: 'POST',
    url: '/logout',
    handler: async (req: FastifyRequest, res: FastifyReply) => {
        // Get session cookie
        const sessionId = req.cookies.session_id
        if (!sessionId) {
            // Even if there's no cookie, respond with success — no need to leak session logic
            return res.redirect('/login')
        }

        try {
            // Delete session from DB
            await db.execute({
                sql: 'DELETE FROM sessions WHERE id = ?',
                args: [sessionId]
            })

            // Clear cookie
            res.clearCookie('session_id', {
                path: '/',
                httpOnly: true,
                sameSite: 'lax',
                secure: process.env.NODE_ENV !== 'development'
            })

            // Redirect or send JSON depending on context
            if (req.headers['content-type']?.includes('application/json')) {
                return res.send({ success: true })
            } else {
                return res.redirect('/login')
            }

        } catch (err) {
            console.error('Logout error:', err)
            res.status(500).send({ error: 'Failed to log out' })
        }
    }
}
export { loginRoute, signupRoute, logoutRoute }