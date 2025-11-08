import { EmptyState } from "@/components/shared/empty-state";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { type SupplierData } from "@/routes/app.suppliers";
import { useRevalidator } from "@remix-run/react";
import { ChevronLeftIcon, ChevronRightIcon, EditIcon, MoreVerticalIcon, PackageIcon, TrashIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";
import SuppliersFormDialog from "./suppliers-form-dialog";
import useFilter from "@/hooks/use-filter";

interface SuppliersTableProps {
    data: SupplierData[];
    pagination: {
        page: number;
        perPage: number;
        totalItems: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    }
    onPageChange?: (page: number) => void;
}

export default function SuppliersTable({ data, pagination, onPageChange }: SuppliersTableProps) {
    const revalidator = useRevalidator();
    const { filter: filterData } = useFilter({
        path: "/app/dashboard",
    });
    const [isAddModalOpen, setIsAddModalOpen] = useState(false);
    const [isEditModalOpen, setIsEditModalOpen] = useState(false);
    const [editingSupplier, setEditingSupplier] = useState<SupplierData | null>(null);

    const currentPage = pagination.page;
    const itemsPerPage = pagination.perPage;
    const totalItems = pagination.totalItems;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    const formatDate = (date: Date) => {
        return new Intl.DateTimeFormat("en-US", {
            month: "short",
            day: "numeric",
            year: "numeric",
        }).format(date);
    };
    
    const handleDeleteSupplier = async (supplierId: number) => {
        try {
            await fetch(`/api/suppliers/${supplierId}`, {
                method: "DELETE",
            });
            toast.success("Supplier deleted successfully");
            await revalidator.revalidate();
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : "Failed to delete supplier");
        }
    };

    const openEditModal = (supplier: SupplierData) => {
        setEditingSupplier(supplier);
        setIsEditModalOpen(true);
    };

    const handleViewProducts = (supplierId: number) => {
        filterData({
            supplier: supplierId.toString(),
        })
    };

    return (
        <>
            <div className="max-w-7xl mx-auto! p-6">
                <Card className="shadow-md">
                    <CardHeader>
                        <CardTitle>All Suppliers ({totalItems})</CardTitle>
                    </CardHeader>
                    <CardContent className="p-0">
                        <div className="overflow-x-auto">
                            <Table>
                                <TableHeader>
                                    <TableRow className="bg-muted/50">
                                        <TableHead>Supplier Name</TableHead>
                                        <TableHead>Contact</TableHead>
                                        <TableHead>Lead Time</TableHead>
                                        <TableHead>Products Linked</TableHead>
                                        <TableHead>Last Restock</TableHead>
                                        <TableHead className="text-right">Actions</TableHead>
                                    </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {data.length === 0 ? (
                                        <TableRow>
                                            <TableCell colSpan={6} className="p-0">
                                                <div className="py-6!">
                                                    <EmptyState
                                                        type="suppliers"
                                                        onAction={() => setIsAddModalOpen(true)}
                                                    />
                                                </div>
                                            </TableCell>
                                        </TableRow>
                                    ) : (
                                        data.map((supplier) => (
                                            <TableRow key={supplier.id} className="hover:bg-muted/30 transition-colors">
                                                <TableCell>
                                                    <div className="font-medium!">{supplier.name}</div>
                                                    {supplier.notes && (
                                                        <div className="text-xs! text-muted-foreground mt-1! max-w-xs truncate">
                                                            {supplier.notes}
                                                        </div>
                                                    )}
                                                </TableCell>
                                                <TableCell>
                                                    <a
                                                        href={`mailto:${supplier.contactEmail}`}
                                                        className="text-primary hover:underline"
                                                    >
                                                        {supplier.contactEmail}
                                                    </a>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="font-semibold!">{supplier.leadTime}</span> days
                                                </TableCell>
                                                <TableCell>
                                                    <div className="flex items-center gap-2">
                                                        <PackageIcon className="h-4 w-4 text-muted-foreground" />
                                                        <span>{supplier.totalProductsLinked}</span>
                                                    </div>
                                                </TableCell>
                                                <TableCell>{supplier.createdAt ? formatDate(new Date(supplier.createdAt)) : "N/A"}</TableCell>
                                                <TableCell className="text-right">
                                                    <DropdownMenu>
                                                        <DropdownMenuTrigger>
                                                            <Button
                                                                // @ts-ignore
                                                                variant="ghost" size="icon"
                                                                onClick={(e) => {
                                                                    e.stopPropagation();
                                                                    e.preventDefault();
                                                                }}>
                                                                <MoreVerticalIcon className="h-4 w-4" />
                                                            </Button>
                                                        </DropdownMenuTrigger>
                                                        <DropdownMenuContent 
                                                            align="end" className="bg-background z-50"
                                                            onCloseAutoFocus={(e) => e.preventDefault()}
                                                            onEscapeKeyDown={(e) => e.preventDefault()}
                                                        >
                                                            <DropdownMenuItem onClick={() => openEditModal(supplier)}>
                                                                <EditIcon className="mr-2! h-4 w-4" />
                                                                Edit
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem onClick={() => handleViewProducts(supplier.id)}>
                                                                <PackageIcon className="mr-2! h-4 w-4" />
                                                                View Products
                                                            </DropdownMenuItem>
                                                            <DropdownMenuItem
                                                                onClick={() => handleDeleteSupplier(supplier.id)}
                                                                className="text-destructive focus:text-destructive"
                                                            >
                                                                <TrashIcon className="mr-2! h-4 w-4" />
                                                                Delete
                                                            </DropdownMenuItem>
                                                        </DropdownMenuContent>
                                                    </DropdownMenu>
                                                </TableCell>
                                            </TableRow>
                                        ))
                                    )}
                                </TableBody>
                            </Table>
                        </div>

                        {/* Pagination */}
                        <div className="flex items-center justify-between pt-4! border-t border-border">
                            <div className="text-sm! text-muted-foreground">
                                Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                                    {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}{" "}
                                suppliers
                            </div>
                            <div className="flex items-center gap-2">
                                <Button
                                    // @ts-ignore
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onPageChange?.(Math.max(1, currentPage - 1))}
                                    disabled={currentPage === 1}
                                >
                                    <ChevronLeftIcon className="h-4 w-4" />
                                    Previous
                                </Button>
                                <div className="text-sm! font-medium!">
                                    Page {currentPage} of {totalPages}
                                </div>
                                <Button
                                    // @ts-ignore
                                    variant="outline"
                                    size="sm"
                                    onClick={() => onPageChange?.(Math.min(totalPages, currentPage + 1))}
                                    disabled={currentPage === totalPages}
                                >
                                    Next
                                    <ChevronRightIcon className="h-4 w-4" />
                                </Button>
                            </div>
                        </div>
                    </CardContent>
                </Card>
            </div>
            <SuppliersFormDialog
                key={"SuppliersFormDialog" + (!editingSupplier ? isAddModalOpen : isEditModalOpen)}
                open={isAddModalOpen || isEditModalOpen}
                onOpenChange={isEditModalOpen ? setIsEditModalOpen : setIsAddModalOpen}
                defaultValues={{
                    id: editingSupplier?.id || 0,
                    name: editingSupplier?.name || "",
                    contactEmail: editingSupplier?.contactEmail || "",
                    leadTime: editingSupplier?.leadTime || 0,
                    minOrderQty: editingSupplier?.minOrderQty || 0,
                    notes: editingSupplier?.notes || "",
                }}
            />
        </>
    )
}