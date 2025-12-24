"use client";

import { useState, Suspense } from "react";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useQueryState } from "nuqs";
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import * as z from "zod";
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
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Plus, Trash2, Package, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { hasPermission } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";

const createMaterialSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  sku: z.string().min(1, "SKU wajib diisi"),
  unit: z.string().min(1, "Satuan wajib diisi"),
  minStock: z.coerce.number().min(0, "Stok minimum harus angka positif"),
  price: z.coerce.number().min(0, "Harga harus angka positif").optional().or(z.literal("")),
});

type CreateMaterialFormValues = z.infer<typeof createMaterialSchema>;

function RawMaterialsContent() {
  const { user } = useAuth();
  const role = user?.role as UserRole | undefined;

  const canCreate = hasPermission(role, "items:create");
  const canDelete = hasPermission(role, "items:delete");
  const canViewPrice = hasPermission(role, "items:view_price");

  const materials = useQuery(api.rawMaterials.list);
  const createMaterial = useMutation(api.rawMaterials.create);
  const deleteMaterial = useMutation(api.rawMaterials.remove);

  const [open, setOpen] = useState(false);
  const [search] = useQueryState("q", { defaultValue: "" });

  const form = useForm<CreateMaterialFormValues>({
    resolver: zodResolver(createMaterialSchema),
    defaultValues: {
      name: "",
      sku: "",
      unit: "",
      minStock: 0,
      price: undefined,
    },
  });

  const onSubmit = async (data: CreateMaterialFormValues) => {
    try {
      await createMaterial({
        name: data.name,
        sku: data.sku,
        unit: data.unit,
        minStock: Number(data.minStock),
        price: data.price ? Number(data.price) : undefined,
      });
      toast.success("Bahan baku berhasil dibuat");
      setOpen(false);
      form.reset();
    } catch (error: any) {
      toast.error(error.message || "Gagal membuat bahan baku");
    }
  };

  const handleDelete = async (id: Id<"rawMaterials">) => {
    if (!confirm("Yakin ingin menghapus bahan baku ini?")) return;
    try {
      await deleteMaterial({ id });
      toast.success("Bahan baku dihapus");
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus bahan baku");
    }
  };

  const filteredMaterials = materials?.filter(
    (material) =>
      material.name.toLowerCase().includes(search.toLowerCase()) ||
      material.sku.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Bahan Baku</h1>
          <p className="text-muted-foreground">Kelola bahan baku untuk produksi</p>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput />
          {canCreate && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Bahan
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Bahan Baku Baru</DialogTitle>
                </DialogHeader>
                <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama *</Label>
                    <Input id="name" {...form.register("name")} placeholder="cth., Tepung Terigu" />
                    {form.formState.errors.name && (
                      <p className="text-sm text-destructive">
                        {form.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU *</Label>
                      <Input id="sku" {...form.register("sku")} placeholder="cth., RM-001" />
                      {form.formState.errors.sku && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.sku.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit">Satuan *</Label>
                      <Input
                        id="unit"
                        {...form.register("unit")}
                        placeholder="cth., kg, gr, liter"
                      />
                      {form.formState.errors.unit && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.unit.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="minStock">Stok Minimum *</Label>
                      <Input
                        id="minStock"
                        type="number"
                        step="0.01"
                        {...form.register("minStock")}
                        placeholder="0"
                      />
                      {form.formState.errors.minStock && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.minStock.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="price">Harga (opsional)</Label>
                      <Input
                        id="price"
                        type="number"
                        step="0.01"
                        {...form.register("price")}
                        placeholder="0"
                      />
                      {form.formState.errors.price && (
                        <p className="text-sm text-destructive">
                          {form.formState.errors.price.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <Button type="submit" className="w-full">
                    Buat Bahan Baku
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead className="text-right">Stok Saat Ini</TableHead>
              <TableHead className="text-right">Stok Minimum</TableHead>
              {canViewPrice && <TableHead className="text-right">Harga</TableHead>}
              <TableHead>Status</TableHead>
              {canDelete && <TableHead className="w-[50px]"></TableHead>}
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredMaterials?.map((material) => (
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
                      Stok Rendah
                    </Badge>
                  ) : (
                    <Badge variant="secondary">Tersedia</Badge>
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
                <TableCell
                  colSpan={canViewPrice && canDelete ? 8 : canViewPrice || canDelete ? 7 : 6}
                  className="text-center text-muted-foreground"
                >
                  Belum ada bahan baku. Buat yang baru untuk memulai.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function RawMaterialsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <RawMaterialsContent />
    </Suspense>
  );
}
