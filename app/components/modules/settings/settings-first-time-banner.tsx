import { Card, CardContent } from "@/components/ui/card";
import { SparklesIcon } from "lucide-react";

export default function SettingsFirstTimeBanner() {
    return (
        <Card className="shadow-lg border-primary/20 bg-linear-to-br from-background to-primary/5">
            <CardContent className="pt-0">
                <div className="flex items-center gap-4">
                    <div className="w-12 h-12 rounded-full bg-primary/10 flex items-center justify-center shrink-0">
                        <SparklesIcon className="h-6 w-6 text-primary" />
                    </div>
                    <div>
                        <h2 className="text-2xl! font-bold! text-foreground mb-2">
                            Let's configure your forecasting preferences
                        </h2>
                        <p className="text-muted-foreground">
                            These settings help Inventory Copilot provide accurate stock predictions and timely alerts.
                            Don't worry, you can always change these later.
                        </p>
                    </div>
                </div>
            </CardContent>
        </Card>
    )
}