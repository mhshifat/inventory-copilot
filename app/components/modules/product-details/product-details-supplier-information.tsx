import PreviewError from "@/components/shared/preview-error";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import useFetch from "@/hooks/use-fetch";
import { type ProductDetailsSupplier } from "@/routes/app.products.$productId";
import { useNavigate, useRevalidator } from "@remix-run/react";
import { Loader2, UsersIcon } from "lucide-react";
import { useState } from "react";
import { toast } from "sonner";

interface ProductDetailsSupplierInformationProps {
    productId: number;
    suppliers: { label: string; value: string }[];
    supplier: ProductDetailsSupplier | null;
}

export default function ProductDetailsSupplierInformation({
    productId,
    suppliers,
    supplier,
}: ProductDetailsSupplierInformationProps) {
    const navigate = useNavigate();
    const revalidator = useRevalidator();
    const [loading, setLoading] = useState(false);
    const { error, fetch: handleSaveSupplier } = useFetch(`/api/products/${productId}`);
    const [selectedSupplierId, setSelectedSupplierId] = useState<string>("");

    const handleSave = async () => {
        if (!selectedSupplierId) {
            toast.error("Please select a supplier");
            return;
        }

        setLoading(true);

        try {
            await handleSaveSupplier({
                method: "PATCH",
                body: JSON.stringify({
                    supplierId: selectedSupplierId,
                }),
            });

            toast.success("Product information saved successfully!");
            await revalidator.revalidate();
        } catch (err) {
            console.error(err);
            toast.error("Failed to save product information");
        } finally {
            setLoading(false);
        }
    };

    if (error) return <PreviewError error={error} />
    return (
        <div className="space-y-6!">
            <Card className="shadow-md sticky top-6!">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <UsersIcon className="h-5 w-5" />
                        Supplier Information
                    </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4!">
                    <div>
                        <Label htmlFor="supplier">Select Supplier</Label>
                        <Select value={selectedSupplierId} onValueChange={setSelectedSupplierId}>
                            <SelectTrigger className="mt-1! w-full">
                                <SelectValue placeholder="Choose a supplier" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                                {suppliers.map((s) => (
                                    <SelectItem key={s.value} value={s.value}>
                                        {s.label}
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>

                    {supplier && (
                        <>
                            <div>
                                <Label className="text-muted-foreground text-sm!">Contact Email</Label>
                                <a
                                    href={`mailto:${supplier.contactEmail}`}
                                    className="text-primary hover:underline block mt-1!"
                                >
                                    {supplier.contactEmail}
                                </a>
                            </div>

                            <div>
                                <Label className="text-muted-foreground text-sm!">Lead Time</Label>
                                <p className="font-semibold! mt-1!">{supplier.leadTime} days</p>
                            </div>

                            <div>
                                <Label className="text-muted-foreground text-sm!">Minimum Order Quantity</Label>
                                <p className="font-semibold! mt-1!">{supplier.minOrderQty} units</p>
                            </div>

                            {supplier.notes && (
                                <div>
                                    <Label className="text-muted-foreground text-sm!">Notes</Label>
                                    <p className="text-sm! mt-1!">{supplier.notes}</p>
                                </div>
                            )}
                        </>
                    )}

                    <Separator />

                    <Button disabled={loading} onClick={handleSave} className="w-full">
                        {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Save Changes
                    </Button>

                    <Button
                        // @ts-ignore
                        variant="outline"
                        className="w-full"
                        disabled={loading}
                        onClick={() => navigate("/app/suppliers")}
                    >
                        Manage Suppliers
                    </Button>
                </CardContent>
            </Card>
        </div>
    )
}