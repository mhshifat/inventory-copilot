import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { BellIcon, InfoIcon } from "lucide-react";
import { useState } from "react";

export default function AlertsLearnHowWorksDialog() {
    const [isLearnModalOpen, setIsLearnModalOpen] = useState(false);

    return (
        <Dialog open={isLearnModalOpen} onOpenChange={setIsLearnModalOpen}>
            <DialogTrigger asChild>
                <Button
                    // @ts-ignore
                    variant="link"
                    className="mt-4! text-green-600 dark:text-green-400 hover:text-green-700 dark:hover:text-green-300"
                >
                    <InfoIcon className="mr-2! h-4 w-4" />
                    Learn how alerts work
                </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-md">
                <DialogHeader>
                    <DialogTitle className="flex items-center gap-2">
                        <BellIcon className="h-5 w-5 text-green-600 dark:text-green-400" />
                        How Alerts Work
                    </DialogTitle>
                    <DialogDescription className="text-left pt-4! space-y-4!">
                        <div className="flex gap-3">
                            <div className="shrink-0 w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-400 font-semibold text-sm">
                                1
                            </div>
                            <p className="text-sm text-muted-foreground">
                                <span className="font-medium! text-foreground">AI-Powered Forecasting:</span> We analyze your sales velocity and current stock levels to predict exactly when products will run out.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <div className="shrink-0 w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-400 font-semibold text-sm">
                                2
                            </div>
                            <p className="text-sm text-muted-foreground">
                                <span className="font-medium! text-foreground">Smart Notifications:</span> You'll receive alerts before stock runs low, giving you time to reorder and avoid stockouts.
                            </p>
                        </div>

                        <div className="flex gap-3">
                            <div className="shrink-0 w-6 h-6 rounded-full bg-green-500/10 flex items-center justify-center text-green-600 dark:text-green-400 font-semibold text-sm">
                                3
                            </div>
                            <p className="text-sm text-muted-foreground">
                                <span className="font-medium! text-foreground">Automatic Monitoring:</span> Alerts update automatically as your inventory changes, keeping you informed without manual checks.
                            </p>
                        </div>
                    </DialogDescription>
                </DialogHeader>
            </DialogContent>
        </Dialog>
    )
}