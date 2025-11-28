import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { Link, useNavigate } from "@remix-run/react";
import { ChevronLeftIcon, ChevronRightIcon, InfoIcon } from "lucide-react";

const getStatusColor = (status: DashboardProductsTableData["status"]) => {
    switch (status) {
        case "IN_STOCK":
            return "bg-success text-success-foreground";
        case "LOW_STOCK":
            return "bg-warning text-warning-foreground";
        case "STOCK_OUT":
            return "bg-destructive text-destructive-foreground";
        default:
            return "";
    }
};

const getStatusTitle = (status: DashboardProductsTableData["status"]) => {
    switch (status) {
        case "IN_STOCK":
            return "In Stock";
        case "LOW_STOCK":
            return "Low Stock";
        case "STOCK_OUT":
            return "Stock Out";
        default:
            return "";
    }
};

export interface DashboardProductsTableData {
    id: number;
    title: string;
    handle: string;
    vendor: string | null;
    image: string;
    stock: number | null;
    avgDailySales: number;
    daysUntilOut: number;
    suggestedReorder: number;
    status: "LOW_STOCK" | "STOCK_OUT" | "IN_STOCK";
    supplierMinOrderQty: number | null;
}

interface DashboardProductsTableProps {
    data: DashboardProductsTableData[];
    pagination: {
        page: number;
        perPage: number;
        totalItems: number;
        hasNextPage: boolean;
        hasPreviousPage: boolean;
    }
    onPageChange?: (page: number) => void;
    forecastPeriod?: string;
}

export default function DashboardProductsTable({ data, pagination, onPageChange, forecastPeriod }: DashboardProductsTableProps) {
    const navigate = useNavigate();

    const currentPage = pagination.page;
    const itemsPerPage = pagination.perPage;
    const totalItems = pagination.totalItems;
    const totalPages = Math.ceil(totalItems / itemsPerPage);

    return (
        <Card className="shadow-md p-0!" data-tour-id="inventory-table">
            <CardContent className="p-0!">
                <div className="overflow-x-auto">
                    <Table>
                        <TableHeader>
                            <TableRow className="bg-muted/50">
                                <TableHead
                                    className="cursor-pointer hover:bg-muted/70 transition-colors"
                                >
                                    Product
                                </TableHead>
                                <TableHead
                                    className="cursor-pointer hover:bg-muted/70 transition-colors flex items-center gap-1.5"
                                >
                                    Current Stock
                                    <Tooltip>
                                        <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                                            <InfoIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-help" />
                                        </TooltipTrigger>
                                        <TooltipContent className="max-w-xs">
                                            <p>If current stock is different from the admin product data, then please re <Link className="text-blue-500" to="/app/import">import</Link> the products again.</p>
                                        </TooltipContent>
                                    </Tooltip>
                                </TableHead>
                                <TableHead
                                    className="cursor-pointer hover:bg-muted/70 transition-colors"
                                >
                                    <div className="flex items-center gap-1.5">
                                        Avg Daily Sales
                                        <Tooltip>
                                            <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <InfoIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                                <p>Calculated from the past {forecastPeriod || 30} days of orders.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                </TableHead>
                                <TableHead
                                    className="cursor-pointer hover:bg-muted/70 transition-colors"
                                    data-tour-id="forecast-column"
                                >
                                    <div className="flex items-center gap-1.5">
                                        Days Until Out
                                        <Tooltip>
                                            <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <InfoIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                                <p>Estimated days before stock reaches zero based on recent sales.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                </TableHead>
                                <TableHead
                                    className="cursor-pointer hover:bg-muted/70 transition-colors"
                                    data-tour-id="reorder-column"
                                >
                                    <div className="flex items-center gap-1.5">
                                        Suggested Reorder
                                        <Tooltip>
                                            <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                <InfoIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-help" />
                                            </TooltipTrigger>
                                            <TooltipContent className="max-w-xs">
                                                <p>Recommended restock quantity based on lead time and daily demand.</p>
                                            </TooltipContent>
                                        </Tooltip>
                                    </div>
                                </TableHead>
                                <TableHead>Status</TableHead>
                            </TableRow>
                        </TableHeader>
                        <TableBody>
                            {data.map((product) => (
                                <TableRow
                                    key={product.id}
                                    className="hover:bg-muted/30 transition-colors cursor-pointer"
                                    onClick={() => navigate(`/app/products/${product.id}`)}
                                >
                                    <TableCell>
                                        <div className="flex items-center gap-3">
                                            <img
                                                src={product.image}
                                                alt={product.title}
                                                className="w-10 h-10 rounded-md object-cover border border-border"
                                            />
                                            <div>
                                                <div className="font-medium! hover:text-primary transition-colors">{product.title}</div>
                                                <div className="text-xs! text-muted-foreground">{product.vendor}</div>
                                            </div>
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <span className="font-semibold!">{product.stock}</span>
                                    </TableCell>
                                    <TableCell>{product.avgDailySales}</TableCell>
                                    <TableCell>
                                        <span
                                            className={
                                                product.daysUntilOut !== null && product.daysUntilOut <= 7
                                                    ? "text-destructive font-semibold!"
                                                    : product.daysUntilOut !== null && product.daysUntilOut <= 30
                                                        ? "text-warning font-semibold!"
                                                        : ""
                                            }
                                        >
                                            {product.daysUntilOut ? `${product.daysUntilOut} days` : (
                                                <div className="items-center flex gap-1">
                                                    <span>∞</span>
                                                    <Tooltip>
                                                        <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                            <InfoIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-help" />
                                                        </TooltipTrigger>
                                                        <TooltipContent className="max-w-xs">
                                                            <p>Here infinity is used to represent an unknown or unbounded value. Means current stock is not decreasing and will last indefinitely.</p>
                                                        </TooltipContent>
                                                    </Tooltip>
                                                </div>
                                            )}
                                        </span>
                                    </TableCell>
                                    <TableCell>
                                        {(product?.supplierMinOrderQty || 0) > 0 && product.suggestedReorder > 0 && product.suggestedReorder < (product?.supplierMinOrderQty || 0)
                                            ? <span className="flex items-center gap-1">
                                                <span className="text-red-500 line-through">{product.suggestedReorder}</span>
                                                <span>{product.supplierMinOrderQty}</span>
                                                <Tooltip>
                                                    <TooltipTrigger asChild onClick={(e) => e.stopPropagation()}>
                                                        <InfoIcon className="h-3.5 w-3.5 text-muted-foreground hover:text-foreground cursor-help" />
                                                    </TooltipTrigger>
                                                    <TooltipContent className="max-w-xs">
                                                        <p>The minimum order quantity set by the supplier.</p>
                                                    </TooltipContent>
                                                </Tooltip>
                                            </span>
                                            : product.suggestedReorder
                                        }
                                    </TableCell>
                                    <TableCell>
                                        <Badge className={getStatusColor(product.status)}>{getStatusTitle(product.status)}</Badge>
                                    </TableCell>
                                </TableRow>
                            ))}
                        </TableBody>
                    </Table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-6! py-4! border-t border-border">
                    <div className="text-sm! text-muted-foreground">
                        Showing {(currentPage - 1) * itemsPerPage + 1} to{" "}
                        {Math.min(currentPage * itemsPerPage, totalItems)} of {totalItems}{" "}
                        products
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
    )
}