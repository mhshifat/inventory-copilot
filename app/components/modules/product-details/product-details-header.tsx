import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { type ProductDetailsData } from "@/routes/app.products.$productId";
import { useNavigate } from "@remix-run/react";
import { ArrowLeftIcon } from "lucide-react";

const getStatusColor = (status: string) => {
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

const getStatusText = (status: string) => {
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

interface ProductDetailsHeaderProps {
    product: ProductDetailsData;
    supplier: ProductDetailsData["supplier"] | null;
}

export default function ProductDetailsHeader({ product, supplier }: ProductDetailsHeaderProps) {
    const navigate = useNavigate();

    return (
        <div className="border-b border-border bg-card">
            <div className="max-w-7xl mx-auto! px-6! py-4!">
                <Button
                    // @ts-ignore
                    variant="ghost"
                    onClick={() => navigate("/app/dashboard")}
                    className="mb-4!"
                >
                    <ArrowLeftIcon className="mr-2! h-4 w-4" />
                    Back to Dashboard
                </Button>
                <div className="flex items-start justify-between">
                    <div>
                        <h1 className="text-3xl! font-bold! text-foreground">{product.name}</h1>
                    <p className="text-muted-foreground mt-1!">{supplier?.name || "Unknown"} • {product.collection}</p>
                    </div>
                    <Badge className={getStatusColor(product.status)}>{getStatusText(product.status)}</Badge>
                </div>
            </div>
        </div>
    )
}