import { NextResponse } from "next/server"
import { ConvexHttpClient } from "convex/browser"
import { api } from "@/convex/_generated/api"
import { getSession } from "@/lib/auth"
import type { Id } from "@/convex/_generated/dataModel"

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

    const { id } = await request.json()

    if (!id) {
      return NextResponse.json(
        { error: "User ID is required" },
        { status: 400 }
      )
    }

    // Don't allow deleting yourself
    if (id === session.userId) {
      return NextResponse.json(
        { error: "Cannot delete yourself" },
        { status: 400 }
      )
    }

    // Delete user in Convex
    await convex.mutation(api.users.remove, {
      id: id as Id<"users">,
    })

    return NextResponse.json({ success: true })
  } catch (error: any) {
    console.error("Delete user error:", error)
    return NextResponse.json(
      { error: error.message || "Failed to delete user" },
      { status: 500 }
    )
  }
}
