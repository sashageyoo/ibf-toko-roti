"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Trash2, BookOpen, ChevronRight } from "lucide-react"
import { toast } from "sonner"

export default function RecipesPage() {
  const boms = useQuery(api.boms.list)
  const finishedProducts = useQuery(api.finishedProducts.list)
  const rawMaterials = useQuery(api.rawMaterials.list)

  const createBom = useMutation(api.boms.create)
  const deleteBom = useMutation(api.boms.remove)
  const addIngredient = useMutation(api.boms.addIngredient)
  const removeIngredient = useMutation(api.boms.removeIngredient)

  const [createOpen, setCreateOpen] = useState(false)
  const [detailOpen, setDetailOpen] = useState(false)
  const [selectedBomId, setSelectedBomId] = useState<Id<"boms"> | null>(null)

  // Create form
  const [name, setName] = useState("")
  const [productId, setProductId] = useState("")
  const [description, setDescription] = useState("")

  // Add ingredient form
  const [ingredientId, setIngredientId] = useState("")
  const [ingredientQty, setIngredientQty] = useState("")

  const selectedBom = useQuery(api.boms.get, selectedBomId ? { id: selectedBomId } : "skip")

  const handleCreateBom = async () => {
    if (!name || !productId) {
      toast.error("Please fill required fields")
      return
    }

    try {
      const newBomId = await createBom({
        name,
        productId: productId as Id<"finishedProducts">,
        description: description || undefined,
      })
      toast.success("Recipe created - now add ingredients!")
      setCreateOpen(false)
      setName("")
      setProductId("")
      setDescription("")
      // Auto-open the detail dialog to add ingredients
      setSelectedBomId(newBomId)
      setDetailOpen(true)
    } catch (error) {
      toast.error("Failed to create recipe")
    }
  }

  const handleDeleteBom = async (id: Id<"boms">) => {
    if (!confirm("Delete this recipe and all its ingredients?")) return
    try {
      await deleteBom({ id })
      toast.success("Recipe deleted")
    } catch (error) {
      toast.error("Failed to delete recipe")
    }
  }

  const handleAddIngredient = async () => {
    if (!selectedBomId || !ingredientId || !ingredientQty) {
      toast.error("Please select ingredient and quantity")
      return
    }

    try {
      await addIngredient({
        bomId: selectedBomId,
        materialId: ingredientId as Id<"rawMaterials">,
        quantity: Number.parseFloat(ingredientQty),
      })
      toast.success("Ingredient added")
      setIngredientId("")
      setIngredientQty("")
    } catch (error) {
      toast.error("Failed to add ingredient")
    }
  }

  const handleRemoveIngredient = async (id: Id<"bomItems">) => {
    try {
      await removeIngredient({ id })
      toast.success("Ingredient removed")
    } catch (error) {
      toast.error("Failed to remove ingredient")
    }
  }

  const openDetail = (bomId: Id<"boms">) => {
    setSelectedBomId(bomId)
    setDetailOpen(true)
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Recipes (BOM)</h1>
          <p className="text-muted-foreground">Define ingredients needed for each product</p>
        </div>
        <Dialog open={createOpen} onOpenChange={setCreateOpen}>
          <DialogTrigger asChild>
            <Button>
              <Plus className="mr-2 h-4 w-4" />
              Create Recipe
            </Button>
          </DialogTrigger>
          <DialogContent>
            <DialogHeader>
              <DialogTitle>Create New Recipe</DialogTitle>
            </DialogHeader>
            <div className="space-y-4 pt-4">
              <div className="space-y-2">
                <Label>Recipe Name *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Standard White Bread"
                />
              </div>
              <div className="space-y-2">
                <Label>Finished Product *</Label>
                <Select value={productId} onValueChange={setProductId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Select finished product" />
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
                <Label>Description</Label>
                <Textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Optional recipe notes"
                />
              </div>
              <Button onClick={handleCreateBom} className="w-full">
                Create Recipe
              </Button>
            </div>
          </DialogContent>
        </Dialog>
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
                <span>Product: {selectedBom.productName}</span>
                <Badge variant="outline">{selectedBom.productSku}</Badge>
              </div>

              {selectedBom.description && <p className="text-sm text-muted-foreground">{selectedBom.description}</p>}

              <div className="space-y-4">
                <h4 className="font-medium">Ingredients (per 1 unit)</h4>

                {/* Add ingredient form */}
                <div className="flex gap-2">
                  <Select value={ingredientId} onValueChange={setIngredientId}>
                    <SelectTrigger className="flex-1">
                      <SelectValue placeholder="Select raw material" />
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
                        <TableHead>Material</TableHead>
                        <TableHead>SKU</TableHead>
                        <TableHead className="text-right">Quantity</TableHead>
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
                            <Button variant="ghost" size="icon" onClick={() => handleRemoveIngredient(ing._id)}>
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </TableCell>
                        </TableRow>
                      ))}
                      {selectedBom.ingredients.length === 0 && (
                        <TableRow>
                          <TableCell colSpan={4} className="text-center text-muted-foreground">
                            No ingredients. Add some above.
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
        {boms?.map((bom) => (
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
                    e.stopPropagation()
                    handleDeleteBom(bom._id)
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
                  {bom.ingredientCount} ingredients
                </div>
                <ChevronRight className="h-4 w-4 text-muted-foreground" />
              </div>
            </CardContent>
          </Card>
        ))}
        {boms?.length === 0 && (
          <Card className="col-span-full">
            <CardContent className="py-8 text-center text-muted-foreground">
              No recipes yet. Create one to define your product formulas.
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  )
}
