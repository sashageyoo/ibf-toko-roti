"use client";

import { useState } from "react";
import { useQuery } from "convex/react";
import { api } from "@/convex/_generated/api";
import type { Id } from "@/convex/_generated/dataModel";
import { useAuth } from "@/components/auth-provider";
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
import { Plus, Trash2, Shield, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

export default function UsersPage() {
  const { user: currentUser } = useAuth();
  const users = useQuery(api.users.list);

  const [open, setOpen] = useState(false);
  const [username, setUsername] = useState("");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [role, setRole] = useState<
    | "admin"
    | "manager_inventaris"
    | "operator_gudang"
    | "manager_produksi"
    | "operator_produksi"
    | "qc"
  >("operator_gudang");

  // Check if current user is admin
  if (currentUser && currentUser.role !== "admin") {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] space-y-4">
        <ShieldAlert className="h-16 w-16 text-muted-foreground" />
        <h1 className="text-2xl font-bold">Akses Ditolak</h1>
        <p className="text-muted-foreground">
          Hanya administrator yang dapat mengakses halaman ini.
        </p>
      </div>
    );
  }

  const handleCreate = async () => {
    if (!username || !name || !email || !password) {
      toast.error("Mohon isi semua kolom yang wajib");
      return;
    }

    try {
      // Hash password on client side before sending to API
      const res = await fetch("/api/auth/create-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, name, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        toast.error(data.error || "Gagal membuat pengguna");
        return;
      }

      toast.success("Pengguna berhasil dibuat");
      setOpen(false);
      resetForm();
    } catch {
      toast.error("Gagal membuat pengguna");
    }
  };

  const handleDelete = async (id: Id<"users">) => {
    if (id === currentUser?._id) {
      toast.error("Anda tidak dapat menghapus diri sendiri");
      return;
    }

    if (!confirm("Apakah Anda yakin ingin menghapus pengguna ini?")) return;

    try {
      const res = await fetch("/api/auth/delete-user", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });

      if (!res.ok) {
        toast.error("Gagal menghapus pengguna");
        return;
      }

      toast.success("Pengguna dihapus");
    } catch {
      toast.error("Gagal menghapus pengguna");
    }
  };

  const resetForm = () => {
    setUsername("");
    setName("");
    setEmail("");
    setPassword("");
    setRole("operator_gudang");
  };

  const roleColors: Record<string, string> = {
    admin: "bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300",
    manager_inventaris: "bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-300",
    operator_gudang: "bg-cyan-100 text-cyan-800 dark:bg-cyan-900 dark:text-cyan-300",
    manager_produksi: "bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300",
    operator_produksi: "bg-emerald-100 text-emerald-800 dark:bg-emerald-900 dark:text-emerald-300",
    qc: "bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-300",
  };

  const roleDisplayNames: Record<string, string> = {
    admin: "Administrator",
    manager_inventaris: "Manager Inventaris",
    operator_gudang: "Operator Gudang",
    manager_produksi: "Manager Produksi",
    operator_produksi: "Operator Produksi",
    qc: "Kontrol Kualitas",
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Pengguna</h1>
          <p className="text-muted-foreground">Kelola pengguna sistem dan peran mereka</p>
        </div>
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Tambah Pengguna
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Tambah Pengguna Baru</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Nama Pengguna *</Label>
                <Input
                  value={username}
                  onChange={(e) => setUsername(e.target.value)}
                  placeholder="cth., john.doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Nama Lengkap *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="cth., John Doe"
                />
              </div>
              <div className="space-y-2">
                <Label>Email *</Label>
                <Input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="cth., john@ibfbakery.com"
                />
              </div>
              <div className="space-y-2">
                <Label>Kata Sandi *</Label>
                <Input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Masukkan kata sandi"
                />
              </div>
              <div className="space-y-2">
                <Label>Peran *</Label>
                <Select value={role} onValueChange={(v) => setRole(v as any)}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="admin">Administrator</SelectItem>
                    <SelectItem value="manager_inventaris">Manager Inventaris</SelectItem>
                    <SelectItem value="operator_gudang">Operator Gudang</SelectItem>
                    <SelectItem value="manager_produksi">Manager Produksi</SelectItem>
                    <SelectItem value="operator_produksi">Operator Produksi</SelectItem>
                    <SelectItem value="qc">Kontrol Kualitas</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <Button onClick={handleCreate} className="w-full">
                Buat Pengguna
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>

      <div className="rounded-lg border">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Nama</TableHead>
              <TableHead>Nama Pengguna</TableHead>
              <TableHead>Email</TableHead>
              <TableHead>Peran</TableHead>
              <TableHead className="w-[50px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {users?.map((user) => (
              <TableRow key={user._id}>
                <TableCell className="font-medium">
                  <div className="flex items-center gap-2">
                    {user.role === "admin" && <Shield className="h-4 w-4 text-red-500" />}
                    {user.name}
                    {user._id === currentUser?._id && (
                      <Badge variant="outline" className="text-xs">
                        Anda
                      </Badge>
                    )}
                  </div>
                </TableCell>
                <TableCell className="text-muted-foreground">@{user.username}</TableCell>
                <TableCell className="text-muted-foreground">{user.email}</TableCell>
                <TableCell>
                  <Badge variant="outline" className={roleColors[user.role] || ""}>
                    {roleDisplayNames[user.role] || user.role}
                  </Badge>
                </TableCell>
                <TableCell>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(user._id)}
                    disabled={user._id === currentUser?._id}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </TableCell>
              </TableRow>
            ))}
            {users?.length === 0 && (
              <TableRow>
                <TableCell colSpan={5} className="text-center text-muted-foreground">
                  Tidak ada pengguna ditemukan.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  );
}
