import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { type ProductDetailsData } from "@/routes/app.products.$productId";
import { PackageIcon } from "lucide-react";

interface ProductDetailsOverviewProps {
    product: ProductDetailsData;
    supplier: ProductDetailsData["supplier"] | null;
}

export default function ProductDetailsOverview({ product, supplier }: ProductDetailsOverviewProps) {
    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <PackageIcon className="h-5 w-5" />
                    Product Overview
                </CardTitle>
            </CardHeader>
            <CardContent>
                <div className="flex flex-col md:flex-row gap-6">
                    <img
                        src={product.image}
                        alt={product.name}
                        className="w-full md:w-48 h-48 rounded-lg object-cover border border-border"
                    />
                    <div className="flex-1 grid grid-cols-2 gap-4">
                        <div>
                            <Label className="text-muted-foreground text-sm!">Supplier</Label>
                            <p className="font-semibold! mt-1!">{supplier?.name || "Unknown"}</p>
                        </div>
                        <div>
                            <Label className="text-muted-foreground text-sm!">Current Inventory</Label>
                            <p className="text-2xl! font-bold! text-primary mt-1!">{product.currentStock}</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}