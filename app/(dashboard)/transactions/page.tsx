"use client";

import { useState, Suspense } from "react";
import { useQueryState } from "nuqs";
import { SearchInput } from "@/components/search-input";
import { useQuery, useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";
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
  DialogDescription,
  DialogFooter,
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
import { Archive, History, Package, Factory, Trash2, FileText } from "lucide-react";
import { toast } from "sonner";
import { useAuth } from "@/components/auth-provider";
import type { UserRole } from "@/lib/permissions";

// Transaction type labels and colors
const transactionTypes: Record<string, { label: string; color: string; icon: typeof Package }> = {
  batch_received: { label: "Stok Diterima", color: "bg-green-100 text-green-800", icon: Package },
  batch_used: { label: "Bahan Digunakan", color: "bg-blue-100 text-blue-800", icon: Factory },
  batch_expired_disposed: {
    label: "Kedaluwarsa Dibuang",
    color: "bg-red-100 text-red-800",
    icon: Trash2,
  },
  production_completed: {
    label: "Produksi Selesai",
    color: "bg-purple-100 text-purple-800",
    icon: FileText,
  },
};

// Format date for display
function formatDateTime(timestamp: number): string {
  return new Date(timestamp).toLocaleString("id-ID", {
    year: "numeric",
    month: "short",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  });
}

function TransactionsContent() {
  const { user } = useAuth();
  const role = user?.role as UserRole | undefined;

  const isAdmin = role === "admin";

  const transactions = useQuery(api.transactionLogs.list);
  const archiveTransactions = useMutation(api.transactionLogs.archive);

  const [archiveOpen, setArchiveOpen] = useState(false);
  const [archiveDays, setArchiveDays] = useState("30");
  const [filterType, setFilterType] = useState<string>("all");
  const [isArchiving, setIsArchiving] = useState(false);

  const [search] = useQueryState("q", { defaultValue: "" });

  // Filter transactions by type and search query
  const filteredTransactions =
    transactions?.filter((t) => {
      const matchesType = filterType === "all" || t.type === filterType;
      const matchesSearch =
        t.materialName?.toLowerCase().includes(search.toLowerCase()) ||
        t.batchNumber?.toLowerCase().includes(search.toLowerCase()) ||
        t.notes?.toLowerCase().includes(search.toLowerCase());
      return matchesType && matchesSearch;
    }) ?? [];

  const handleArchive = async () => {
    setIsArchiving(true);
    try {
      const result = await archiveTransactions({ olderThanDays: Number.parseInt(archiveDays) });
      toast.success(`${result.archivedCount} catatan transaksi diarsipkan`);
      setArchiveOpen(false);
    } catch {
      toast.error("Gagal mengarsipkan transaksi");
    } finally {
      setIsArchiving(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Riwayat Transaksi</h1>
          <p className="text-muted-foreground">
            Jejak audit untuk semua pergerakan inventaris dan aktivitas produksi
          </p>
        </div>
        <div className="flex gap-2">
          <SearchInput />
          <Select value={filterType} onValueChange={setFilterType}>
            <SelectTrigger className="w-[180px]">
              <SelectValue placeholder="Filter berdasarkan jenis" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Semua Transaksi</SelectItem>
              <SelectItem value="batch_received">Stok Diterima</SelectItem>
              <SelectItem value="batch_used">Bahan Digunakan</SelectItem>
              <SelectItem value="batch_expired_disposed">Kedaluwarsa Dibuang</SelectItem>
              <SelectItem value="production_completed">Produksi Selesai</SelectItem>
            </SelectContent>
          </Select>

          {isAdmin && (
            <Dialog open={archiveOpen} onOpenChange={setArchiveOpen}>
              <DialogTrigger asChild>
                <Button variant="outline">
                  <Archive className="mr-2 h-4 w-4" />
                  Arsipkan Catatan Lama
                </Button>
              </DialogTrigger>
              <DialogContent>
                <DialogHeader>
                  <DialogTitle>Arsipkan Catatan Transaksi</DialogTitle>
                  <DialogDescription>
                    Arsipkan catatan transaksi lama untuk menjaga database tetap optimal. Catatan
                    yang diarsipkan disembunyikan tapi tidak dihapus.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-4">
                  <div className="space-y-2">
                    <Label>Arsipkan catatan lebih lama dari (hari)</Label>
                    <Input
                      type="number"
                      min="0"
                      value={archiveDays}
                      onChange={(e) => setArchiveDays(e.target.value)}
                      placeholder="30"
                    />
                    <p className="text-xs text-muted-foreground">
                      Atur ke 0 untuk mengarsipkan semua catatan
                    </p>
                  </div>
                </div>
                <DialogFooter>
                  <Button variant="outline" onClick={() => setArchiveOpen(false)}>
                    Batal
                  </Button>
                  <Button onClick={handleArchive} disabled={isArchiving}>
                    {isArchiving ? "Mengarsipkan..." : "Arsipkan Catatan"}
                  </Button>
                </DialogFooter>
              </DialogContent>
            </Dialog>
          )}
        </div>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Tanggal & Waktu</TableHead>
              <TableHead>Jenis</TableHead>
              <TableHead>Bahan</TableHead>
              <TableHead>Batch</TableHead>
              <TableHead className="text-right">Jumlah</TableHead>
              <TableHead>Catatan</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {filteredTransactions.map((transaction) => {
              const typeInfo = transactionTypes[transaction.type] || {
                label: transaction.type,
                color: "bg-gray-100 text-gray-800",
                icon: History,
              };
              const Icon = typeInfo.icon;

              return (
                <TableRow key={transaction._id}>
                  <TableCell className="font-mono text-sm">
                    {formatDateTime(transaction.createdAt)}
                  </TableCell>
                  <TableCell>
                    <Badge variant="outline" className={`gap-1 ${typeInfo.color}`}>
                      <Icon className="h-3 w-3" />
                      {typeInfo.label}
                    </Badge>
                  </TableCell>
                  <TableCell>{transaction.materialName || "-"}</TableCell>
                  <TableCell className="font-mono text-sm">
                    {transaction.batchNumber || "-"}
                  </TableCell>
                  <TableCell className="text-right font-medium">{transaction.quantity}</TableCell>
                  <TableCell className="text-muted-foreground max-w-[200px] truncate">
                    {transaction.notes || "-"}
                  </TableCell>
                </TableRow>
              );
            })}
            {filteredTransactions.length === 0 && (
              <TableRow>
                <TableCell colSpan={6} className="text-center text-muted-foreground py-8">
                  <History className="h-8 w-8 mx-auto mb-2 opacity-50" />
                  Tidak ada catatan transaksi ditemukan
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {transactions && transactions.length > 0 && (
        <div className="text-sm text-muted-foreground text-center">
          Menampilkan {filteredTransactions.length} dari {transactions.length} catatan
        </div>
      )}
    </div>
  );
}

export default function TransactionsPage() {
  return (
    <Suspense fallback={<div>Loading...</div>}>
      <TransactionsContent />
    </Suspense>
  );
}
