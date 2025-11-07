import { Button } from "@/components/ui/button";
import { useNavigate } from "@remix-run/react";
import { ArrowLeftIcon, BellIcon } from "lucide-react";

export default function AlertsEmptyHeader() {
    const navigate = useNavigate();

    return (
        <div className="border-b border-border bg-card">
            <div className="max-w-6xl mx-auto! px-6! py-4!">
                <Button
                    // @ts-ignore
                    variant="ghost"
                    onClick={() => navigate("/app/dashboard")}
                    className="mb-4!"
                >
                    <ArrowLeftIcon className="mr-2! h-4 w-4" />
                    Back to Dashboard
                </Button>
                <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-green-500/10 flex items-center justify-center">
                        <BellIcon className="h-6 w-6 text-green-600 dark:text-green-400" />
                    </div>
                    <div>
                        <h1 className="text-3xl! font-bold! text-foreground">Alerts</h1>
                        <p className="text-muted-foreground mt-1!">
                            Monitor inventory warnings and low-stock notifications
                        </p>
                    </div>
                </div>
            </div>
        </div>
    )
}