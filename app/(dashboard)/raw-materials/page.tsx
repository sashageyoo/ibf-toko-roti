"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Package, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth-provider"
import { hasPermission } from "@/lib/permissions"
import type { UserRole } from "@/lib/permissions"

export default function RawMaterialsPage() {
    const { user } = useAuth()
    const role = user?.role as UserRole | undefined

    const canCreate = hasPermission(role, "items:create")
    const canDelete = hasPermission(role, "items:delete")
    const canViewPrice = hasPermission(role, "items:view_price")

    const materials = useQuery(api.rawMaterials.list)
    const createMaterial = useMutation(api.rawMaterials.create)
    const deleteMaterial = useMutation(api.rawMaterials.remove)

    const [open, setOpen] = useState(false)
    const [name, setName] = useState("")
    const [sku, setSku] = useState("")
    const [unit, setUnit] = useState("")
    const [minStock, setMinStock] = useState("")
    const [price, setPrice] = useState("")

    const handleCreate = async () => {
        if (!name || !sku || !unit || !minStock) {
            toast.error("Please fill all required fields")
            return
        }

        try {
            await createMaterial({
                name,
                sku,
                unit,
                minStock: Number.parseFloat(minStock),
                price: price ? Number.parseFloat(price) : undefined,
            })
            toast.success("Raw material created successfully")
            setOpen(false)
            resetForm()
        } catch (error: any) {
            toast.error(error.message || "Failed to create raw material")
        }
    }

    const handleDelete = async (id: Id<"rawMaterials">) => {
        if (!confirm("Are you sure you want to delete this raw material?")) return
        try {
            await deleteMaterial({ id })
            toast.success("Raw material deleted")
        } catch (error: any) {
            toast.error(error.message || "Failed to delete raw material")
        }
    }

    const resetForm = () => {
        setName("")
        setSku("")
        setUnit("")
        setMinStock("")
        setPrice("")
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Raw Materials</h1>
                    <p className="text-muted-foreground">Manage bahan baku for production</p>
                </div>
                {canCreate && (
                    <Dialog open={open} onOpenChange={setOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Material
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Raw Material</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label>Name *</Label>
                                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Tepung Terigu" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>SKU *</Label>
                                        <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g., RM-001" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Unit *</Label>
                                        <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g., kg, gr, liter" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Min Stock *</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={minStock}
                                            onChange={(e) => setMinStock(e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Price (optional)</Label>
                                        <Input
                                            type="number"
                                            step="0.01"
                                            value={price}
                                            onChange={(e) => setPrice(e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                </div>
                                <Button onClick={handleCreate} className="w-full">
                                    Create Raw Material
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead className="text-right">Current Stock</TableHead>
                            <TableHead className="text-right">Min Stock</TableHead>
                            {canViewPrice && <TableHead className="text-right">Price</TableHead>}
                            <TableHead>Status</TableHead>
                            {canDelete && <TableHead className="w-[50px]"></TableHead>}
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {materials?.map((material) => (
                            <TableRow key={material._id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <Package className="h-4 w-4 text-muted-foreground" />
                                        {material.name}
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{material.sku}</TableCell>
                                <TableCell>{material.unit}</TableCell>
                                <TableCell className="text-right">
                                    {material.totalStock} {material.unit}
                                </TableCell>
                                <TableCell className="text-right">
                                    {material.minStock} {material.unit}
                                </TableCell>
                                {canViewPrice && (
                                    <TableCell className="text-right">
                                        {material.price ? `Rp ${material.price.toLocaleString()}` : "-"}
                                    </TableCell>
                                )}
                                <TableCell>
                                    {material.isLowStock ? (
                                        <Badge variant="destructive" className="gap-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            Low Stock
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary">In Stock</Badge>
                                    )}
                                </TableCell>
                                {canDelete && (
                                    <TableCell>
                                        <Button variant="ghost" size="icon" onClick={() => handleDelete(material._id)}>
                                            <Trash2 className="h-4 w-4" />
                                        </Button>
                                    </TableCell>
                                )}
                            </TableRow>
                        ))}
                        {materials?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={canViewPrice && canDelete ? 8 : canViewPrice || canDelete ? 7 : 6} className="text-center text-muted-foreground">
                                    No raw materials found. Create one to get started.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
