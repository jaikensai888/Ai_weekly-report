import { NextResponse } from 'next/server'
import { clearAuthCookie } from '@/lib/auth'

export const dynamic = 'force-dynamic'

export async function POST() {
  try {
    await clearAuthCookie()

    return NextResponse.json({
      message: '已退出登录'
    })
  } catch (error) {
    console.error('退出登录失败:', error)
    return NextResponse.json(
      { error: '退出登录失败' },
      { status: 500 }
    )
  }
}

