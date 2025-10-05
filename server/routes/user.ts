import { FastifyReply, FastifyRequest } from "fastify"
import { db } from "../database.js"
import fs from "fs/promises"
import path from "path"

const newCourse = {
    method: "POST",
    url: "/courses/new",
    handler: async (req: FastifyRequest, res: FastifyReply) => {
        if (!req.user) {
            return res.status(401).send({ error: "Unauthorized" })
        }

        const { id: issuer_id, role } = req.user
        if (role !== "issuer") {
            return res.status(403).send({ error: "Forbidden" })
        }

        try {
            const parts = req.parts()
            const fields: Record<string, string> = {}
            let fileName = ""
            for await (const part of parts) {
                if (part.type === "file") {
                    const uploadDir = path.join(process.cwd(), "public", "uploads")
                    await fs.mkdir(uploadDir, { recursive: true })
                    fileName = `${Date.now()}_${part.filename}`

                    const filePath = path.join(uploadDir, fileName)
                    const buffer = await part.toBuffer()
                    await fs.writeFile(filePath, buffer)
                } else {
                    fields[part.fieldname] = part.value as string
                }
            }

            const { course_name, course_description, student_emails } = fields

            if (!course_name || !course_description || !student_emails) {
                return res.status(400).send({ error: "Missing fields" })
            }

            const emailList = student_emails
                .split(",")
                .map(e => e.trim())
                .filter(e => e.length > 0)

            await db.execute({
                sql: `
          INSERT INTO courses (
            course_name,
            course_description,
            course_image_url,
            student_emails,
            issuer_id
          ) VALUES (?, ?, ?, ?, ?)
        `,
                args: [course_name, course_description, fileName, JSON.stringify(emailList), issuer_id],
            })

            res.redirect("/dashboard/issuer")
        } catch (err) {
            console.error("Course creation error:", err)
            res.status(500).send({ error: "Failed to create course" })
        }
    },
}

export { newCourse }
