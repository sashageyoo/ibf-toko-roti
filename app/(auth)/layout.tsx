import type React from "react"
import { Toaster } from "@/components/ui/sonner"
import "../globals.css"

export default function AuthLayout({
    children,
}: {
    children: React.ReactNode
}) {
    return (
        <html lang="en">
            <body className="font-sans antialiased">
                {children}
                <Toaster />
            </body>
        </html>
    )
}
