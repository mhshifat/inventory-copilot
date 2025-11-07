import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@remix-run/react";
import { InfoIcon } from "lucide-react";

export default function DashboardCustomizeSettingsAlert() {
    const navigate = useNavigate();
    return (
        <Alert className="bg-info/10 border-info/30 flex items-center">
            <InfoIcon className="h-4 w-4 text-info" />
            <AlertDescription className="flex items-center justify-between flex-wrap gap-3 flex-1">
                <span className="text-info-foreground">
                    Customize your forecast period for better accuracy.
                </span>
                <Button
                    // @ts-ignore
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/app/settings")}
                    className="shrink-0 ml-auto!"
                >
                    Go to Settings
                </Button>
            </AlertDescription>
        </Alert>
    )
}