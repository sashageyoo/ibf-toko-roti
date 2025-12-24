"use client";

import { useState, Suspense } from "react";
import { useQuery, useMutation } from "convex/react";
import { useDebounce } from "@/hooks/use-debounce";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Play, XCircle, CheckCircle, AlertTriangle, Archive } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import { hasPermission } from "@/lib/permissions";
import type { UserRole } from "@/lib/permissions";

const planProductionSchema = z.object({
  bomId: z.string().min(1, "Resep wajib dipilih"),
  targetQuantity: z.coerce.number().min(1, "Target harus minimal 1"),
  startDate: z.string().min(1, "Tanggal mulai wajib diisi"),
  notes: z.string().optional(),
});

type PlanProductionFormValues = z.infer<typeof planProductionSchema>;

function ProductionContent() {
  const { user } = useAuth();
  const role = user?.role as UserRole | undefined;

  const canPlan = hasPermission(role, "production:plan");
  const canExecute = hasPermission(role, "production:execute");
  const canCancel = hasPermission(role, "production:cancel");
  const canInputResult = hasPermission(role, "production:input_result");

  const productionRuns = useQuery(api.production.list);
  const boms = useQuery(api.boms.list);

  const planProduction = useMutation(api.production.plan);
  const executeProduction = useMutation(api.production.execute);
  const cancelProduction = useMutation(api.production.cancel);
  const archiveCompleted = useMutation(api.production.archiveCompleted);

  const [planOpen, setPlanOpen] = useState(false);
  const [executeOpen, setExecuteOpen] = useState(false);
  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveDays, setArchiveDays] = useState("30");
  const [isArchiving, setIsArchiving] = useState(false);
  const [selectedRunId, setSelectedRunId] = useState<Id<"productionRuns"> | null>(null);

  const [search] = useQueryState("q", { defaultValue: "" });

  const planForm = useForm<PlanProductionFormValues>({
    resolver: zodResolver(planProductionSchema),
    defaultValues: {
      bomId: "",
      targetQuantity: 0,
      startDate: "",
      notes: "",
    },
  });

  const watchedTargetQty = planForm.watch("targetQuantity");
  const watchedBomId = planForm.watch("bomId");
  const debouncedTargetQty = useDebounce(watchedTargetQty?.toString() || "", 500);

  // Execute form
  const [producedQty, setProducedQty] = useState("");
  const [rejectedQty, setRejectedQty] = useState("");
  const [executeNotes, setExecuteNotes] = useState("");

  // MRP Check
  const requirements = useQuery(
    api.boms.calculateRequirements,
    watchedBomId && debouncedTargetQty
      ? {
        bomId: watchedBomId as Id<"boms">,
        targetQuantity: Number.parseFloat(debouncedTargetQty) || 0,
      }
      : "skip",
  );

  const selectedRun = productionRuns?.find((r) => r._id === selectedRunId);

  const handlePlan = async (data: PlanProductionFormValues) => {
    // Check for shortages
    const hasShortage = requirements?.some((r) => r?.isShortage);
    if (hasShortage) {
      if (!confirm("Ada kekurangan bahan. Lanjutkan?")) return;
    }

    try {
      await planProduction({
        bomId: data.bomId as Id<"boms">,
        targetQuantity: Number(data.targetQuantity),
        startDate: new Date(data.startDate).getTime(),
        notes: data.notes || undefined,
      });
      toast.success("Produksi direncanakan");
      setPlanOpen(false);
      planForm.reset();
    } catch {
      toast.error("Gagal merencanakan produksi");
    }
  };

  const handleExecute = async () => {
    if (!selectedRunId || !producedQty) {
      toast.error("Mohon masukkan jumlah yang diproduksi");
      return;
    }

    try {
      await executeProduction({
        id: selectedRunId,
        producedQuantity: Number.parseFloat(producedQty),
        rejectedQuantity: Number.parseFloat(rejectedQty) || 0,
        notes: executeNotes || undefined,
      });
      toast.success("Produksi selesai");
      setExecuteOpen(false);
      resetExecuteForm();
    } catch (error: any) {
      toast.error(error.message || "Gagal mengeksekusi produksi");
    }
  };

  const handleCancel = async (id: Id<"productionRuns">) => {
    if (!confirm("Batalkan produksi ini?")) return;
    try {
      await cancelProduction({ id });
      toast.success("Produksi dibatalkan");
    } catch {
      toast.error("Gagal membatalkan produksi");
    }
  };

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      const result = await archiveCompleted({ olderThanDays: Number.parseInt(archiveDays) });
      toast.success(`Mengarsipkan ${result.archivedCount} catatan produksi`);
      setArchiveOpen(false);
    } catch {
      toast.error("Gagal mengarsipkan produksi");
    } finally {
      setIsArchiving(false);
    }
  };

  const openExecute = (run: typeof selectedRun) => {
    if (!run) return;
    setSelectedRunId(run._id);
    setProducedQty(run.targetQuantity.toString());
    setRejectedQty("0");
    setExecuteNotes(run.notes || "");
    setExecuteOpen(true);
  };

  const resetExecuteForm = () => {
    setSelectedRunId(null);
    setProducedQty("");
    setRejectedQty("");
    setExecuteNotes("");
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "planned":
        return <Badge variant="secondary">Direncanakan</Badge>;
      case "completed":
        return <Badge className="bg-green-500 hover:bg-green-600">Selesai</Badge>;
      case "cancelled":
        return <Badge variant="destructive">Dibatalkan</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Produksi</h1>
          <p className="text-muted-foreground">
            Rencanakan dan eksekusi produksi dengan pengurangan bahan otomatis
          </p>
        </div>
        <div className="flex gap-2">
          <SearchInput />
          {role === "admin" && (
            <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Archive className="mr-2 h-4 w-4" />
                  Arsipkan Selesai
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Arsipkan Produksi Selesai</DialogTitle>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <p className="text-sm text-muted-foreground">
                    Arsipkan produksi lama yang sudah selesai untuk menjaga daftar tetap bersih.
                    Catatan yang diarsipkan disembunyikan tapi tidak dihapus.
                  </p>
                  <div className="space-y-2">
                    <Label>Arsipkan produksi selesai lebih dari (hari lalu)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={archiveDays}
                      onChange={(e) => setArchiveDays(e.target.value)}
                      placeholder="30"
                    />
                    <p className="text-xs text-muted-foreground">
                      Atur ke 0 untuk mengarsipkan semua produksi selesai
                    </p>
                  </div>
                  <div className="flex gap-2 justify-end">
                    <Button variant="outline" onClick={() => setArchiveOpen(false)}>
                      Batal
                    </Button>
                    <Button onClick={handleArchive} disabled={isArchiving}>
                      {isArchiving ? "Mengarsipkan..." : "Arsipkan Catatan"}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          )}
          {canPlan && (
            <Dialog open={planOpen} onOpenChange={setPlanOpen}>
              <DialogTrigger asChild>
                <Button>
                  <Plus className="mr-2 h-4 w-4" />
                  Rencanakan Produksi
                </Button>
              </DialogTrigger>
              <DialogContent className="max-w-2xl">
                <DialogHeader>
                  <DialogTitle>Rencanakan Produksi</DialogTitle>
                </DialogHeader>
                <form onSubmit={planForm.handleSubmit(handlePlan)} className="space-y-4 pt-4">
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <Label htmlFor="bomId">Resep *</Label>
                      <Select
                        onValueChange={(value) => planForm.setValue("bomId", value)}
                        defaultValue={planForm.getValues("bomId")}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Pilih resep" />
                        </SelectTrigger>
                        <SelectContent>
                          {boms?.map((bom) => (
                            <SelectItem key={bom._id} value={bom._id}>
                              {bom.name} - {bom.productName}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {planForm.formState.errors.bomId && (
                        <p className="text-sm text-destructive">
                          {planForm.formState.errors.bomId.message}
                        </p>
                      )}
                    </div>
                    <div className="space-y-2">
                      <Label htmlFor="targetQuantity">Target Jumlah *</Label>
                      <Input
                        id="targetQuantity"
                        type="number"
                        {...planForm.register("targetQuantity")}
                        placeholder="e.g., 100"
                      />
                      {planForm.formState.errors.targetQuantity && (
                        <p className="text-sm text-destructive">
                          {planForm.formState.errors.targetQuantity.message}
                        </p>
                      )}
                    </div>
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="startDate">Tanggal Mulai *</Label>
                    <Input id="startDate" type="date" {...planForm.register("startDate")} />
                    {planForm.formState.errors.startDate && (
                      <p className="text-sm text-destructive">
                        {planForm.formState.errors.startDate.message}
                      </p>
                    )}
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="notes">Catatan</Label>
                    <Textarea
                      id="notes"
                      {...planForm.register("notes")}
                      placeholder="Catatan produksi..."
                    />
                  </div>

                  {/* MRP Check */}
                  {requirements && requirements.length > 0 && (
                    <Card>
                      <CardHeader className="pb-3">
                        <CardTitle className="text-sm">Cek Kebutuhan Bahan</CardTitle>
                      </CardHeader>
                      <CardContent>
                        <div className="space-y-2">
                          {requirements.map(
                            (req) =>
                              req && (
                                <div
                                  key={req.materialId}
                                  className="flex items-center justify-between text-sm"
                                >
                                  <span>{req.materialName}</span>
                                  <div className="flex items-center gap-2">
                                    <span className="text-muted-foreground">
                                      Butuh: {req.requiredAmount.toFixed(2)} {req.materialUnit}
                                    </span>
                                    <span className="text-muted-foreground">|</span>
                                    <span className="text-muted-foreground">
                                      Punya: {req.currentStock.toFixed(2)}
                                    </span>
                                    {req.isShortage ? (
                                      <Badge variant="destructive" className="gap-1">
                                        <AlertTriangle className="h-3 w-3" />-
                                        {req.shortageAmount.toFixed(2)}
                                      </Badge>
                                    ) : (
                                      <Badge variant="secondary" className="gap-1">
                                        <CheckCircle className="h-3 w-3" />
                                        OK
                                      </Badge>
                                    )}
                                  </div>
                                </div>
                              ),
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  )}

                  <Button type="submit" className="w-full">
                    Rencanakan Produksi
                  </Button>
                </form>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      {/* Execute Dialog */}
      <Dialog open={executeOpen} onOpenChange={setExecuteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Eksekusi Produksi</DialogTitle>
          </DialogHeader>
          {selectedRun && (
            <div className="space-y-4 pt-4">
              <div className="rounded-lg border p-4 space-y-2">
                <p className="font-medium">{selectedRun.productName}</p>
                <p className="text-sm text-muted-foreground">Resep: {selectedRun.bomName}</p>
                <p className="text-sm text-muted-foreground">
                  Target: {selectedRun.targetQuantity} unit
                </p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Jumlah Bagus *</Label>
                  <Input
                    type="number"
                    value={producedQty}
                    onChange={(e) => setProducedQty(e.target.value)}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Jumlah Ditolak</Label>
                  <Input
                    type="number"
                    value={rejectedQty}
                    onChange={(e) => setRejectedQty(e.target.value)}
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label>Catatan QC</Label>
                <Textarea
                  value={executeNotes}
                  onChange={(e) => setExecuteNotes(e.target.value)}
                  placeholder="cth., Suhu adonan 28°C, Waktu mix 12menit"
                />
              </div>
              <Button onClick={handleExecute} className="w-full">
                <CheckCircle className="mr-2 h-4 w-4" />
                Selesaikan Produksi
              </Button>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Production Runs Table */}
      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Produk</TableHead>
              <TableHead>Resep</TableHead>
              <TableHead className="text-right">Target</TableHead>
              <TableHead className="text-right">Diproduksi</TableHead>
              <TableHead className="text-right">Ditolak</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Tanggal</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productionRuns
              ?.filter(
                (run) =>
                  run.productName.toLowerCase().includes(search.toLowerCase()) ||
                  run.status.includes(search.toLowerCase()),
              )
              .map((run) => (
                <TableRow key={run._id}>
                  <TableCell className="font-medium">{run.productName}</TableCell>
                  <TableCell className="text-muted-foreground">{run.bomName}</TableCell>
                  <TableCell className="text-right">{run.targetQuantity}</TableCell>
                  <TableCell className="text-right">{run.producedQuantity ?? "-"}</TableCell>
                  <TableCell className="text-right">{run.rejectedQuantity ?? "-"}</TableCell>
                  <TableCell>{getStatusBadge(run.status)}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(run.startDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    {run.status === "planned" && (
                      <div className="flex gap-1">
                        {(canExecute || canInputResult) && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => openExecute(run)}
                            title="Execute"
                          >
                            <Play className="h-4 w-4" />
                          </Button>
                        )}
                        {canCancel && (
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleCancel(run._id)}
                            title="Cancel"
                          >
                            <XCircle className="h-4 w-4" />
                          </Button>
                        )}
                      </div>
                    )}
                  </TableCell>
                </TableRow>
              ))}
            {productionRuns?.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="text-center text-muted-foreground">
                  Belum ada produksi. Rencanakan satu untuk memulai.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}

export default function ProductionPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <ProductionContent />
    </Suspense>
  );
}
