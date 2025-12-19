"use client"

import { useState } from "react"
import { useQuery, useMutation } from "convex/react"
import { useDebounce } from "@/hooks/use-debounce"
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
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Plus, Play, XCircle, CheckCircle, AlertTriangle } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth-provider"
import { hasPermission } from "@/lib/permissions"
import type { UserRole } from "@/lib/permissions"

export default function ProductionPage() {
  const { user } = useAuth()
  const role = user?.role as UserRole | undefined

  const canPlan = hasPermission(role, "production:plan")
  const canExecute = hasPermission(role, "production:execute")
  const canCancel = hasPermission(role, "production:cancel")
  const canInputResult = hasPermission(role, "production:input_result")
  const canSetQcStatus = hasPermission(role, "batches:set_qc_status")

  const productionRuns = useQuery(api.production.list)
  const boms = useQuery(api.boms.list)

  const planProduction = useMutation(api.production.plan)
  const executeProduction = useMutation(api.production.execute)
  const cancelProduction = useMutation(api.production.cancel)

  const [planOpen, setPlanOpen] = useState(false)
  const [executeOpen, setExecuteOpen] = useState(false)
  const [selectedRunId, setSelectedRunId] = useState<Id<"productionRuns"> | null>(null)

  // Plan form
  const [bomId, setBomId] = useState("")
  const [targetQty, setTargetQty] = useState("")
  const [startDate, setStartDate] = useState("")
  const [planNotes, setPlanNotes] = useState("")

  const debouncedTargetQty = useDebounce(targetQty, 500)

  // Execute form
  const [producedQty, setProducedQty] = useState("")
  const [rejectedQty, setRejectedQty] = useState("")
  const [executeNotes, setExecuteNotes] = useState("")

  // MRP Check
  const requirements = useQuery(
    api.boms.calculateRequirements,
    bomId && debouncedTargetQty ? { bomId: bomId as Id<"boms">, targetQuantity: Number.parseFloat(debouncedTargetQty) || 0 } : "skip",
  )

  const selectedRun = productionRuns?.find((r) => r._id === selectedRunId)

  const handlePlan = async () => {
    if (!bomId || !targetQty || !startDate) {
      toast.error("Please fill required fields")
      return
    }

    // Check for shortages
    const hasShortage = requirements?.some((r) => r?.isShortage)
    if (hasShortage) {
      if (!confirm("There are material shortages. Continue anyway?")) return
    }

    try {
      await planProduction({
        bomId: bomId as Id<"boms">,
        targetQuantity: Number.parseFloat(targetQty),
        startDate: new Date(startDate).getTime(),
        notes: planNotes || undefined,
      })
      toast.success("Production run planned")
      setPlanOpen(false)
      resetPlanForm()
    } catch (error) {
      toast.error("Failed to plan production")
    }
  }

  const handleExecute = async () => {
    if (!selectedRunId || !producedQty) {
      toast.error("Please enter produced quantity")
      return
    }

    try {
      await executeProduction({
        id: selectedRunId,
        producedQuantity: Number.parseFloat(producedQty),
        rejectedQuantity: Number.parseFloat(rejectedQty) || 0,
        notes: executeNotes || undefined,
      })
      toast.success("Production completed")
      setExecuteOpen(false)
      resetExecuteForm()
    } catch (error: any) {
      toast.error(error.message || "Failed to execute production")
    }
  }

  const handleCancel = async (id: Id<"productionRuns">) => {
    if (!confirm("Cancel this production run?")) return
    try {
      await cancelProduction({ id })
      toast.success("Production cancelled")
    } catch (error) {
      toast.error("Failed to cancel production")
    }
  }

  const openExecute = (run: typeof selectedRun) => {
    if (!run) return
    setSelectedRunId(run._id)
    setProducedQty(run.targetQuantity.toString())
    setRejectedQty("0")
    setExecuteNotes(run.notes || "")
    setExecuteOpen(true)
  }

  const resetPlanForm = () => {
    setBomId("")
    setTargetQty("")
    setStartDate("")
    setPlanNotes("")
  }

  const resetExecuteForm = () => {
    setSelectedRunId(null)
    setProducedQty("")
    setRejectedQty("")
    setExecuteNotes("")
  }

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "planned":
        return <Badge variant="secondary">Planned</Badge>
      case "completed":
        return <Badge className="bg-green-500 hover:bg-green-600">Completed</Badge>
      case "cancelled":
        return <Badge variant="destructive">Cancelled</Badge>
      default:
        return <Badge variant="outline">{status}</Badge>
    }
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold">Production</h1>
          <p className="text-muted-foreground">Plan and execute production runs with automatic material deduction</p>
        </div>
        {canPlan && (
          <Dialog open={planOpen} onOpenChange={setPlanOpen}>
            <DialogTrigger asChild>
              <Button>
                <Plus className="mr-2 h-4 w-4" />
                Plan Production
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl">
              <DialogHeader>
                <DialogTitle>Plan Production Run</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div className="space-y-2">
                    <Label>Recipe *</Label>
                    <Select value={bomId} onValueChange={setBomId}>
                      <SelectTrigger>
                        <SelectValue placeholder="Select recipe" />
                      </SelectTrigger>
                      <SelectContent>
                        {boms?.map((bom) => (
                          <SelectItem key={bom._id} value={bom._id}>
                            {bom.name} - {bom.productName}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  <div className="space-y-2">
                    <Label>Target Quantity *</Label>
                    <Input
                      type="number"
                      value={targetQty}
                      onChange={(e) => setTargetQty(e.target.value)}
                      placeholder="e.g., 100"
                    />
                  </div>
                </div>
                <div className="space-y-2">
                  <Label>Start Date *</Label>
                  <Input type="date" value={startDate} onChange={(e) => setStartDate(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Notes</Label>
                  <Textarea
                    value={planNotes}
                    onChange={(e) => setPlanNotes(e.target.value)}
                    placeholder="Production notes..."
                  />
                </div>

                {/* MRP Check */}
                {requirements && requirements.length > 0 && (
                  <Card>
                    <CardHeader className="pb-3">
                      <CardTitle className="text-sm">Material Requirements Check</CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {requirements.map(
                          (req) =>
                            req && (
                              <div key={req.materialId} className="flex items-center justify-between text-sm">
                                <span>{req.materialName}</span>
                                <div className="flex items-center gap-2">
                                  <span className="text-muted-foreground">
                                    Need: {req.requiredAmount.toFixed(2)} {req.materialUnit}
                                  </span>
                                  <span className="text-muted-foreground">|</span>
                                  <span className="text-muted-foreground">Have: {req.currentStock.toFixed(2)}</span>
                                  {req.isShortage ? (
                                    <Badge variant="destructive" className="gap-1">
                                      <AlertTriangle className="h-3 w-3" />-{req.shortageAmount.toFixed(2)}
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

                <Button onClick={handlePlan} className="w-full">
                  Plan Production
                </Button>
              </div>
            </DialogContent>
          </Dialog>
        )}
      </div>

      {/* Execute Dialog */}
      <Dialog open={executeOpen} onOpenChange={setExecuteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Execute Production</DialogTitle>
          </DialogHeader>
          {selectedRun && (
            <div className="space-y-4 pt-4">
              <div className="rounded-lg border p-4 space-y-2">
                <p className="font-medium">{selectedRun.productName}</p>
                <p className="text-sm text-muted-foreground">Recipe: {selectedRun.bomName}</p>
                <p className="text-sm text-muted-foreground">Target: {selectedRun.targetQuantity} units</p>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-2">
                  <Label>Good Quantity *</Label>
                  <Input type="number" value={producedQty} onChange={(e) => setProducedQty(e.target.value)} />
                </div>
                <div className="space-y-2">
                  <Label>Rejected Quantity</Label>
                  <Input type="number" value={rejectedQty} onChange={(e) => setRejectedQty(e.target.value)} />
                </div>
              </div>
              <div className="space-y-2">
                <Label>QC Notes</Label>
                <Textarea
                  value={executeNotes}
                  onChange={(e) => setExecuteNotes(e.target.value)}
                  placeholder="e.g., Dough temp 28°C, Mix time 12min"
                />
              </div>
              <Button onClick={handleExecute} className="w-full">
                <CheckCircle className="mr-2 h-4 w-4" />
                Complete Production
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
              <TableHead>Product</TableHead>
              <TableHead>Recipe</TableHead>
              <TableHead className="text-right">Target</TableHead>
              <TableHead className="text-right">Produced</TableHead>
              <TableHead className="text-right">Rejected</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Date</TableHead>
              <TableHead className="w-[100px]"></TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {productionRuns?.map((run) => (
              <TableRow key={run._id}>
                <TableCell className="font-medium">{run.productName}</TableCell>
                <TableCell className="text-muted-foreground">{run.bomName}</TableCell>
                <TableCell className="text-right">{run.targetQuantity}</TableCell>
                <TableCell className="text-right">{run.producedQuantity ?? "-"}</TableCell>
                <TableCell className="text-right">{run.rejectedQuantity ?? "-"}</TableCell>
                <TableCell>{getStatusBadge(run.status)}</TableCell>
                <TableCell className="text-muted-foreground">{new Date(run.startDate).toLocaleDateString()}</TableCell>
                <TableCell>
                  {run.status === "planned" && (
                    <div className="flex gap-1">
                      {(canExecute || canInputResult) && (
                        <Button variant="ghost" size="icon" onClick={() => openExecute(run)} title="Execute">
                          <Play className="h-4 w-4" />
                        </Button>
                      )}
                      {canCancel && (
                        <Button variant="ghost" size="icon" onClick={() => handleCancel(run._id)} title="Cancel">
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
                  No production runs. Plan one to get started.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
