import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@remix-run/react";
import { AlertTriangleIcon } from "lucide-react";

interface DashboardLowStockAlertProps {
    lowStockCount: number;
}

export default function DashboardLowStockAlert({ lowStockCount }: DashboardLowStockAlertProps) {
    const navigate = useNavigate();
    return (
        <Alert className="bg-destructive/10 border-destructive/30 flex items-center">
            <AlertTriangleIcon className="h-4 w-4 text-destructive" />
            <AlertDescription className="flex items-center justify-between flex-wrap gap-3 flex-1">
                <span className="text-destructive-foreground">
                    You have {lowStockCount} product{lowStockCount > 1 ? 's' : ''} running low. Check alerts to avoid stockouts.
                </span>
                <Button
                    // @ts-ignore
                    variant="destructive"
                    size="sm"
                    onClick={() => navigate("/app/alerts")}
                    className="shrink-0"
                >
                    Check Alerts
                </Button>
            </AlertDescription>
        </Alert>
    )
}