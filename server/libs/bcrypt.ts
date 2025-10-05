import bcrypt from 'bcrypt'
const saltRounds = 10

export async function hashPassword(password: string) {
    const hash = await bcrypt.hash(password, saltRounds)
    return hash
}
export async function comparePasswords(password: string, hashPassword: string) {
    const success = await bcrypt.compare(password, hashPassword)
    return success
}