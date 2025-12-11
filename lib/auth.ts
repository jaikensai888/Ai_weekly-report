import { cookies } from 'next/headers'
import crypto from 'crypto'

// JWT 密钥（生产环境应该使用环境变量）
const JWT_SECRET = process.env.JWT_SECRET || 'ai1-log-secret-key-2024'
const TOKEN_NAME = 'auth_token'

// 简单的密码哈希（使用 SHA-256）
export function hashPassword(password: string): string {
  return crypto.createHash('sha256').update(password + JWT_SECRET).digest('hex')
}

// 验证密码
export function verifyPassword(password: string, hashedPassword: string): boolean {
  return hashPassword(password) === hashedPassword
}

// 生成 JWT Token
export function generateToken(userId: number, username: string): string {
  const header = Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url')
  const payload = Buffer.from(JSON.stringify({
    userId,
    username,
    exp: Date.now() + 7 * 24 * 60 * 60 * 1000 // 7天过期
  })).toString('base64url')
  
  const signature = crypto
    .createHmac('sha256', JWT_SECRET)
    .update(`${header}.${payload}`)
    .digest('base64url')
  
  return `${header}.${payload}.${signature}`
}

// 验证并解析 Token
export function verifyToken(token: string): { userId: number; username: string } | null {
  try {
    const parts = token.split('.')
    if (parts.length !== 3) return null
    
    const [header, payload, signature] = parts
    
    // 验证签名
    const expectedSignature = crypto
      .createHmac('sha256', JWT_SECRET)
      .update(`${header}.${payload}`)
      .digest('base64url')
    
    if (signature !== expectedSignature) return null
    
    // 解析 payload
    const data = JSON.parse(Buffer.from(payload, 'base64url').toString())
    
    // 检查过期时间
    if (data.exp && data.exp < Date.now()) return null
    
    return { userId: data.userId, username: data.username }
  } catch {
    return null
  }
}

// 从请求中获取当前用户
export async function getCurrentUser(): Promise<{ userId: number; username: string } | null> {
  try {
    const cookieStore = await cookies()
    const token = cookieStore.get(TOKEN_NAME)?.value
    
    if (!token) return null
    
    return verifyToken(token)
  } catch {
    return null
  }
}

// 设置认证 Cookie
export async function setAuthCookie(token: string): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.set(TOKEN_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 7 * 24 * 60 * 60, // 7天
    path: '/'
  })
}

// 清除认证 Cookie
export async function clearAuthCookie(): Promise<void> {
  const cookieStore = await cookies()
  cookieStore.delete(TOKEN_NAME)
}

