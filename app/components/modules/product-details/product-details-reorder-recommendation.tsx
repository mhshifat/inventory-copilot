import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { type ProductDetailsData } from "@/routes/app.products.$productId";

interface ProductDetailsReorderRecommendationProps {
    product: ProductDetailsData;
    supplier: ProductDetailsData["supplier"] | null;
    unitText: string;
}

export default function ProductDetailsReorderRecommendation({ product, supplier, unitText }: ProductDetailsReorderRecommendationProps) {
    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Reorder Recommendation</CardTitle>
            </CardHeader>
            <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-4">
                        <div>
                            <Label className="text-muted-foreground text-sm!">Avg Daily Sales</Label>
                            <p className="text-xl! font-bold! mt-1!">{product.avgDailySales} {unitText}/day</p>
                        </div>
                        <div>
                            <Label className="text-muted-foreground text-sm!">Estimated Days Until Out</Label>
                            <p className="text-xl! font-bold! text-warning mt-1!">{product.daysUntilOut} days</p>
                        </div>
                    </div>
                    <div className="space-y-4">
                        <div>
                            <Label className="text-muted-foreground text-sm!">Suggested Reorder Quantity</Label>
                            <p className="text-xl! font-bold! text-primary mt-1!">{product.suggestedReorder} {unitText}</p>
                        </div>
                        <div>
                            <Label className="text-muted-foreground text-sm!">Lead Time</Label>
                            <p className="text-xl! font-bold! mt-1!">{supplier?.leadTime || "-"} days</p>
                        </div>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}