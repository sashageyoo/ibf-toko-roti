"use client";

import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Button } from "@/components/ui/button";

import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CheckCircle, XCircle } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";

import type { UserRole } from "@/lib/permissions";

export default function QcPage() {
  const { user } = useAuth();
  const role = user?.role as UserRole | undefined;

  // Reuse existing permissions logic or add specific one if needed
  // Assuming QC role or Admin has access
  const canApprove = role === "admin" || role === "qc" || role === "manager_inventaris";

  const pendingBatches = useQuery(api.batches.listPendingQc);
  const setQcStatus = useMutation(api.batches.setQcStatus);

  const handleStatusChange = async (batchId: Id<"batches">, status: "release" | "reject") => {
    try {
      await setQcStatus({
        id: batchId,
        qcStatus: status,
      });
      toast.success(`Batch berhasil ${status === "release" ? "dirilis" : "ditolak"}`);
    } catch {
      toast.error("Gagal memperbarui status batch");
    }
  };

  if (!canApprove) {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <h1 className="text-2xl font-bold">Akses Ditolak</h1>
          <p className="text-muted-foreground">
            Anda tidak memiliki izin untuk mengakses kontrol QC.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Kontrol Kualitas</h1>
        <p className="text-muted-foreground">Tinjau dan setujui batch stok masuk</p>
      </div>

      <Card className="bg-background text-foreground">
        <CardHeader>
          <CardTitle className="text-foreground">Menunggu Tinjauan</CardTitle>
          <CardDescription className="text-foreground/70">
            Batch menunggu inspeksi kualitas
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nomor Batch</TableHead>
                <TableHead>Bahan</TableHead>
                <TableHead>Pemasok</TableHead>
                <TableHead className="text-right">Jumlah</TableHead>
                <TableHead>Tanggal Kedaluwarsa</TableHead>
                <TableHead>Tanggal Diterima</TableHead>
                <TableHead>Tindakan</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {pendingBatches?.map((batch) => (
                <TableRow key={batch._id}>
                  <TableCell className="font-medium">{batch.batchNumber}</TableCell>
                  <TableCell>
                    {batch.materialName}{" "}
                    <span className="text-muted-foreground">({batch.materialUnit})</span>
                  </TableCell>
                  <TableCell>{batch.supplierName || "-"}</TableCell>
                  <TableCell className="text-right">{batch.quantity}</TableCell>
                  <TableCell>{new Date(batch.expiryDate).toLocaleDateString()}</TableCell>
                  <TableCell className="text-muted-foreground">
                    {new Date(batch.receivedDate).toLocaleDateString()}
                  </TableCell>
                  <TableCell>
                    <div className="flex gap-2">
                      <Button
                        size="sm"
                        variant="default"
                        className="bg-green-600 hover:bg-green-700"
                        onClick={() => handleStatusChange(batch._id, "release")}
                      >
                        <CheckCircle className="mr-2 h-3 w-3" />
                        Setujui
                      </Button>
                      <Button
                        size="sm"
                        variant="destructive"
                        onClick={() => handleStatusChange(batch._id, "reject")}
                      >
                        <XCircle className="mr-2 h-3 w-3" />
                        Tolak
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {pendingBatches?.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                    <CheckCircle className="mx-auto h-8 w-8 mb-2 opacity-20" />
                    Tidak ada batch pending. Semua sudah ditinjau!
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}
