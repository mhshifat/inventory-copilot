import { Alert, AlertDescription } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { useNavigate } from "@remix-run/react";
import { InfoIcon } from "lucide-react";

export default function DashboardConfigureAlertsAlert() {
    const navigate = useNavigate();
     
    return (
        <Alert className="bg-info/10 border-info/30 flex items-center">
            <InfoIcon className="h-4 w-4 text-info" />
            <AlertDescription className="flex items-center justify-between flex-wrap gap-3 flex-1">
                <span className="text-info-foreground">
                    You haven't set up alerts yet. Enable them to get notified before stockouts.
                </span>
                <Button
                    // @ts-ignore
                    variant="outline"
                    size="sm"
                    onClick={() => navigate("/alerts")}
                    className="shrink-0 ml-auto!"
                >
                    Set Up Alerts
                </Button>
            </AlertDescription>
        </Alert>
    )    
}