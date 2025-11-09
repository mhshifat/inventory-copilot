import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { AlertCircleIcon, TrendingUpIcon } from "lucide-react";

interface ReportsAnalyticalCardsProps {
    totalSales: number;
    stockOuts: number;
}

export default function ReportsAnalyticalCards({
    totalSales,
    stockOuts
}: ReportsAnalyticalCardsProps) {
    return (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2! space-y-0!">
                    <CardTitle className="text-sm! font-medium!">Total Sales</CardTitle>
                    <TrendingUpIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl! font-bold!">{totalSales.toLocaleString()}</div>
                    <p className="text-xs! text-muted-foreground mt-1!">
                        Last 30 days
                    </p>
                </CardContent>
            </Card>

            <Card className="shadow-md">
                <CardHeader className="flex flex-row items-center justify-between pb-2! space-y-0!">
                    <CardTitle className="text-sm! font-medium!">Total Stockouts</CardTitle>
                    <AlertCircleIcon className="h-4 w-4 text-muted-foreground" />
                </CardHeader>
                <CardContent>
                    <div className="text-2xl! font-bold!">{stockOuts.toLocaleString()}</div>
                    <p className="text-xs! text-muted-foreground mt-1!">
                        Incidents this month
                    </p>
                </CardContent>
            </Card>
        </div>
    )
}