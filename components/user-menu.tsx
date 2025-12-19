"use client"

import { useAuth } from "@/components/auth-provider"
import { Button } from "@/components/ui/button"
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuLabel,
    DropdownMenuSeparator,
    DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { LogOut, User } from "lucide-react"
import { Badge } from "@/components/ui/badge"

export function UserMenu() {
    const { user, isLoading, logout } = useAuth()

    if (isLoading) {
        return (
            <div className="h-8 w-8 animate-pulse rounded-full bg-muted" />
        )
    }

    if (!user) {
        return null
    }

    const initials = user.name
        .split(" ")
        .map((n) => n[0])
        .join("")
        .toUpperCase()
        .slice(0, 2)

    const roleColors: Record<string, string> = {
        admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
        manager_inventaris: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
        operator_gudang: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
        manager_produksi: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
        operator_produksi: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
        qc: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
    }

    const roleLabels: Record<string, string> = {
        admin: "Administrator",
        manager_inventaris: "Manager Inventaris",
        operator_gudang: "Operator Gudang",
        manager_produksi: "Manager Produksi",
        operator_produksi: "Operator Produksi",
        qc: "Quality Control",
    }

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" className="relative h-8 w-8 rounded-full">
                    <Avatar className="h-8 w-8">
                        <AvatarFallback className="bg-gradient-to-br from-amber-500 to-orange-600 text-white text-xs">
                            {initials}
                        </AvatarFallback>
                    </Avatar>
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent className="w-56" align="end" forceMount>
                <DropdownMenuLabel className="font-normal">
                    <div className="flex flex-col space-y-2">
                        <div className="flex items-center gap-2">
                            <p className="text-sm font-medium leading-none">{user.name}</p>
                            <Badge variant="outline" className={`text-xs ${roleColors[user.role] || ""}`}>
                                {roleLabels[user.role] || user.role}
                            </Badge>
                        </div>
                        <p className="text-xs leading-none text-muted-foreground">
                            @{user.username}
                        </p>
                    </div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={logout} className="text-red-600 cursor-pointer">
                    <LogOut className="mr-2 h-4 w-4" />
                    <span>Log out</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>
    )
}
