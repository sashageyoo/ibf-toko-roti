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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Plus,
  Package,
  AlertTriangle,
  ChevronDown,
  ChevronRight,
  Clock,
  Trash2,
} from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { hasPermission } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";

// QC Status color mapping
const qcStatusColors: Record<string, string> = {
  pending: "bg-yellow-100 text-yellow-800 border-yellow-300",
  release: "bg-green-100 text-green-800 border-green-300",
  hold: "bg-orange-100 text-orange-800 border-orange-300",
  reject: "bg-red-100 text-red-800 border-red-300",
  expired: "bg-red-200 text-red-900 border-red-400",
};

// QC Status labels in Indonesian
const qcStatusLabels: Record<string, string> = {
  pending: "PENDING",
  release: "RILIS",
  hold: "TAHAN",
  reject: "TOLAK",
  expired: "KEDALUWARSA",
};

// Format date for display
function formatDate(timestamp: number): string {
  return new Date(timestamp).toLocaleDateString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

// Check if a batch is expired
function isExpired(expiryDate: number): boolean {
  return expiryDate < Date.now();
}

function InventoryContent() {
  const { user } = useAuth();
  const role = user?.role as UserRole | undefined;

  const canReceive = hasPermission(role, "batches:receive");
  const canQc = role === "admin" || role === "qc" || role === "manager_inventaris";

  const materials = useQuery(api.rawMaterials.list);
  const suppliers = useQuery(api.suppliers.list);
  const batches = useQuery(api.batches.listAll);
  const receiveStock = useMutation(api.batches.receiveStock);
  const markAsExpired = useMutation(api.batches.markAsExpired);
  const approveDisposal = useMutation(api.batches.approveExpiredDisposal);

  const [open, setOpen] = useState(false);
  const [expandedMaterials, setExpandedMaterials] = useState<Set<string>>(new Set());
  const [selectedMaterial, setSelectedMaterial] = useState<string>("");
  const [batchNumber, setBatchNumber] = useState("");
  const [quantity, setQuantity] = useState("");
  const [expiryDate, setExpiryDate] = useState("");
  const [supplierId, setSupplierId] = useState<string>("");

  const [search] = useQueryState("q", { defaultValue: "" });

  // Group batches by material
  const batchesByMaterial =
    batches?.reduce(
      (acc, batch) => {
        const key = batch.materialId;
        if (!acc[key]) acc[key] = [];
        acc[key].push(batch);
        return acc;
      },
      {} as Record<string, typeof batches>,
    ) ?? {};

  const toggleMaterialExpand = (materialId: string) => {
    setExpandedMaterials((prev) => {
      const next = new Set(prev);
      if (next.has(materialId)) {
        next.delete(materialId);
      } else {
        next.add(materialId);
      }
      return next;
    });
  };

  const handleReceiveStock = async () => {
    if (!selectedMaterial || !batchNumber || !quantity || !expiryDate) {
      toast.error("Mohon isi semua field yang wajib");
      return;
    }

    try {
      await receiveStock({
        materialId: selectedMaterial as Id<"rawMaterials">,
        supplierId: supplierId ? (supplierId as Id<"suppliers">) : undefined,
        batchNumber,
        quantity: Number.parseFloat(quantity),
        expiryDate: new Date(expiryDate).getTime(),
        userId: user?._id,
      });
      toast.success("Stok berhasil diterima (menunggu tinjauan QC)");
      setOpen(false);
      resetForm();
    } catch {
      toast.error("Gagal menerima stok");
    }
  };

  const handleMarkExpired = async (batchId: Id<"batches">) => {
    try {
      await markAsExpired({ id: batchId });
      toast.success("Batch ditandai kedaluwarsa");
    } catch {
      toast.error("Gagal menandai batch sebagai kedaluwarsa");
    }
  };

  const handleApproveDisposal = async (batchId: Id<"batches">) => {
    try {
      await approveDisposal({
        id: batchId,
        userId: user?._id,
        notes: "Persetujuan pembuangan batch kedaluwarsa",
      });
      toast.success("Batch dibuang dan dipindahkan ke catatan limbah");
    } catch {
      toast.error("Gagal membuang batch");
    }
  };

  const resetForm = () => {
    setSelectedMaterial("");
    setBatchNumber("");
    setQuantity("");
    setExpiryDate("");
    setSupplierId("");
  };

  // Count expired batches for a material
  const getExpiredCount = (materialId: string): number => {
    return (
      batchesByMaterial[materialId]?.filter(
        (b) => isExpired(b.expiryDate) && b.qcStatus !== "expired" && b.qcStatus !== "reject",
      ).length ?? 0
    );
  };

  // Render batch rows for a material
  const renderBatchRows = (materialId: string) => {
    const materialBatches = batchesByMaterial[materialId] ?? [];

    if (materialBatches.length === 0) {
      return (
        <TableRow className="bg-muted/30">
          <TableCell colSpan={6} className="text-center text-muted-foreground py-4">
            Tidak ada batch untuk bahan ini
          </TableCell>
        </TableRow>
      );
    }

    return materialBatches
      .sort((a, b) => a.expiryDate - b.expiryDate)
      .map((batch) => {
        const batchExpired = isExpired(batch.expiryDate) && batch.qcStatus !== "expired";
        const qcStatus = batch.qcStatus || "pending";

        return (
          <TableRow key={batch._id} className="bg-muted/30">
            <TableCell></TableCell>
            <TableCell colSpan={2} className="pl-8">
              <div className="flex items-center gap-3">
                <span className="font-mono text-sm">{batch.batchNumber}</span>
                <Badge variant="outline" className={qcStatusColors[qcStatus] || ""}>
                  {qcStatusLabels[qcStatus] || qcStatus.toUpperCase()}
                </Badge>
                {batchExpired && (
                  <Badge variant="destructive" className="gap-1">
                    <AlertTriangle className="h-3 w-3" />
                    KEDALUWARSA
                  </Badge>
                )}
              </div>
              {batch.supplierName && (
                <div className="text-xs text-muted-foreground mt-1">
                  Pemasok: {batch.supplierName}
                </div>
              )}
            </TableCell>
            <TableCell className="text-right">
              {batch.quantity} {batch.materialUnit}
            </TableCell>
            <TableCell className="text-right">
              <div className={batchExpired ? "text-red-600 font-medium" : ""}>
                Kedaluwarsa: {formatDate(batch.expiryDate)}
              </div>
            </TableCell>
            <TableCell>
              {canQc && batchExpired && qcStatus !== "expired" && (
                <Button size="sm" variant="outline" onClick={() => handleMarkExpired(batch._id)}>
                  Tandai Kedaluwarsa
                </Button>
              )}
              {canQc && qcStatus === "expired" && (
                <Button
                  size="sm"
                  variant="destructive"
                  onClick={() => handleApproveDisposal(batch._id)}
                  className="gap-1"
                >
                  <Trash2 className="h-3 w-3" />
                  Buang
                </Button>
              )}
            </TableCell>
          </TableRow>
        );
      });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Inventaris Bahan Baku</h1>
          <p className="text-muted-foreground">
            Kelola level stok dan terima inventaris baru. Klik baris untuk melihat batch.
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput />
          {canReceive && (
            <Dialog open={open} onOpenChange={setOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Terima Stok
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Terima Stok Baru</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 pt-4">
                  <div className="space-y-2">
                    <Label>Bahan Baku *</Label>
                    <Select value={selectedMaterial} onValueChange={setSelectedMaterial}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih bahan baku" />
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
                    <Label>Pemasok</Label>
                    <Select value={supplierId} onValueChange={setSupplierId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Pilih pemasok (opsional)" />
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
                    <Label>Nomor Batch *</Label>
                    <Input
                      value={batchNumber}
                      onChange={(e) => setBatchNumber(e.target.value)}
                      placeholder="cth., BATCH-2024-001"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label>Jumlah *</Label>
                      <Input
                        type="number"
                        step="0.01"
                        value={quantity}
                        onChange={(e) => setQuantity(e.target.value)}
                        placeholder="0"
                      />
                    </div>
                    <div className="space-y-2">
                      <Label>Tanggal Kedaluwarsa *</Label>
                      <Input
                        type="date"
                        value={expiryDate}
                        onChange={(e) => setExpiryDate(e.target.value)}
                      />
                    </div>
                  </div>
                  <Button onClick={handleReceiveStock} className="w-full">
                    Terima Stok
                  </Button>
                </div>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-8"></TableHead>
              <TableHead>Bahan</TableHead>
              <TableHead>SKU</TableHead>
              <TableHead className="text-right">Stok Saat Ini</TableHead>
              <TableHead className="text-right">Stok Minimum</TableHead>
              <TableHead>Status</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {materials
              ?.filter(
                (material) =>
                  material.name.toLowerCase().includes(search.toLowerCase()) ||
                  material.sku.toLowerCase().includes(search.toLowerCase()),
              )
              .map((material) => {
                const isExpanded = expandedMaterials.has(material._id);
                const expiredCount = getExpiredCount(material._id);

                return [
                  <TableRow
                    key={material._id}
                    className="cursor-pointer hover:bg-muted/50"
                    onClick={() => toggleMaterialExpand(material._id)}
                  >
                    <TableCell className="w-8">
                      {isExpanded ? (
                        <ChevronDown className="h-4 w-4" />
                      ) : (
                        <ChevronRight className="h-4 w-4" />
                      )}
                    </TableCell>
                    <TableCell className="font-medium">
                      <div className="flex items-center gap-2">
                        <Package className="h-4 w-4 text-muted-foreground" />
                        {material.name}
                        {expiredCount > 0 && (
                          <Badge variant="destructive" className="ml-2 gap-1">
                            <Clock className="h-3 w-3" />
                            {expiredCount} kedaluwarsa
                          </Badge>
                        )}
                      </div>
                    </TableCell>
                    <TableCell className="text-muted-foreground">{material.sku}</TableCell>
                    <TableCell className="text-right">
                      {material.totalStock} {material.unit}
                      {material.availableStock < material.totalStock && (
                        <div className="text-xs text-muted-foreground font-normal">
                          ({material.availableStock} tersedia)
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
                          Stok Rendah
                        </Badge>
                      ) : (
                        <Badge variant="secondary">Tersedia</Badge>
                      )}
                    </TableCell>
                  </TableRow>,
                  ...(isExpanded ? [renderBatchRows(material._id)] : []),
                ];
              })}
            {materials?.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground">
                  Belum ada bahan baku. Tambahkan bahan terlebih dahulu.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function InventoryPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <InventoryContent />
    </Suspense>
  );
}
