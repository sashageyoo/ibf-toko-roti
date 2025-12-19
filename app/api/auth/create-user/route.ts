import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { getSession } from "@/lib/auth"

const convex = new ConvexHttpClient(process.env.NEXT_PUBLIC_CONVEX_URL!)

export async function POST(request: Request) {
  try {
    // Check if current user is admin
    const session = await getSession()
    if (!session || session.role !== "admin") {
      return NextResponse.json(
        { error: "Unauthorized" },
        { status: 403 }
      )
    }

    const { username, name, email, password, role } = await request.json()

    if (!username || !name || !email || !password || !role) {
      return NextResponse.json(
        { error: "All fields are required" },
        { status: 400 }
      )
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12)

    // Create user in Convex
    const userId = await convex.mutation(api.users.create, {
      username,
      name,
      email,
      password: hashedPassword,
      role,
    })

    return NextResponse.json({ userId })
  } catch (error: any) {
    console.error("Create user error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to create user" },
      { status: 500 }
    )
  }
}
