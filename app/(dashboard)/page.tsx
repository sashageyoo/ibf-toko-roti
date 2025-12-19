"use client"

import { useQuery } from "convex/react"
import { api } from "@/convex/_generated/api"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Package, AlertTriangle, Factory, Boxes, BookOpen } from "lucide-react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { useAuth } from "@/components/auth-provider"
import { hasPermission, isWarehouseRole, isProductionRole, getRoleDisplayName } from "@/lib/permissions"
import type { UserRole } from "@/lib/permissions"

export default function DashboardPage() {
  const { user } = useAuth()
  const role = user?.role as UserRole | undefined
  const materials = useQuery(api.rawMaterials.list)
  const products = useQuery(api.finishedProducts.list)
  const productionRuns = useQuery(api.production.list)
  const boms = useQuery(api.boms.list)

  const lowStockMaterials = materials?.filter((i) => i.isLowStock) || []
  const lowStockProducts = products?.filter((i) => i.isLowStock) || []
  const plannedRuns = productionRuns?.filter((r) => r.status === "planned") || []

  const canSeeWarehouse = isWarehouseRole(role)
  const canSeeProduction = isProductionRole(role)
  const canSeeQC = hasPermission(role, "batches:set_qc_status")

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Dashboard</h1>
        <p className="text-muted-foreground">
          {role && `Welcome, ${getRoleDisplayName(role)}. `}
          {canSeeWarehouse && canSeeProduction && "Overview of your bakery manufacturing operations"}
          {canSeeWarehouse && !canSeeProduction && "Overview of warehouse inventory"}
          {canSeeProduction && !canSeeWarehouse && "Overview of production operations"}
          {canSeeQC && " - Quality Control active"}
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
        {/* Warehouse Stats */}
        {canSeeWarehouse && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Raw Materials</CardTitle>
                <Package className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{materials?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Active materials tracked</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Finished Products</CardTitle>
                <Boxes className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{products?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Products available</p>
              </CardContent>
            </Card>

            <Card className={lowStockMaterials.length + lowStockProducts.length > 0 ? "border-destructive" : ""}>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Low Stock Alerts</CardTitle>
                <AlertTriangle
                  className={`h-4 w-4 ${lowStockMaterials.length + lowStockProducts.length > 0 ? "text-destructive" : "text-muted-foreground"}`}
                />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{lowStockMaterials.length + lowStockProducts.length}</div>
                <p className="text-xs text-muted-foreground">Items need reorder</p>
              </CardContent>
            </Card>
          </>
        )}

        {/* Production Stats */}
        {canSeeProduction && (
          <>
            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Recipes</CardTitle>
                <BookOpen className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{boms?.length || 0}</div>
                <p className="text-xs text-muted-foreground">Active BOMs</p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader className="flex flex-row items-center justify-between pb-2">
                <CardTitle className="text-sm font-medium">Planned Runs</CardTitle>
                <Factory className="h-4 w-4 text-muted-foreground" />
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold">{plannedRuns.length}</div>
                <p className="text-xs text-muted-foreground">Scheduled for production</p>
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
              <CardTitle>Low Stock Materials</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/raw-materials">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {lowStockMaterials.length === 0 ? (
                <p className="text-sm text-muted-foreground">All materials are well stocked</p>
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
              <CardTitle>Low Stock Products</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/finished-products">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {lowStockProducts.length === 0 ? (
                <p className="text-sm text-muted-foreground">All products are well stocked</p>
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
              <CardTitle>Planned Production</CardTitle>
              <Button variant="outline" size="sm" asChild>
                <Link href="/production">View All</Link>
              </Button>
            </CardHeader>
            <CardContent>
              {plannedRuns.length === 0 ? (
                <p className="text-sm text-muted-foreground">No production runs planned</p>
              ) : (
                <div className="space-y-3">
                  {plannedRuns.slice(0, 5).map((run) => (
                    <div key={run._id} className="flex items-center justify-between">
                      <div>
                        <p className="text-sm font-medium">{run.productName}</p>
                        <p className="text-xs text-muted-foreground">{run.bomName}</p>
                      </div>
                      <div className="text-right">
                        <Badge variant="secondary">{run.targetQuantity} units</Badge>
                        <p className="text-xs text-muted-foreground">{new Date(run.startDate).toLocaleDateString()}</p>
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
  )
}
