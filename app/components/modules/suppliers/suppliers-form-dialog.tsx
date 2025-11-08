import PreviewError from "@/components/shared/preview-error";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import useFetch from "@/hooks/use-fetch";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRevalidator } from "@remix-run/react";
import { Loader2Icon, PlusIcon } from "lucide-react";
import { forwardRef, type Ref, useImperativeHandle, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import z from "zod";

export const supplierSchema = z.object({
    name: z.string().min(1, "Supplier name is required"),
    contactEmail: z.string().email("Invalid email address"),
    leadTime: z.number().min(1, "Lead time must be at least 1 day"),
    minOrderQty: z.number().min(1, "Minimum order quantity must be at least 1"),
    notes: z.string().optional(),
});

export type SupplierFormData = z.infer<typeof supplierSchema>;

export type SuppliersFormRef = {
    open: () => void;
};

interface SuppliersFormDialogProps {
    open?: boolean;
    onOpenChange: (open: boolean) => void;
    defaultValues?: SupplierFormData & { id: number };
}

function SuppliersFormDialog({ open, onOpenChange, defaultValues }: SuppliersFormDialogProps, ref: Ref<SuppliersFormRef>) {
    const revalidator = useRevalidator();
    const form = useForm<SupplierFormData>({
        defaultValues: {
            name: defaultValues?.name || "",
            contactEmail: defaultValues?.contactEmail || "",
            leadTime: defaultValues?.leadTime || 14,
            minOrderQty: defaultValues?.minOrderQty || 1,
            notes: defaultValues?.notes || "",
        },
        resolver: zodResolver(supplierSchema),
    });
    const [loading, setLoading] = useState(false);
    const { fetch, error } = useFetch(defaultValues ? `/api/suppliers/${defaultValues.id}` : "/api/suppliers");
    const [isAddModalOpen, setIsAddModalOpen] = useState(open || false);

    const handleAddSupplier = async (data: SupplierFormData) => {
        setLoading(true);
        try {
            await fetch({
                method: defaultValues ? "PUT" : "POST",
                body: JSON.stringify(data),
            });
            form.reset();
            setIsAddModalOpen(false);
            onOpenChange(false);
            toast.success(defaultValues ? "Supplier updated successfully" : "Supplier added successfully");
            await revalidator.revalidate();
        } catch (err) {
            console.error(err);
            toast.error(err instanceof Error ? err.message : (defaultValues ? "Failed to update supplier" : "Failed to add supplier"));
        } finally {
            setLoading(false);
        }
    };

    useImperativeHandle(ref, () => ({
        open: () => setIsAddModalOpen(true),
    }), []);

    if (error) return <PreviewError error={error} />
    return (
        <Dialog open={isAddModalOpen} onOpenChange={(value) => {
            setIsAddModalOpen(value);
            onOpenChange(value);
        }}>
            {open === undefined && (
                <DialogTrigger asChild>
                    <Button>
                        <PlusIcon className="mr-2! h-4 w-4" />
                        {defaultValues ? "Edit" : "Add"} Supplier
                    </Button>
                </DialogTrigger>
            )}
            <DialogContent className="sm:max-w-[500px]">
                <DialogHeader>
                    <DialogTitle>{defaultValues ? "Edit" : "Add New"} Supplier</DialogTitle>
                    <DialogDescription>
                        Enter the details of your new supplier below
                    </DialogDescription>
                </DialogHeader>
                <Form {...form}>
                    <form onSubmit={form.handleSubmit(handleAddSupplier)}>
                        <div className="space-y-4! py-4!">
                            <div className="space-y-2!">
                                <FormField
                                    control={form.control}
                                    name="name"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor={field.name}>Supplier Name *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    id="name"
                                                    placeholder="e.g., TechSupply Co."
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="space-y-2!">
                                <FormField
                                    control={form.control}
                                    name="contactEmail"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor={field.name}>Contact Email *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    id="email"
                                                    type="email"
                                                    placeholder="orders@supplier.com"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="space-y-2!">
                                <FormField
                                    control={form.control}
                                    name="leadTime"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor={field.name}>Default Lead Time (days) *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    id="leadTime"
                                                    type="number"
                                                    min="1"
                                                    placeholder="14"
                                                    value={field.value}
                                                    onChange={(e) => field.onChange(+e.target.value)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="space-y-2!">
                                <FormField
                                    control={form.control}
                                    name="minOrderQty"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor={field.name}>Minimum Order Quantity *</FormLabel>
                                            <FormControl>
                                                <Input
                                                    id="minOrderQty"
                                                    type="number"
                                                    min="1"
                                                    placeholder="100"
                                                    value={field.value}
                                                    onChange={(e) => field.onChange(+e.target.value)}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                            <div className="space-y-2!">
                                <FormField
                                    control={form.control}
                                    name="notes"
                                    render={({ field }) => (
                                        <FormItem>
                                            <FormLabel htmlFor={field.name}>Notes</FormLabel>
                                            <FormControl>
                                                <Textarea
                                                    id="notes"
                                                    placeholder="Additional information about this supplier..."
                                                    rows={3}
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                />
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )}
                                />
                            </div>
                        </div>
                        <DialogFooter>
                            <Button
                                // @ts-ignore
                                variant="outline" onClick={() => {
                                    setIsAddModalOpen(false);
                                    onOpenChange(false);
                                }} disabled={loading} type="button">
                                Cancel
                            </Button>
                            <Button type="submit" disabled={loading}>
                                {loading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                                {loading ? (defaultValues ? "Editing Supplier..." : "Adding Supplier...") : (defaultValues ? "Edit Supplier" : "Add Supplier")}
                            </Button>
                        </DialogFooter>
                    </form>
                </Form>
            </DialogContent>
        </Dialog>
    )
}

export default forwardRef(SuppliersFormDialog);