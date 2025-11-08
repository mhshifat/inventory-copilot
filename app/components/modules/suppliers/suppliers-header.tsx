import { Button } from "@/components/ui/button";
import { useNavigate } from "@remix-run/react";
import { ArrowLeftIcon, Building2Icon } from "lucide-react";
import SuppliersFormDialog from "./suppliers-form-dialog";

export default function SuppliersHeader() {
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
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 flex-1!">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <Building2Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl! font-bold! text-foreground">Suppliers</h1>
                            <p className="text-muted-foreground mt-1!">
                                Manage your supplier relationships and lead times
                            </p>
                        </div>
                    </div>
                    <SuppliersFormDialog />
                </div>
            </div>
        </div>
    )
}