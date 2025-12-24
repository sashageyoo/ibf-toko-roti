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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, Boxes, AlertTriangle, Minus, ChevronRight, ChevronDown } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { hasPermission } from "@/lib/permissions";

import type { UserRole } from "@/lib/permissions";

// Helper to format date
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Helper to calculate remaining days
function calculateRemainingDays(expiryDate: number): number {
  const now = Date.now();
  const diff = expiryDate - now;
  return Math.ceil(diff / (1000 * 60 * 60 * 24));
}

const createProductSchema = z.object({
  name: z.string().min(1, "Nama wajib diisi"),
  sku: z.string().min(1, "SKU wajib diisi"),
  unit: z.string().min(1, "Satuan wajib diisi"),
  minStock: z.coerce.number().min(0, "Stok minimum harus angka positif"),
  price: z.coerce.number().min(0, "Harga harus angka positif").optional().or(z.literal("")),
  shelfLifeDays: z.coerce.number().int().min(1, "Masa simpan minimal 1 hari").default(3),
});

const deductStockSchema = z.object({
  quantity: z.coerce.number().min(1, "Jumlah minimal 1"),
});

type CreateProductFormValues = z.infer<typeof createProductSchema>;
type DeductStockFormValues = z.infer<typeof deductStockSchema>;

function FinishedProductsContent() {
  const { user } = useAuth();
  const role = user?.role as UserRole | undefined;

  const canCreate = hasPermission(role, "items:create");
  const canDelete = hasPermission(role, "items:delete");
  const canViewPrice = hasPermission(role, "items:view_price");
  const isAdmin = role === "admin";

  const products = useQuery(api.finishedProducts.list);
  const stockEntries = useQuery(api.finishedProducts.getAllStockEntries);
  const createProduct = useMutation(api.finishedProducts.create);
  const deleteProduct = useMutation(api.finishedProducts.remove);
  const deductStock = useMutation(api.finishedProducts.deductStock);

  const [createOpen, setCreateOpen] = useState(false);
  const [deductOpen, setDeductOpen] = useState(false);
  const [selectedProductId, setSelectedProductId] = useState<Id<"finishedProducts"> | null>(null);
  const [expandedProducts, setExpandedProducts] = useState<Set<string>>(new Set());

  const [search] = useQueryState("q", { defaultValue: "" });

  const createForm = useForm<CreateProductFormValues>({
    resolver: zodResolver(createProductSchema),
    defaultValues: {
      name: "",
      sku: "",
      unit: "",
      minStock: 0,
      price: undefined,
      shelfLifeDays: 3,
    },
  });

  const deductForm = useForm<DeductStockFormValues>({
    resolver: zodResolver(deductStockSchema),
    defaultValues: {
      quantity: 0,
    },
  });

  const selectedProduct = products?.find((p) => p._id === selectedProductId);

  const handleCreate = async (data: CreateProductFormValues) => {
    try {
      await createProduct({
        name: data.name,
        sku: data.sku,
        unit: data.unit,
        minStock: Number(data.minStock),
        price: data.price ? Number(data.price) : undefined,
        shelfLifeDays: Number(data.shelfLifeDays),
      });
      toast.success("Produk jadi berhasil dibuat");
      setCreateOpen(false);
      createForm.reset();
    } catch (error: any) {
      toast.error(error.message || "Gagal membuat produk jadi");
    }
  };

  const handleDelete = async (id: Id<"finishedProducts">) => {
    if (!confirm("Yakin ingin menghapus produk jadi ini?")) return;
    try {
      await deleteProduct({ id });
      toast.success("Produk jadi dihapus");
    } catch (error: any) {
      toast.error(error.message || "Gagal menghapus produk jadi");
    }
  };

  const handleDeduct = async (data: DeductStockFormValues) => {
    if (!selectedProductId) return;

    try {
      await deductStock({
        productId: selectedProductId,
        quantity: Number(data.quantity),
      });
      toast.success("Stok berhasil dikurangi (FEFO diterapkan)");
      setDeductOpen(false);
      deductForm.reset();
      setSelectedProductId(null);
    } catch (error: any) {
      toast.error(error.message || "Gagal mengurangi stok");
    }
  };

  const openDeductDialog = (productId: Id<"finishedProducts">) => {
    setSelectedProductId(productId);
    deductForm.reset({ quantity: 0 });
    setDeductOpen(true);
  };

  const toggleProductExpand = (productId: string) => {
    setExpandedProducts((prev) => {
      const next = new Set(prev);
      if (next.has(productId)) {
        next.delete(productId);
      } else {
        next.add(productId);
      }
      return next;
    });
  };

  // Group stock entries by product
  const stockByProduct =
    stockEntries?.reduce(
      (acc, entry) => {
        const key = entry.productId;
        if (!acc[key]) acc[key] = [];
        acc[key].push(entry);
        return acc;
      },
      {} as Record<string, typeof stockEntries>,
    ) ?? {};

  const renderBatchRows = (productId: string) => {
    const entries = stockByProduct[productId];
    if (!entries || entries.length === 0) {
      return (
        <TableRow className="bg-muted/30 hover:bg-muted/30">
          <TableCell
            colSpan={canViewPrice ? 11 : 10}
            className="text-center text-muted-foreground py-4"
          >
            Tidak ada stok batch
          </TableCell>
        </TableRow>
      );
    }

    return entries
      .sort((a, b) => a.expiryDate - b.expiryDate)
      .map((entry) => {
        const remainingDays = calculateRemainingDays(entry.expiryDate);
        const isExpired = remainingDays < 0;
        const isLowShelfLife = remainingDays <= 3 && !isExpired;

        return (
          <TableRow key={entry._id} className="bg-muted/30 hover:bg-muted/30">
            <TableCell></TableCell>
            <TableCell colSpan={2} className="pl-10">
              <span className="text-sm font-mono text-muted-foreground">
                Produksi: {formatDate(entry.producedDate)}
              </span>
            </TableCell>
            <TableCell className="text-right font-medium">{entry.quantity}</TableCell>
            <TableCell colSpan={2} className="text-right">
              <div className="flex items-center justify-end gap-2">
                {isExpired ? (
                  <Badge variant="destructive" className="h-5 text-[10px] px-1 gap-1">
                    Expired
                  </Badge>
                ) : isLowShelfLife ? (
                  <Badge
                    variant="outline"
                    className="h-5 text-[10px] px-1 gap-1 text-orange-600 border-orange-600"
                  >
                    <AlertTriangle className="h-3 w-3" />
                    Segera Exp
                  </Badge>
                ) : null}
                <span
                  className={
                    isExpired ? "text-destructive" : isLowShelfLife ? "text-orange-600" : ""
                  }
                >
                  {formatDate(entry.expiryDate)}
                </span>
              </div>
            </TableCell>
            <TableCell>
              <span
                className={
                  isExpired
                    ? "text-destructive font-bold"
                    : isLowShelfLife
                      ? "text-orange-600 font-medium"
                      : "text-muted-foreground"
                }
              >
                {remainingDays} hari
              </span>
            </TableCell>
            <TableCell colSpan={canViewPrice ? 3 : 2}></TableCell>
          </TableRow>
        );
      });
  };

  const filteredProducts = products?.filter(
    (product) =>
      product.name.toLowerCase().includes(search.toLowerCase()) ||
      product.sku.toLowerCase().includes(search.toLowerCase()),
  );

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produk Jadi</h1>
          <p className="text-muted-foreground">Kelola produk jadi dan level stok</p>
        </div>

        <div className="flex items-center gap-2">
          <SearchInput />
          {canCreate && (
            <Dialog open={createOpen} onOpenChange={setCreateOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Tambah Produk
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Tambah Produk Jadi Baru</DialogTitle>
                </DialogHeader>
                <form onSubmit={createForm.handleSubmit(handleCreate)} className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label htmlFor="name">Nama *</Label>
                    <Input
                      id="name"
                      {...createForm.register("name")}
                      placeholder="cth., Roti Tawar"
                    />
                    {createForm.formState.errors.name && (
                      <p className="text-sm text-destructive">
                        {createForm.formState.errors.name.message}
                      </p>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="sku">SKU *</Label>
                      <Input id="sku" {...createForm.register("sku")} placeholder="cth., FG-001" />
                      {createForm.formState.errors.sku && (
                        <p className="text-sm text-destructive">
                          {createForm.formState.errors.sku.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="unit">Satuan *</Label>
                      <Input
                        id="unit"
                        {...createForm.register("unit")}
                        placeholder="cth., pcs, loaf"
                      />
                      {createForm.formState.errors.unit && (
                        <p className="text-sm text-destructive">
                          {createForm.formState.errors.unit.message}
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
                        step="1"
                        {...createForm.register("minStock")}
                        placeholder="0"
                      />
                      {createForm.formState.errors.minStock && (
                        <p className="text-sm text-destructive">
                          {createForm.formState.errors.minStock.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="shelfLifeDays">Masa Simpan (hari)</Label>
                      <Input
                        id="shelfLifeDays"
                        type="number"
                        step="1"
                        {...createForm.register("shelfLifeDays")}
                        placeholder="3"
                      />
                      {createForm.formState.errors.shelfLifeDays && (
                        <p className="text-sm text-destructive">
                          {createForm.formState.errors.shelfLifeDays.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="price">Harga (opsional)</Label>
                    <Input
                      id="price"
                      type="number"
                      step="0.01"
                      {...createForm.register("price")}
                      placeholder="0"
                    />
                    {createForm.formState.errors.price && (
                      <p className="text-sm text-destructive">
                        {createForm.formState.errors.price.message}
                      </p>
                    )}
                  </div>
                  <Button type="submit" className="w-full">
                    Buat Produk Jadi
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>
      {/* Deduct Stock Dialog */}
      <Dialog open={deductOpen} onOpenChange={setDeductOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Kurangi Stok (Penjualan/Pengiriman)</DialogTitle>
          </DialogHeader>
          {selectedProduct && (
            <form onSubmit={deductForm.handleSubmit(handleDeduct)} className="space-y-4 pt-4">
              <Card>
                <CardHeader className="pb-2">
                  <CardTitle className="text-base">{selectedProduct.name}</CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Stok Saat Ini:{" "}
                    <span className="font-medium">
                      {selectedProduct.totalStock} {selectedProduct.unit}
                    </span>
                  </p>
                  <p className="text-xs text-muted-foreground mt-1">
                    FEFO akan diterapkan (stok terlama dikurangi terlebih dahulu)
                  </p>
                </CardContent>
              </Card>
              <div className="space-y-2">
                <Label htmlFor="deductQty">Jumlah yang Dikurangi *</Label>
                <Input
                  id="deductQty"
                  type="number"
                  step="1"
                  {...deductForm.register("quantity")}
                  placeholder="0"
                />
                {deductForm.formState.errors.quantity && (
                  <p className="text-sm text-destructive">
                    {deductForm.formState.errors.quantity.message}
                  </p>
                )}
              </div>
              <Button type="submit" className="w-full" variant="destructive">
                <Minus className="mr-2 h-4 w-4" />
                Kurangi Stok
              </Button>
            </form>
          )}
        </DialogContent>
      </Dialog>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Nama</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead>Satuan</TableHead>
              <TableHead className="text-right">Stok Saat Ini</TableHead>
              <TableHead className="text-right">Stok Minimum</TableHead>
              <TableHead className="text-right">Masa Simpan</TableHead>
              {canViewPrice && <TableHead className="text-right">Harga</TableHead>}
              <TableHead>Status</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredProducts?.map((product) => {
              const isExpanded = expandedProducts.has(product._id);
              return [
                <TableRow
                  key={product._id}
                  className="cursor-pointer hover:bg-muted/50 transition-colors"
                  onClick={() => toggleProductExpand(product._id)}
                >
                  <TableCell>
                    {isExpanded ? (
                      <ChevronDown className="h-4 w-4" />
                    ) : (
                      <ChevronRight className="h-4 w-4" />
                    )}
                  </TableCell>
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
                  <TableCell className="text-right">{product.shelfLifeDays || 3} hari</TableCell>
                  {canViewPrice && (
                    <TableCell className="text-right">
                      {product.price ? `Rp ${product.price.toLocaleString()}` : "-"}
                    </TableCell>
                  )}
                  <TableCell>
                    {product.isLowStock ? (
                      <Badge variant="destructive" className="gap-1">
                        <AlertTriangle className="h-3 w-3" />
                        Stok Rendah
                      </Badge>
                    ) : (
                      <Badge variant="secondary">Tersedia</Badge>
                    )}
                  </TableCell>
                  <TableCell onClick={(e) => e.stopPropagation()}>
                    <div className="flex gap-1">
                      {isAdmin && product.totalStock > 0 && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => openDeductDialog(product._id)}
                          title="Kurangi Stok"
                        >
                          <Minus className="h-4 w-4" />
                        </Button>
                      )}
                      {canDelete && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDelete(product._id)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      )}
                    </div>
                  </TableCell>
                </TableRow>,
                isExpanded && renderBatchRows(product._id),
              ];
            })}
            {products?.length === 0 && (
              <TableRow>
                <TableCell
                  colSpan={canViewPrice ? 11 : 10}
                  className="text-center text-muted-foreground"
                >
                  Belum ada produk jadi. Buat yang baru dan atur resep untuk memulai produksi.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function FinishedProductsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <FinishedProductsContent />
    </Suspense>
  );
}
