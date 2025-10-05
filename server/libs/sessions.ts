import { randomBytes, createHash } from 'crypto'
import fp from 'fastify-plugin'
import { db } from '../database.js'
import { FastifyReply, FastifyRequest } from 'fastify'
export function generateSessionId() {
    return randomBytes(32).toString('hex')
}

export function hashSessionId(id: string) {
    return createHash('sha256').update(id).digest('hex')
}

interface SessionAuthOptions {
    exclude?: string[]
}
export const sessionAuth = fp(async function (fastify, options: SessionAuthOptions) {
    const excludedRoutes = options.exclude || []

    fastify.addHook('preHandler', async (request: FastifyRequest, reply: FastifyReply) => {
        const url = request.raw.url || ''
        const isExcluded = excludedRoutes.some(pattern => {
            if (pattern.endsWith('*')) {
                const prefix = pattern.slice(0, -1)
                return url.startsWith(prefix)
            }
            return url === pattern
        })

        if (isExcluded) return

        const sessionId = request.cookies.session_id
        if (!sessionId) {
            console.log('No session cookie')
            return reply.redirect('/auth/signin')
        }

        try {

            const result = await db.execute({
                sql: `
        SELECT users.id, users.email, users.role
        FROM sessions
        JOIN users ON sessions.user_id = users.id
        WHERE sessions.id = ?
      `,
                args: [sessionId]
            })
            console.log(result);
            if (result.rows.length === 0) {
                console.log('No session found')
                // Invalid or expired session
                return reply.redirect('/auth/signin')
            }

            // Valid user
            request.user = {
                id: result.rows[0].id as number,
                email: result.rows[0].email as string,
                role: result.rows[0].role as string
            }

        } catch (err) {
            fastify.log.error('Session check failed: ' + String(err))
            console.error(err);
            return reply.redirect('/auth/signin')
        }
    })

})

