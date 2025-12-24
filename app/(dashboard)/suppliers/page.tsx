"use client";

import { useState, Suspense } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useQueryState } from "nuqs";
import { SearchInput } from "@/components/search-input";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Users } from "lucide-react";
import { toast } from "sonner";

function SuppliersContent() {
  const suppliers = useQuery(api.suppliers.list);
  const createSupplier = useMutation(api.suppliers.create);
  const deleteSupplier = useMutation(api.suppliers.remove);

  const [open, setOpen] = useState(false);
  const [name, setName] = useState("");
  const [contact, setContact] = useState("");

  const [search] = useQueryState("q", { defaultValue: "" });

  const handleCreate = async () => {
    if (!name || !contact) {
      toast.error("Mohon isi semua field");
      return;
    }

    try {
      await createSupplier({ name, contact });
      toast.success("Pemasok berhasil dibuat");
      setOpen(false);
      setName("");
      setContact("");
    } catch {
      toast.error("Gagal membuat pemasok");
    }
  };

  const handleDelete = async (id: Id<"suppliers">) => {
    if (!confirm("Yakin ingin menghapus pemasok ini?")) return;
    try {
      await deleteSupplier({ id });
      toast.success("Pemasok dihapus");
    } catch {
      toast.error("Gagal menghapus pemasok");
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pemasok</h1>
          <p className="text-muted-foreground">Kelola pemasok bahan Anda</p>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput />
          <Dialog open={open} onOpenChange={setOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Tambah Pemasok
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Tambah Pemasok Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nama *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="cth., PT Tepung Indonesia"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Kontak *</Label>
                  <Input
                    value={contact}
                    onChange={(e) => setContact(e.target.value)}
                    placeholder="cth., 08123456789"
                  />
                </div>
                <Button onClick={handleCreate} className="w-full">
                  Buat Pemasok
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Pemasok</TableHead>
              <TableHead>Kontak</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {suppliers
              ?.filter(
                (supplier) =>
                  supplier.name.toLowerCase().includes(search.toLowerCase()) ||
                  supplier.contact.toLowerCase().includes(search.toLowerCase()),
              )
              .map((supplier) => (
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
                  Belum ada pemasok. Tambahkan untuk memulai.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function SuppliersPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <SuppliersContent />
    </Suspense>
  );
}
