import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertTriangleIcon, PackageIcon, TrendingUpIcon } from "lucide-react";

interface DashboardSummaryCardsProps {
    products: Array<any>;
    lowStockCount: number;
    inventoryHealth: number;
}

export default function DashboardSummaryCards({ products, lowStockCount, inventoryHealth }: DashboardSummaryCardsProps) {
    return (
        <div className="flex flex-col gap-6">
            <Card className="shadow-md flex-1" data-tour-id="stat-total">
                <CardHeader className="flex flex-row items-center justify-between pb-2! space-y-0">
                    <CardTitle className="text-sm! font-medium!">Total Products</CardTitle>
                    <PackageIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl! font-bold!">{products.length}</div>
                    <p className="text-xs! text-muted-foreground mt-1!">Across all collections</p>
                </CardContent>
            </Card>

            <Card className="shadow-md flex-1" data-tour-id="stat-low">
                <CardHeader className="flex flex-row items-center justify-between pb-2! space-y-0">
                    <CardTitle className="text-sm! font-medium!">Low Stock Items</CardTitle>
                    <AlertTriangleIcon className="h-4 w-4 text-warning" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl! font-bold!">{lowStockCount}</div>
                    <p className="text-xs! text-muted-foreground mt-1!">Needs attention</p>
                </CardContent>
            </Card>

            <Card className="shadow-md flex-1" data-tour-id="stat-health">
                <CardHeader className="flex flex-row items-center justify-between pb-2! space-y-0">
                    <CardTitle className="text-sm! font-medium!">Inventory Health</CardTitle>
                    <TrendingUpIcon className="h-4 w-4 text-success" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl! font-bold!">{inventoryHealth}%</div>
                    <p className="text-xs! text-muted-foreground mt-1!">Well-stocked products</p>
                </CardContent>
            </Card>
        </div>
    )
}