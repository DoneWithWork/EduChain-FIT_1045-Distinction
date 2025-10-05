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
            is_issuer: boolean
            institution_name?: string
            full_name?: string
        }
    }>, res: FastifyReply) => {
        const { email, password, confirm_password, is_issuer, institution_name, full_name } = req.body

        // Validation
        if (password !== confirm_password) {
            return res.status(400).send({ error: "Passwords do not match" })
        }
        if (password.length < 5) {
            return res.status(400).send({ error: "Password must be at least 5 characters" })
        }

        // Check if email already exists
        const existing = await db.execute({
            sql: "SELECT 1 FROM users WHERE email = ? LIMIT 1",
            args: [email]
        })
        if (existing.rows.length > 0) {
            return res.status(400).send({ error: "Email already in use" })
        }

        const hashedPassword = await hashPassword(password)
        const address = await newPrivateKey()

        const role = is_issuer ? 'issuer' : 'student'

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
                    is_issuer ? institution_name || '' : null
                ]
            })
            res.redirect("/login");
        } catch (err) {
            console.error("Signup error:", err)
            res.status(500).send({ error: "Failed to register user" })
        }
    },
    schema: {
        body: {
            type: 'object',
            properties: {
                email: { type: 'string' },
                password: { type: 'string' },
                confirm_password: { type: 'string' },
                is_issuer: { type: 'boolean', default: false },
                institution_name: { type: 'string' },
                full_name: { type: 'string' }
            },
            required: ['email', 'password', 'confirm_password', 'is_issuer']
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
export { loginRoute, signupRoute }