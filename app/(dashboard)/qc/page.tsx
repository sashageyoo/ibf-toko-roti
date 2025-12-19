"use client"

import { useQuery, useMutation } from "convex/react"
import { api } from "@/convex/_generated/api"
import type { Id } from "@/convex/_generated/dataModel"
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table"
import { Button } from "@/components/ui/button"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { CheckCircle, XCircle } from "lucide-react"
import { toast } from "sonner"
import { useAuth } from "@/components/auth-provider"
import { hasPermission } from "@/lib/permissions"
import type { UserRole } from "@/lib/permissions"

export default function QcPage() {
    const { user } = useAuth()
    const role = user?.role as UserRole | undefined

    // Reuse existing permissions logic or add specific one if needed
    // Assuming QC role or Admin has access
    const canApprove = role === "admin" || role === "qc" || role === "manager_inventaris"

    const pendingBatches = useQuery(api.batches.listPendingQc)
    const setQcStatus = useMutation(api.batches.setQcStatus)

    const handleStatusChange = async (batchId: Id<"batches">, status: "release" | "reject") => {
        try {
            await setQcStatus({
                id: batchId,
                qcStatus: status,
            })
            toast.success(`Batch ${status === "release" ? "released" : "rejected"} successfully`)
        } catch (error) {
            toast.error("Failed to update batch status")
        }
    }

    if (!canApprove) {
        return (
            <div className="flex h-[50vh] items-center justify-center">
                <div className="text-center">
                    <h1 className="text-2xl font-bold">Access Denied</h1>
                    <p className="text-muted-foreground">You do not have permission to access QC controls.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="space-y-6">
            <div>
                <h1 className="text-2xl font-bold">Quality Control</h1>
                <p className="text-muted-foreground">Review and approve incoming stock batches</p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Pending Reviews</CardTitle>
                    <CardDescription>Batches waiting for quality inspection</CardDescription>
                </CardHeader>
                <CardContent>
                    <Table>
                        <TableHeader>
                            <TableRow>
                                <TableHead>Batch Number</TableHead>
                                <TableHead>Material</TableHead>
                                <TableHead>Supplier</TableHead>
                                <TableHead className="text-right">Quantity</TableHead>
                                <TableHead>Expiry Date</TableHead>
                                <TableHead>Received Date</TableHead>
                                <TableHead>Actions</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {pendingBatches?.map((batch) => (
                                <TableRow key={batch._id}>
                                    <TableCell className="font-medium">{batch.batchNumber}</TableCell>
                                    <TableCell>
                                        {batch.materialName} <span className="text-muted-foreground">({batch.materialUnit})</span>
                                    </TableCell>
                                    <TableCell>{batch.supplierName || "-"}</TableCell>
                                    <TableCell className="text-right">{batch.quantity}</TableCell>
                                    <TableCell>{new Date(batch.expiryDate).toLocaleDateString()}</TableCell>
                                    <TableCell className="text-muted-foreground">{new Date(batch.receivedDate).toLocaleDateString()}</TableCell>
                                    <TableCell>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="default"
                                                className="bg-green-600 hover:bg-green-700"
                                                onClick={() => handleStatusChange(batch._id, "release")}
                                            >
                                                <CheckCircle className="mr-2 h-3 w-3" />
                                                Approve
                                            </Button>
                                            <Button
                                                size="sm"
                                                variant="destructive"
                                                onClick={() => handleStatusChange(batch._id, "reject")}
                                            >
                                                <XCircle className="mr-2 h-3 w-3" />
                                                Reject
                                            </Button>
                                        </div>
                                    </TableCell>
                                </TableRow>
                            ))}
                            {pendingBatches?.length === 0 && (
                                <TableRow>
                                    <TableCell colSpan={7} className="text-center py-8 text-muted-foreground">
                                        <CheckCircle className="mx-auto h-8 w-8 mb-2 opacity-20" />
                                        No pending batches. All caught up!
                                    </TableCell>
                                </TableRow>
                            )}
                        </TableBody>
                    </Table>
                </CardContent>
            </Card>
        </div>
    )
}
