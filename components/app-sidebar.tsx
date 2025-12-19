"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarHeader,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar"
import { LayoutDashboard, Package, Boxes, Users, BookOpen, Factory, AlertTriangle, UserCog, Warehouse, ClipboardCheck } from "lucide-react"
import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { useAuth } from "@/components/auth-provider"

type UserRole = "admin" | "manager_inventaris" | "operator_gudang" | "manager_produksi" | "operator_produksi" | "qc"

const navItems: {
  title: string
  href: string
  icon: typeof LayoutDashboard
  allowedRoles: UserRole[]
}[] = [
    {
      title: "Dashboard",
      href: "/",
      icon: LayoutDashboard,
      allowedRoles: ["admin", "manager_inventaris", "operator_gudang", "manager_produksi", "operator_produksi", "qc"],
    },
    {
      title: "Raw Materials",
      href: "/raw-materials",
      icon: Package,
      allowedRoles: ["admin", "manager_inventaris", "operator_gudang"],
    },
    {
      title: "Finished Products",
      href: "/finished-products",
      icon: Boxes,
      allowedRoles: ["admin", "manager_inventaris", "manager_produksi"],
    },
    {
      title: "Inventory",
      href: "/inventory",
      icon: Warehouse,
      allowedRoles: ["admin", "manager_inventaris", "operator_gudang"],
    },
    {
      title: "Suppliers",
      href: "/suppliers",
      icon: Users,
      allowedRoles: ["admin", "manager_inventaris"],
    },
    {
      title: "Recipes",
      href: "/recipes",
      icon: BookOpen,
      allowedRoles: ["admin", "manager_produksi"],
    },
    {
      title: "Production",
      href: "/production",
      icon: Factory,
      allowedRoles: ["admin", "manager_produksi", "operator_produksi", "qc"],
    },
    {
      title: "Quality Control",
      href: "/qc",
      icon: ClipboardCheck,
      allowedRoles: ["admin", "manager_inventaris", "qc"],
    },
  ]

export function AppSidebar() {
  const pathname = usePathname()
  const materials = useQuery(api.rawMaterials.list)
  const products = useQuery(api.finishedProducts.list)
  const { user } = useAuth()

  const lowStockMaterials = materials?.filter((i) => i.isLowStock).length || 0
  const lowStockProducts = products?.filter((i) => i.isLowStock).length || 0
  const totalLowStock = lowStockMaterials + lowStockProducts

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-8 w-8 items-center justify-center rounded-lg bg-primary text-primary-foreground">
            <Factory className="h-4 w-4" />
          </div>
          <div className="flex flex-col">
            <span className="text-sm font-semibold">IBF Bakery</span>
            <span className="text-xs text-muted-foreground">Manufacturing System</span>
          </div>
        </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupLabel>Menu</SidebarGroupLabel>
          <SidebarGroupContent>
            <SidebarMenu>
              {navItems
                .filter((item) => user?.role && item.allowedRoles.includes(user.role))
                .map((item) => (
                  <SidebarMenuItem key={item.href}>
                    <SidebarMenuButton asChild isActive={pathname === item.href}>
                      <Link href={item.href}>
                        <item.icon className="h-4 w-4" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Admin Only - User Management */}
        {user?.role === "admin" && (
          <SidebarGroup>
            <SidebarGroupLabel>Administration</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/users"}>
                    <Link href="/users">
                      <UserCog className="h-4 w-4" />
                      <span>Users</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {totalLowStock > 0 && (
          <SidebarGroup>
            <SidebarGroupLabel>Alerts</SidebarGroupLabel>
            <SidebarGroupContent>
              <div className="mx-2 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                <AlertTriangle className="h-4 w-4" />
                <span>{totalLowStock} items low stock</span>
              </div>
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  )
}
