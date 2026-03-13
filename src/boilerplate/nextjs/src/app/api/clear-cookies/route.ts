import { NextResponse } from 'next/server'
import { cookies } from 'next/headers'

export async function PUT() {
  const cookieStore = await cookies()

  cookieStore.delete('accessToken')

  return NextResponse.json({ message: 'Cookies cleared' })
}
