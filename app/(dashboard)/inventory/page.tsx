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
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Plus, Package, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth-provider"
import { hasPermission } from "@/lib/permissions"
import type { UserRole } from "@/lib/permissions"

export default function InventoryPage() {
  const { user } = useAuth()
  const role = user?.role as UserRole | undefined

  const canReceive = hasPermission(role, "batches:receive")

  const materials = useQuery(api.rawMaterials.list)
  const suppliers = useQuery(api.suppliers.list)
  const receiveStock = useMutation(api.batches.receiveStock)

  const [open, setOpen] = useState(false)
  const [selectedMaterial, setSelectedMaterial] = useState<string>("")
  const [batchNumber, setBatchNumber] = useState("")
  const [quantity, setQuantity] = useState("")
  const [expiryDate, setExpiryDate] = useState("")
  const [supplierId, setSupplierId] = useState<string>("")

  const handleReceiveStock = async () => {
    if (!selectedMaterial || !batchNumber || !quantity || !expiryDate) {
      toast.error("Please fill all required fields")
      return
    }

    try {
      await receiveStock({
        materialId: selectedMaterial as Id<"rawMaterials">,
        supplierId: supplierId ? (supplierId as Id<"suppliers">) : undefined,
        batchNumber,
        quantity: Number.parseFloat(quantity),
        expiryDate: new Date(expiryDate).getTime(),
      })
      toast.success("Stock received successfully (pending QC review)")
      setOpen(false)
      resetForm()
    } catch (error) {
      toast.error("Failed to receive stock")
    }
  }

  const resetForm = () => {
    setSelectedMaterial("")
    setBatchNumber("")
    setQuantity("")
    setExpiryDate("")
    setSupplierId("")
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Raw Material Inventory</h1>
          <p className="text-muted-foreground">Manage stock levels and receive new inventory</p>
        </div>
        {canReceive && (
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Receive Stock
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Receive New Stock</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Raw Material *</Label>
                  <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select raw material" />
                    </SelectTrigger>
                    <SelectContent>
                      {materials?.map((material) => (
                        <SelectItem key={material._id} value={material._id}>
                          {material.name} ({material.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Supplier</Label>
                  <Select value={supplierId} onValueChange={setSupplierId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select supplier (optional)" />
                    </SelectTrigger>
                    <SelectContent>
                      {suppliers?.map((supplier) => (
                        <SelectItem key={supplier._id} value={supplier._id}>
                          {supplier.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Batch Number *</Label>
                  <Input
                    value={batchNumber}
                    onChange={(e) => setBatchNumber(e.target.value)}
                    placeholder="e.g., BATCH-2024-001"
                  />
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Quantity *</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={quantity}
                      onChange={(e) => setQuantity(e.target.value)}
                      placeholder="0"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label>Expiry Date *</Label>
                    <Input type="date" value={expiryDate} onChange={(e) => setExpiryDate(e.target.value)} />
                  </div>
                </div>
                <Button onClick={handleReceiveStock} className="w-full">
                  Receive Stock
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
              <TableHead>Material</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Current Stock</TableHead>
              <TableHead className="text-right">Min Stock</TableHead>
              <TableHead>Status</TableHead>
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
                <TableCell className="text-right">
                  {material.totalStock} {material.unit}
                  {material.availableStock < material.totalStock && (
                    <div className="text-xs text-muted-foreground font-normal">
                      ({material.availableStock} available)
                    </div>
                  )}
                </TableCell>
                <TableCell className="text-right">
                  {material.minStock} {material.unit}
                </TableCell>
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
              </TableRow>
            ))}
            {materials?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  No raw materials found. Add materials first.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
