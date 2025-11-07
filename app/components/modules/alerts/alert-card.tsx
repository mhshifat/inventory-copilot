import PreviewError from "@/components/shared/preview-error";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import useFetch from "@/hooks/use-fetch";
import { useNavigate, useRevalidator } from "@remix-run/react";
import { CheckIcon, EyeIcon } from "lucide-react";
import { toast } from "sonner";

type AlertSeverity = "CRITICAL" | "WARNING" | "RESTOCKED";
type AlertStatus = "UNREAD" | "RESOLVED";

export interface AlertCardDetails {
    id: number;
    productId: string;
    productName: string;
    productImage: string;
    message: string;
    severity: AlertSeverity;
    status: AlertStatus;
    timestamp: Date;
}

interface AlertCardProps {
    alert: AlertCardDetails;
}

const getSeverityBadge = (severity: AlertSeverity) => {
    switch (severity) {
        case "CRITICAL":
            return <Badge variant="destructive" className="bg-red-500">Critical</Badge>;
        case "WARNING":
            return <Badge className="bg-yellow-500 text-yellow-950">Warning</Badge>;
        case "RESTOCKED":
            return <Badge className="bg-green-500 text-green-950">Restocked</Badge>;
    }
};

const formatTimestamp = (date: Date) => {
    const now = new Date();
    const diffInHours = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60));

    if (diffInHours < 1) {
        const diffInMinutes = Math.floor((now.getTime() - date.getTime()) / (1000 * 60));
        return `${diffInMinutes} minutes ago`;
    } else if (diffInHours < 24) {
        return `${diffInHours} hours ago`;
    } else {
        const diffInDays = Math.floor(diffInHours / 24);
        return `${diffInDays} days ago`;
    }
};

export default function AlertCard({ alert }: AlertCardProps) {
    const navigate = useNavigate();
    const revalidator = useRevalidator();
    const { error, fetch: handleRead } = useFetch("/api/alerts/read");

    const handleViewProduct = (productId: string) => {
        navigate(`/app/product/${productId}`);
    };

    const handleMarkAsRead = async (alertId: string) => {
        try {
            await handleRead({
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({ id: alertId })
            });
            toast.success("Alert marked as read");
            await revalidator.revalidate();
        } catch (err) {
            toast.error("Error marking alert as read");
        }
    };

    if (error) return <PreviewError error={error} />;
    return (
        <Card className="overflow-hidden shadow-md hover:shadow-lg transition-shadow">
            <CardContent className="p-6">
                <div className="flex items-start gap-4">
                    <img
                        src={alert.productImage}
                        alt={alert.productName}
                        className="w-16 h-16 rounded-lg object-cover"
                    />
                    <div className="flex-1 min-w-0">
                        <div className="flex items-start justify-between gap-4 mb-2!">
                            <div>
                                <h3 className="font-semibold! text-lg! text-foreground mb-1!">
                                    {alert.productName}
                                </h3>
                                {getSeverityBadge(alert.severity)}
                            </div>
                            <span className="text-sm text-muted-foreground whitespace-nowrap">
                                {formatTimestamp(alert.timestamp)}
                            </span>
                        </div>
                        <p className="text-muted-foreground mb-4!">{alert.message}</p>
                        <div className="flex gap-2">
                            <Button
                                size="sm"
                                // @ts-ignore
                                variant="outline"
                                onClick={() => handleViewProduct(alert.productId)}
                            >
                                <EyeIcon className="mr-2! h-4 w-4" />
                                View Product
                            </Button>
                            {alert.status === "UNREAD" && (
                                <Button
                                    size="sm"
                                    // @ts-ignore
                                    variant="secondary"
                                    onClick={() => handleMarkAsRead(alert.id.toString())}
                                >
                                    <CheckIcon className="mr-2! h-4 w-4" />
                                    Mark as Read
                                </Button>
                            )}
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}