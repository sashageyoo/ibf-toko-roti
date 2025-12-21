"use client";

import { useState } from "react";
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
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Plus, Trash2, BookOpen, ChevronRight } from "lucide-react";
import { toast } from "sonner";

export default function RecipesPage() {
  const boms = useQuery(api.boms.list);
  const finishedProducts = useQuery(api.finishedProducts.list);
  const rawMaterials = useQuery(api.rawMaterials.list);

  const createBom = useMutation(api.boms.create);
  const deleteBom = useMutation(api.boms.remove);
  const addIngredient = useMutation(api.boms.addIngredient);
  const removeIngredient = useMutation(api.boms.removeIngredient);

  const [createOpen, setCreateOpen] = useState(false);
  const [detailOpen, setDetailOpen] = useState(false);
  const [selectedBomId, setSelectedBomId] = useState<Id<"boms"> | null>(null);

  // Create form
  const [name, setName] = useState("");
  const [productId, setProductId] = useState("");
  const [description, setDescription] = useState("");

  const [search] = useQueryState("q", { defaultValue: "" });

  // Add ingredient form
  const [ingredientId, setIngredientId] = useState("");
  const [ingredientQty, setIngredientQty] = useState("");

  const selectedBom = useQuery(api.boms.get, selectedBomId ? { id: selectedBomId } : "skip");

  const handleCreateBom = async () => {
    if (!name || !productId) {
      toast.error("Mohon isi field yang wajib");
      return;
    }

    try {
      const newBomId = await createBom({
        name,
        productId: productId as Id<"finishedProducts">,
        description: description || undefined,
      });
      toast.success("Resep dibuat - sekarang tambahkan bahan!");
      setCreateOpen(false);
      setName("");
      setProductId("");
      setDescription("");
      // Auto-open the detail dialog to add ingredients
      setSelectedBomId(newBomId);
      setDetailOpen(true);
    } catch {
      toast.error("Gagal membuat resep");
    }
  };

  const handleDeleteBom = async (id: Id<"boms">) => {
    if (!confirm("Hapus resep ini dan semua bahannya?")) return;
    try {
      await deleteBom({ id });
      toast.success("Resep dihapus");
    } catch {
      toast.error("Gagal menghapus resep");
    }
  };

  const handleAddIngredient = async () => {
    if (!selectedBomId || !ingredientId || !ingredientQty) {
      toast.error("Mohon pilih bahan dan jumlah");
      return;
    }

    try {
      await addIngredient({
        bomId: selectedBomId,
        materialId: ingredientId as Id<"rawMaterials">,
        quantity: Number.parseFloat(ingredientQty),
      });
      toast.success("Bahan ditambahkan");
      setIngredientId("");
      setIngredientQty("");
    } catch {
      toast.error("Gagal menambahkan bahan");
    }
  };

  const handleRemoveIngredient = async (id: Id<"bomItems">) => {
    try {
      await removeIngredient({ id });
      toast.success("Bahan dihapus");
    } catch {
      toast.error("Gagal menghapus bahan");
    }
  };

  const openDetail = (bomId: Id<"boms">) => {
    setSelectedBomId(bomId);
    setDetailOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Resep (BOM)</h1>
          <p className="text-muted-foreground">
            Tentukan bahan yang dibutuhkan untuk setiap produk
          </p>
        </div>
        <div className="flex items-center gap-2">
          <SearchInput />
          <Dialog open={createOpen} onOpenChange={setCreateOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Buat Resep
              </Button>
            </DialogTrigger>
            <DialogContent>
              <DialogHeader>
                <DialogTitle>Buat Resep Baru</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="space-y-2">
                  <Label>Nama Resep *</Label>
                  <Input
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="cth., Adonan Roti Standar"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Produk Jadi *</Label>
                  <Select value={productId} onValueChange={setProductId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Pilih produk jadi" />
                    </SelectTrigger>
                    <SelectContent>
                      {finishedProducts?.map((product) => (
                        <SelectItem key={product._id} value={product._id}>
                          {product.name} ({product.sku})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="space-y-2">
                  <Label>Deskripsi</Label>
                  <Textarea
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="Catatan resep opsional"
                  />
                </div>
                <Button onClick={handleCreateBom} className="w-full">
                  Buat Resep
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Recipe Detail Dialog */}
      <Dialog open={detailOpen} onOpenChange={setDetailOpen}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle>{selectedBom?.name}</DialogTitle>
          </DialogHeader>
          {selectedBom && (
            <div className="space-y-6 pt-4">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <span>Produk: {selectedBom.productName}</span>
                <Badge variant="outline">{selectedBom.productSku}</Badge>
              </div>

              {selectedBom.description && (
                <p className="text-sm text-muted-foreground">{selectedBom.description}</p>
              )}

              <div className="space-y-4">
                <h4 className="font-medium">Bahan (per 1 unit)</h4>

                {/* Add ingredient form */}
                <div className="flex gap-2">
                  <Select value={ingredientId} onValueChange={setIngredientId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Pilih bahan baku" />
                    </SelectTrigger>
                    <SelectContent>
                      {rawMaterials?.map((material) => (
                        <SelectItem key={material._id} value={material._id}>
                          {material.name} ({material.unit})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                  <Input
                    type="number"
                    step="0.001"
                    value={ingredientQty}
                    onChange={(e) => setIngredientQty(e.target.value)}
                    placeholder="Qty"
                    className="w-24"
                  />
                  <Button onClick={handleAddIngredient}>
                    <Plus className="h-4 w-4" />
                  </Button>
                </div>

                {/* Ingredients list */}
                <div className="rounded-lg border">
                  <Table>
                    <TableHeader>
                      <TableRow>
                        <TableHead>Bahan</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Jumlah</TableHead>
                        <TableHead className="w-[50px]"></TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {selectedBom.ingredients.map((ing) => (
                        <TableRow key={ing._id}>
                          <TableCell className="font-medium">{ing.materialName}</TableCell>
                          <TableCell className="text-muted-foreground">{ing.materialSku}</TableCell>
                          <TableCell className="text-right">
                            {ing.quantity} {ing.materialUnit}
                          </TableCell>
                          <TableCell>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={() => handleRemoveIngredient(ing._id)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {selectedBom.ingredients.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            Belum ada bahan. Tambahkan di atas.
                          </TableCell>
                        </TableRow>
                      )}
                    </TableBody>
                  </Table>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>

      {/* Recipes List */}
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {boms
          ?.filter(
            (bom) =>
              bom.name.toLowerCase().includes(search.toLowerCase()) ||
              bom.productName?.toLowerCase().includes(search.toLowerCase()),
          )
          .map((bom) => (
            <Card
              key={bom._id}
              className="cursor-pointer hover:border-primary transition-colors"
              onClick={() => openDetail(bom._id)}
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between">
                  <CardTitle className="text-base">{bom.name}</CardTitle>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={(e) => {
                      e.stopPropagation();
                      void handleDeleteBom(bom._id);
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
                <CardDescription>{bom.productName}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex items-center justify-between text-sm">
                  <div className="flex items-center gap-2 text-muted-foreground">
                    <BookOpen className="h-4 w-4" />
                    {bom.ingredientCount} bahan
                  </div>
                  <ChevronRight className="h-4 w-4 text-muted-foreground" />
                </div>
              </CardContent>
            </Card>
          ))}
        {boms?.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              Belum ada resep. Buat yang baru untuk menentukan formula produkmu.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
}
