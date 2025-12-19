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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, Boxes, AlertTriangle, Minus } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth-provider"
import { hasPermission } from "@/lib/permissions"
import type { UserRole } from "@/lib/permissions"

export default function FinishedProductsPage() {
    const { user } = useAuth()
    const role = user?.role as UserRole | undefined

    const canCreate = hasPermission(role, "items:create")
    const canDelete = hasPermission(role, "items:delete")
    const canViewPrice = hasPermission(role, "items:view_price")
    const isAdmin = role === "admin"

    const products = useQuery(api.finishedProducts.list)
    const createProduct = useMutation(api.finishedProducts.create)
    const deleteProduct = useMutation(api.finishedProducts.remove)
    const deductStock = useMutation(api.finishedProducts.deductStock)

    const [createOpen, setCreateOpen] = useState(false)
    const [deductOpen, setDeductOpen] = useState(false)
    const [selectedProductId, setSelectedProductId] = useState<Id<"finishedProducts"> | null>(null)

    // Create form
    const [name, setName] = useState("")
    const [sku, setSku] = useState("")
    const [unit, setUnit] = useState("")
    const [minStock, setMinStock] = useState("")
    const [price, setPrice] = useState("")
    const [shelfLifeDays, setShelfLifeDays] = useState("3")

    // Deduct form
    const [deductQty, setDeductQty] = useState("")

    const selectedProduct = products?.find(p => p._id === selectedProductId)

    const handleCreate = async () => {
        if (!name || !sku || !unit || !minStock) {
            toast.error("Please fill all required fields")
            return
        }

        try {
            await createProduct({
                name,
                sku,
                unit,
                minStock: Number.parseFloat(minStock),
                price: price ? Number.parseFloat(price) : undefined,
                shelfLifeDays: shelfLifeDays ? Number.parseInt(shelfLifeDays) : undefined,
            })
            toast.success("Finished product created successfully")
            setCreateOpen(false)
            resetCreateForm()
        } catch (error: any) {
            toast.error(error.message || "Failed to create finished product")
        }
    }

    const handleDelete = async (id: Id<"finishedProducts">) => {
        if (!confirm("Are you sure you want to delete this finished product?")) return
        try {
            await deleteProduct({ id })
            toast.success("Finished product deleted")
        } catch (error: any) {
            toast.error(error.message || "Failed to delete finished product")
        }
    }

    const handleDeduct = async () => {
        if (!selectedProductId || !deductQty) {
            toast.error("Please enter quantity to deduct")
            return
        }

        try {
            await deductStock({
                productId: selectedProductId,
                quantity: Number.parseFloat(deductQty),
            })
            toast.success("Stock deducted successfully (FEFO applied)")
            setDeductOpen(false)
            setDeductQty("")
            setSelectedProductId(null)
        } catch (error: any) {
            toast.error(error.message || "Failed to deduct stock")
        }
    }

    const openDeductDialog = (productId: Id<"finishedProducts">) => {
        setSelectedProductId(productId)
        setDeductQty("")
        setDeductOpen(true)
    }

    const resetCreateForm = () => {
        setName("")
        setSku("")
        setUnit("")
        setMinStock("")
        setPrice("")
        setShelfLifeDays("3")
    }

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                <div>
                    <h1 className="text-2xl font-bold">Finished Products</h1>
                    <p className="text-muted-foreground">Manage produk jadi and stock levels</p>
                </div>
                {canCreate && (
                    <Dialog open={createOpen} onOpenChange={setCreateOpen}>
                        <DialogTrigger asChild>
                            <Button>
                                <Plus className="mr-2 h-4 w-4" />
                                Add Product
                            </Button>
                        </DialogTrigger>
                        <DialogContent>
                            <DialogHeader>
                                <DialogTitle>Add New Finished Product</DialogTitle>
                            </DialogHeader>
                            <div className="space-y-4 pt-4">
                                <div className="space-y-2">
                                    <Label>Name *</Label>
                                    <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., Roti Tawar" />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>SKU *</Label>
                                        <Input value={sku} onChange={(e) => setSku(e.target.value)} placeholder="e.g., FG-001" />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Unit *</Label>
                                        <Input value={unit} onChange={(e) => setUnit(e.target.value)} placeholder="e.g., pcs, loaf" />
                                    </div>
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label>Min Stock *</Label>
                                        <Input
                                            type="number"
                                            step="1"
                                            value={minStock}
                                            onChange={(e) => setMinStock(e.target.value)}
                                            placeholder="0"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label>Shelf Life (days)</Label>
                                        <Input
                                            type="number"
                                            step="1"
                                            value={shelfLifeDays}
                                            onChange={(e) => setShelfLifeDays(e.target.value)}
                                            placeholder="3"
                                        />
                                    </div>
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
                                <Button onClick={handleCreate} className="w-full">
                                    Create Finished Product
                                </Button>
                            </div>
                        </DialogContent>
                    </Dialog>
                )}
            </div>

            {/* Deduct Stock Dialog */}
            <Dialog open={deductOpen} onOpenChange={setDeductOpen}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Deduct Stock (Sales/Shipment)</DialogTitle>
                    </DialogHeader>
                    {selectedProduct && (
                        <div className="space-y-4 pt-4">
                            <Card>
                                <CardHeader className="pb-2">
                                    <CardTitle className="text-base">{selectedProduct.name}</CardTitle>
                                </CardHeader>
                                <CardContent>
                                    <p className="text-sm text-muted-foreground">
                                        Current Stock: <span className="font-medium">{selectedProduct.totalStock} {selectedProduct.unit}</span>
                                    </p>
                                    <p className="text-xs text-muted-foreground mt-1">
                                        FEFO will be applied (oldest stock deducted first)
                                    </p>
                                </CardContent>
                            </Card>
                            <div className="space-y-2">
                                <Label>Quantity to Deduct *</Label>
                                <Input
                                    type="number"
                                    step="1"
                                    value={deductQty}
                                    onChange={(e) => setDeductQty(e.target.value)}
                                    placeholder="0"
                                />
                            </div>
                            <Button onClick={handleDeduct} className="w-full" variant="destructive">
                                <Minus className="mr-2 h-4 w-4" />
                                Deduct Stock
                            </Button>
                        </div>
                    )}
                </DialogContent>
            </Dialog>

            <div className="rounded-lg border">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Name</TableHead>
                            <TableHead>SKU</TableHead>
                            <TableHead>Unit</TableHead>
                            <TableHead className="text-right">Current Stock</TableHead>
                            <TableHead className="text-right">Min Stock</TableHead>
                            <TableHead className="text-right">Shelf Life</TableHead>
                            {canViewPrice && <TableHead className="text-right">Price</TableHead>}
                            <TableHead>Status</TableHead>
                            <TableHead className="w-[100px]"></TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {products?.map((product) => (
                            <TableRow key={product._id}>
                                <TableCell className="font-medium">
                                    <div className="flex items-center gap-2">
                                        <Boxes className="h-4 w-4 text-muted-foreground" />
                                        {product.name}
                                    </div>
                                </TableCell>
                                <TableCell className="text-muted-foreground">{product.sku}</TableCell>
                                <TableCell>{product.unit}</TableCell>
                                <TableCell className="text-right">
                                    {product.totalStock} {product.unit}
                                </TableCell>
                                <TableCell className="text-right">
                                    {product.minStock} {product.unit}
                                </TableCell>
                                <TableCell className="text-right">
                                    {product.shelfLifeDays || 3} days
                                </TableCell>
                                {canViewPrice && (
                                    <TableCell className="text-right">
                                        {product.price ? `Rp ${product.price.toLocaleString()}` : "-"}
                                    </TableCell>
                                )}
                                <TableCell>
                                    {product.isLowStock ? (
                                        <Badge variant="destructive" className="gap-1">
                                            <AlertTriangle className="h-3 w-3" />
                                            Low Stock
                                        </Badge>
                                    ) : (
                                        <Badge variant="secondary">In Stock</Badge>
                                    )}
                                </TableCell>
                                <TableCell>
                                    <div className="flex gap-1">
                                        {isAdmin && product.totalStock > 0 && (
                                            <Button variant="ghost" size="icon" onClick={() => openDeductDialog(product._id)} title="Deduct Stock">
                                                <Minus className="h-4 w-4" />
                                            </Button>
                                        )}
                                        {canDelete && (
                                            <Button variant="ghost" size="icon" onClick={() => handleDelete(product._id)}>
                                                <Trash2 className="h-4 w-4" />
                                            </Button>
                                        )}
                                    </div>
                                </TableCell>
                            </TableRow>
                        ))}
                        {products?.length === 0 && (
                            <TableRow>
                                <TableCell colSpan={canViewPrice ? 10 : 9} className="text-center text-muted-foreground">
                                    No finished products found. Create one and set up a recipe to start production.
                                </TableCell>
                            </TableRow>
                        )}
                    </TableBody>
                </Table>
            </div>
        </div>
    )
}
