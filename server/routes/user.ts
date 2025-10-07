import { FastifyReply, FastifyRequest, RouteOptions } from "fastify"
import { db } from "../database.js"
import fs from "fs/promises"
import path from "path"
import { Transaction } from "@mysten/sui/transactions"
import { suiClient } from "../libs/sui.js"
import dotenv from "dotenv"
import { Ed25519Keypair } from "@mysten/sui/keypairs/ed25519"
import { SuiObjectRef } from "@mysten/sui/client"
dotenv.config()
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

            const existingCourse = await db.execute({
                sql: 'SELECT 1 FROM courses WHERE course_name = ? AND issuer_id = ?',
                args: [course_name, issuer_id],
            })
            if (existingCourse.rows && existingCourse.rows.length > 0) {
                return res.view('issuer_new_courses', {
                    title: 'Dashboard', error: "Course already exists", formData: { course_name, course_description, student_emails },
                }, { layout: 'dashboard_base' })
            }
            if (!course_name || !course_description || !student_emails) {
                return res.view('issuer_new_courses', {
                    title: 'Dashboard', error: "Missing fields", formData: { course_name, course_description, student_emails },
                }, { layout: 'dashboard_base' })

            }

            const emailList = student_emails
                .split(",")
                .map(e => e.trim())
                .filter(e => e.length > 0)

            const newCourse = await db.execute({
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

            const course_id = newCourse.lastInsertRowid;
            if (!course_id) throw new Error("Failed to retrieve new course ID");

            for (const email of emailList) {
                await db.execute({
                    sql: "INSERT INTO certs (course_id, email) VALUES (?, ?)",
                    args: [course_id, email]
                })
            }
            res.redirect("/dashboard/issuer")
        } catch (err) {
            console.error("Course creation error:", err)
            return res.view('issuer_new_courses', { title: 'Dashboard', error: err }, { layout: 'dashboard_base' })

        }
    },
}

export type CertQueryResult = {
    student_email: string;
    student_address: string;
    student_name: string;
    issuer_id: number;
    issuer_name: string;
    course_image_url: string;
    created_at: Date;
};


const mintCert: RouteOptions = {
    method: 'POST',
    url: '/mint-cert',
    handler: async (req: FastifyRequest, res: FastifyReply) => {
        try {
            const { cert_id } = req.body as { cert_id: number }
            const { id, email } = req.user ? req.user : { id: null, email: null };
            if (!id) throw new Error("Unauthorized");
            console.log(id, cert_id);
            const tx = new Transaction();
            const result = await db.execute({
                sql: `
    SELECT 
      student.email AS student_email,
      student.address AS student_address,
      student.full_name AS student_name,
      issuer.id AS issuer_id,
      issuer.full_name AS issuer_name,
      courses.course_image_url,
      courses.created_at
    FROM certs
    LEFT JOIN courses ON certs.course_id = courses.id
    LEFT JOIN users AS student ON certs.email = student.email
    LEFT JOIN users AS issuer ON courses.issuer_id = issuer.id
    WHERE certs.id = ? AND student.id = ?;
  `,
                args: [cert_id, id]
            })

            if (!result.rows) throw new Error("Certificate not found");
            const cert = result.rows[0] as unknown as CertQueryResult | undefined;
            if (!cert) throw new Error("Certificate not found");


            const keyPair = Ed25519Keypair.fromSecretKey(process.env.SUI_PRIVATE_KEY!);
            const address = keyPair.getPublicKey().toSuiAddress();
            let payment: SuiObjectRef[] = []
            let retries = 10;
            while (retries !== 0) {
                const coins = await suiClient.getCoins({ owner: address, limit: 1 })
                if (coins.data.length > 0) {
                    payment = coins.data.map((coin) => ({
                        objectId: coin.coinObjectId,
                        version: coin.version,
                        digest: coin.digest
                    }))
                    break;

                }
                await new Promise(res => setTimeout(res, 200));
                retries--;
            }
            const privateKey = Ed25519Keypair.fromSecretKey(cert.student_address);
            const studentAddress = privateKey.getPublicKey().toSuiAddress();
            tx.moveCall({
                target: `${process.env.SUI_SMART_CONTRACT}::cert::new_cert`,
                arguments: [
                    tx.object(process.env.SUI_FACTORY_OBJ!),
                    tx.pure.string(cert.student_email),
                    tx.pure.address(studentAddress),
                    tx.pure.string(cert.student_name),
                    tx.pure.string(cert.issuer_name),
                    tx.pure.string("Course Completion Cert"),
                    tx.pure.string(cert.course_image_url),
                    tx.pure.string(new Date(cert.created_at).toDateString()),
                    // expiry date 1 year from now
                    tx.pure.u64(new Date(cert.created_at).setFullYear(new Date(cert.created_at).getFullYear() + 1))
                ]
            })
            tx.setGasPayment(payment);
            tx.setGasBudget(4000000);
            tx.setSender(address);

            const signedTx = await suiClient.signAndExecuteTransaction({
                transaction: tx,
                signer: keyPair,
                requestType: "WaitForLocalExecution"
            });
            const trx_result = await suiClient.waitForTransaction({ digest: signedTx.digest, timeout: 10000 });


            if (!trx_result) throw new Error("Transaction failed");

            console.log("Transaction successful:", signedTx);
            // toggle the cert as minted
            await db.execute({
                sql: "UPDATE certs SET cert_hash = ?, minted_at = CURRENT_TIMESTAMP WHERE id = ?",
                args: [signedTx.digest, cert_id]
            })
            console.log(signedTx);
            return res.send({ success: true, data: signedTx });
        } catch (err) {
            console.error("Minting error:", err);
            return res.status(500).send({ success: false, error: "Internal Server Error" });
        }

    },
    schema: {
        body: {
            type: 'object',
            properties: {
                cert_id: { type: 'string' },
            },
            required: ['cert_id']
        }
    }
}
export { newCourse, mintCert }
