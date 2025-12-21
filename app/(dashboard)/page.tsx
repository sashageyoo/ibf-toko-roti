"use client";

import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Package, AlertTriangle, Factory, Boxes, BookOpen } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { useAuth } from "@/components/auth-provider";
import {
  hasPermission,
  isWarehouseRole,
  isProductionRole,
  getRoleDisplayName,
} from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";

export default function DashboardPage() {
  const { user } = useAuth();
  const role = user?.role as UserRole | undefined;
  const materials = useQuery(api.rawMaterials.list);
  const products = useQuery(api.finishedProducts.list);
  const productionRuns = useQuery(api.production.list);
  const boms = useQuery(api.boms.list);

  const lowStockMaterials = materials?.filter((i) => i.isLowStock) || [];
  const lowStockProducts = products?.filter((i) => i.isLowStock) || [];
  const plannedRuns = productionRuns?.filter((r) => r.status === "planned") || [];

  const canSeeWarehouse = isWarehouseRole(role);
  const canSeeProduction = isProductionRole(role);
  const canSeeQC = hasPermission(role, "batches:set_qc_status");

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dasbor</h1>
        <p className="text-muted-foreground">
          {role && `Selamat datang, ${getRoleDisplayName(role)}. `}
          {canSeeWarehouse && canSeeProduction && "Ringkasan operasi manufaktur bakery Anda"}
          {canSeeWarehouse && !canSeeProduction && "Ringkasan inventaris gudang"}
          {canSeeProduction && !canSeeWarehouse && "Ringkasan operasi produksi"}
          {canSeeQC && " - Kontrol Kualitas aktif"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Warehouse Stats */}
        {canSeeWarehouse && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Bahan Baku</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{materials?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Bahan aktif terlacak</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Produk Jadi</CardTitle>
                <Boxes className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{products?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Produk tersedia</p>
              </CardContent>
            </Card>

            <Card
              className={
                lowStockMaterials.length + lowStockProducts.length > 0 ? "border-destructive" : ""
              }
            >
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Peringatan Stok Rendah</CardTitle>
                <AlertTriangle
                  className={`h-4 w-4 ${lowStockMaterials.length + lowStockProducts.length > 0 ? "text-destructive" : "text-muted-foreground"}`}
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">
                  {lowStockMaterials.length + lowStockProducts.length}
                </div>
                <p className="text-xs text-muted-foreground">Item perlu dipesan ulang</p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Production Stats */}
        {canSeeProduction && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Resep</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{boms?.length || 0}</div>
                <p className="text-xs text-muted-foreground">BOM Aktif</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Jadwal Produksi</CardTitle>
                <Factory className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{plannedRuns.length}</div>
                <p className="text-xs text-muted-foreground">Terjadwal untuk produksi</p>
              </CardContent>
            </Card>
          </>
        )}
      </div>

      <div className="grid gap-6 md:grid-cols-2">
        {/* Low Stock Materials - Warehouse only */}
        {canSeeWarehouse && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Bahan Baku Stok Rendah</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/raw-materials">Lihat Semua</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {lowStockMaterials.length === 0 ? (
                <p className="text-sm text-muted-foreground">Semua bahan tersedia cukup</p>
              ) : (
                <div className="space-y-3">
                  {lowStockMaterials.slice(0, 5).map((item) => (
                    <div key={item._id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="destructive">
                          {item.totalStock} {item.unit}
                        </Badge>
                        <p className="text-xs text-muted-foreground">Min: {item.minStock}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Low Stock Products */}
        {canSeeWarehouse && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Produk Stok Rendah</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/finished-products">Lihat Semua</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {lowStockProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">Semua produk tersedia cukup</p>
              ) : (
                <div className="space-y-3">
                  {lowStockProducts.slice(0, 5).map((item) => (
                    <div key={item._id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{item.name}</p>
                        <p className="text-xs text-muted-foreground">SKU: {item.sku}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="destructive">
                          {item.totalStock} {item.unit}
                        </Badge>
                        <p className="text-xs text-muted-foreground">Min: {item.minStock}</p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}

        {/* Planned Production - Production only */}
        {canSeeProduction && (
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>Produksi Terjadwal</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/production">Lihat Semua</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {plannedRuns.length === 0 ? (
                <p className="text-sm text-muted-foreground">Tidak ada produksi terjadwal</p>
              ) : (
                <div className="space-y-3">
                  {plannedRuns.slice(0, 5).map((run) => (
                    <div key={run._id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{run.productName}</p>
                        <p className="text-xs text-muted-foreground">{run.bomName}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">{run.targetQuantity} unit</Badge>
                        <p className="text-xs text-muted-foreground">
                          {new Date(run.startDate).toLocaleDateString()}
                        </p>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
