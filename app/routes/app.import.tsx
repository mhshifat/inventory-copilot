import PreviewError from "@/components/shared/preview-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import useFetch from "@/hooks/use-fetch";
import type { ApiResponse } from "@/lib/api-response";
import { DownloadIcon, PackageIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { useEventSource } from "remix-utils/sse/react";
import { useNavigate } from "@remix-run/react";

export default function ImportProducts() {
    const navigate = useNavigate();
    const [isImporting, setIsImporting] = useState(false);
    const [progress, setProgress] = useState(0);
    const { error, fetch: handleImports } = useFetch("/api/import-products");
    const eventData = useEventSource('/api/sse');

    const handleImport = () => {
        setIsImporting(true);
        setProgress(0);

        handleImports()
            .then((data: ApiResponse<null>) => {
                console.log("Import successful:", data);
                toast.success(data.message || "Products import initiated!");
            })
            .catch((error) => {
                console.error("Error during import:", error);
                toast.error(error?.message || "An error occurred during import.");
            });
    };

    useEffect(() => {
        if (eventData) {
            try {
                const parsed = JSON.parse(eventData);
                if (parsed.progress !== undefined && "type" in parsed && parsed.type === "PRODUCTS_IMPORT") {
                    setProgress(parsed.progress);
                    if (parsed.progress >= 100) {
                        navigate('/app');
                    }
                }
            } catch (err) {
                console.error("Failed to parse event data:", err);
            }
        }
    }, [eventData]);

    if (error) return <PreviewError error={error} />;
    return (
        <div className="min-h-screen bg-background flex items-center justify-center p-6">
            <Card className="w-full max-w-md shadow-lg">
                <CardContent className="pt-12 pb-12 text-center space-y-8">
                    {/* Icon */}
                    <div className="flex justify-center">
                        <div className="relative">
                            <div className="w-20 h-20 bg-primary/10 rounded-full flex items-center justify-center">
                                <PackageIcon className="w-10 h-10 text-primary" />
                            </div>
                            {!isImporting && (
                                <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-primary rounded-full flex items-center justify-center">
                                    <DownloadIcon className="w-4 h-4 text-primary-foreground" />
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Title and Description */}
                    <div className="space-y-2">
                        <h1 className="text-3xl font-bold text-foreground">Welcome to Inventory Overview</h1>
                        <p className="text-muted-foreground">
                            {isImporting
                                ? "Importing your products from Shopify..."
                                : "Let's get started by importing your products"}
                        </p>
                    </div>

                    {/* Button or Progress */}
                    {!isImporting ? (
                        <Button
                            onClick={handleImport}
                            size="lg"
                            className="w-full max-w-xs mx-auto"
                        >
                            <DownloadIcon className="mr-2 h-5 w-5" />
                            Import Products
                        </Button>
                    ) : (
                        <div className="space-y-3 max-w-xs mx-auto">
                            <Progress value={progress} className="h-3" />
                            <p className="text-sm font-medium text-foreground">{progress}% Complete</p>
                        </div>
                    )}

                    {/* Info text */}
                    {!isImporting && (
                        <p className="text-xs text-muted-foreground max-w-sm mx-auto">
                            This will sync your product inventory, stock levels, and sales data from your Shopify
                            store
                        </p>
                    )}
                </CardContent>
            </Card>
        </div>
    )
}