"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
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
} from "@/components/ui/sidebar";
import {
  LayoutDashboard,
  Package,
  Boxes,
  Users,
  BookOpen,
  Factory,
  AlertTriangle,
  UserCog,
  Warehouse,
  ClipboardCheck,
  History,
  Clock,
} from "lucide-react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { useAuth } from "@/components/auth-provider";

type UserRole =
  | "admin"
  | "manager_inventaris"
  | "operator_gudang"
  | "manager_produksi"
  | "operator_produksi"
  | "qc";

const navItems: {
  title: string;
  href: string;
  icon: typeof LayoutDashboard;
  allowedRoles: UserRole[];
}[] = [
  {
    title: "Dasbor",
    href: "/",
    icon: LayoutDashboard,
    allowedRoles: [
      "admin",
      "manager_inventaris",
      "operator_gudang",
      "manager_produksi",
      "operator_produksi",
      "qc",
    ],
  },
  {
    title: "Bahan Baku",
    href: "/raw-materials",
    icon: Package,
    allowedRoles: ["admin", "manager_inventaris", "operator_gudang"],
  },
  {
    title: "Produk Jadi",
    href: "/finished-products",
    icon: Boxes,
    allowedRoles: ["admin", "manager_inventaris", "manager_produksi"],
  },
  {
    title: "Inventaris",
    href: "/inventory",
    icon: Warehouse,
    allowedRoles: ["admin", "manager_inventaris", "operator_gudang"],
  },
  {
    title: "Pemasok",
    href: "/suppliers",
    icon: Users,
    allowedRoles: ["admin", "manager_inventaris"],
  },
  {
    title: "Resep",
    href: "/recipes",
    icon: BookOpen,
    allowedRoles: ["admin", "manager_produksi"],
  },
  {
    title: "Produksi",
    href: "/production",
    icon: Factory,
    allowedRoles: ["admin", "manager_produksi", "operator_produksi", "qc"],
  },
  {
    title: "Kontrol Kualitas",
    href: "/qc",
    icon: ClipboardCheck,
    allowedRoles: ["admin", "manager_inventaris", "qc"],
  },
  {
    title: "Transaksi",
    href: "/transactions",
    icon: History,
    allowedRoles: ["admin", "manager_inventaris"],
  },
];

export function AppSidebar() {
  const pathname = usePathname();
  const materials = useQuery(api.rawMaterials.list);
  const products = useQuery(api.finishedProducts.list);
  const { user } = useAuth();

  const lowStockMaterials = materials?.filter((i) => i.isLowStock).length || 0;
  const lowStockProducts = products?.filter((i) => i.isLowStock).length || 0;
  const totalLowStock = lowStockMaterials + lowStockProducts;

  // Query for expired batches
  const expiredBatches = useQuery(api.batches.getExpiredBatches);
  const expiredCount = expiredBatches?.length || 0;

  return (
    <Sidebar>
      <SidebarHeader className="border-b border-sidebar-border px-6 py-4">
        <Link href="/" className="flex items-center gap-2">
          <div className="flex h-12 items-center justify-center">
            <img
              src="/ibf-long-white-logo.png"
              alt="IBF Bakery Logo"
              className="h-full w-auto object-contain"
            />
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
            <SidebarGroupLabel>Administrasi</SidebarGroupLabel>
            <SidebarGroupContent>
              <SidebarMenu>
                <SidebarMenuItem>
                  <SidebarMenuButton asChild isActive={pathname === "/users"}>
                    <Link href="/users">
                      <UserCog className="h-4 w-4" />
                      <span>Pengguna</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              </SidebarMenu>
            </SidebarGroupContent>
          </SidebarGroup>
        )}

        {(totalLowStock > 0 || expiredCount > 0) && (
          <SidebarGroup>
            <SidebarGroupLabel>Peringatan</SidebarGroupLabel>
            <SidebarGroupContent className="space-y-2">
              {totalLowStock > 0 && (
                <div className="mx-2 flex items-center gap-2 rounded-lg bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  <AlertTriangle className="h-4 w-4" />
                  <span>{totalLowStock} item stok rendah</span>
                </div>
              )}
              {expiredCount > 0 && (
                <Link
                  href="/inventory"
                  className="mx-2 flex items-center gap-2 rounded-lg bg-red-100 px-3 py-2 text-sm text-red-800 hover:bg-red-200 transition-colors"
                >
                  <Clock className="h-4 w-4" />
                  <span>{expiredCount} batch kedaluwarsa</span>
                </Link>
              )}
            </SidebarGroupContent>
          </SidebarGroup>
        )}
      </SidebarContent>
    </Sidebar>
  );
}
