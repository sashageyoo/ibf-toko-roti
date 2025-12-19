"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Plus, Trash2, Users } from "lucide-react"
import { toast } from "sonner"

export default function SuppliersPage() {
  const suppliers = useQuery(api.suppliers.list)
  const createSupplier = useMutation(api.suppliers.create)
  const deleteSupplier = useMutation(api.suppliers.remove)

  const [open, setOpen] = useState(false)
  const [name, setName] = useState("")
  const [contact, setContact] = useState("")

  const handleCreate = async () => {
    if (!name || !contact) {
      toast.error("Please fill all fields")
      return
    }

    try {
      await createSupplier({ name, contact })
      toast.success("Supplier created successfully")
      setOpen(false)
      setName("")
      setContact("")
    } catch (error) {
      toast.error("Failed to create supplier")
    }
  }

  const handleDelete = async (id: Id<"suppliers">) => {
    if (!confirm("Are you sure you want to delete this supplier?")) return
    try {
      await deleteSupplier({ id })
      toast.success("Supplier deleted")
    } catch (error) {
      toast.error("Failed to delete supplier")
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Suppliers</h1>
          <p className="text-muted-foreground">Manage your ingredient suppliers</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Add Supplier
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Add New Supplier</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Name *</Label>
                <Input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g., PT Tepung Indonesia" />
              </div>
              <div className="space-y-2">
                <Label>Contact *</Label>
                <Input value={contact} onChange={(e) => setContact(e.target.value)} placeholder="e.g., 08123456789" />
              </div>
              <Button onClick={handleCreate} className="w-full">
                Create Supplier
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Supplier</TableHead>
              <TableHead>Contact</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers?.map((supplier) => (
              <TableRow key={supplier._id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    <Users className="h-4 w-4 text-muted-foreground" />
                    {supplier.name}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">{supplier.contact}</TableCell>
                <TableCell>
                  <Button variant="ghost" size="icon" onClick={() => handleDelete(supplier._id)}>
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {suppliers?.length === 0 && (
              <TableRow>
                <TableCell colSpan={3} className="text-center text-muted-foreground">
                  No suppliers found. Add one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
