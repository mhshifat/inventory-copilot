import { Button } from "@/components/ui/button";
import { useNavigate } from "@remix-run/react";
import { BarChart3Icon, BellIcon, Building2Icon, HelpCircleIcon, RefreshCwIcon, SettingsIcon } from "lucide-react";

interface DashboardHeaderProps {
    handleSyncInventory: () => void;
    onStartTour: () => void;
}

export default function DashboardHeader({
    handleSyncInventory,
    onStartTour
}: DashboardHeaderProps) {
    const navigate = useNavigate();

    return (
        <div className="flex items-start justify-between">
            <div>
                <h1 className="text-3xl! font-bold! text-foreground mb-2!">Inventory Overview</h1>
                <p className="text-muted-foreground">Monitor and manage your product inventory</p>
            </div>
            <div className="flex gap-2 flex-wrap">
                <Button
                    // @ts-ignore
                    variant="outline"
                    size="sm"
                    onClick={onStartTour}
                    className="gap-2"
                >
                    <HelpCircleIcon className="h-4 w-4" />
                    Start Tour
                </Button>
                <Button
                    // @ts-ignore
                    variant="outline"
                    size="sm"
                    onClick={handleSyncInventory}
                    className="gap-2"
                    data-tour-id="sync-button"
                >
                    <RefreshCwIcon className="h-4 w-4" />
                    Sync Inventory
                </Button>
                <Button
                    // @ts-ignore
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/app/reports")}
                    className="gap-2"
                    data-tour-id="reports-button"
                >
                    <BarChart3Icon className="h-4 w-4" />
                    Reports
                </Button>
                <Button
                    // @ts-ignore
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/app/suppliers")}
                    className="gap-2"
                    data-tour-id="suppliers-button"
                >
                    <Building2Icon className="h-4 w-4" />
                    Suppliers
                </Button>
                <Button
                    // @ts-ignore
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/app/alerts")}
                    className="gap-2"
                    data-tour-id="alerts-button"
                >
                    <BellIcon className="h-4 w-4" />
                    Alerts
                </Button>
                <Button
                    // @ts-ignore
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/app/help")}
                    className="gap-2"
                >
                    <HelpCircleIcon className="h-4 w-4" />
                    Help
                </Button>
                <Button
                    // @ts-ignore
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/app/settings")}
                    className="gap-2"
                    data-tour-id="settings-button"
                >
                    <SettingsIcon className="h-4 w-4" />
                    Settings
                </Button>
            </div>
        </div>
    )
}