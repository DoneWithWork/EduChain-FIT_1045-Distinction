import 'fastify'

declare module 'fastify' {
    interface FastifyRequest {
        user?: {
            id: number
            email: string
            role: string
        },

    }
    interface FastifyReply {
        locals?: {
            role: string
        }
    }
}

