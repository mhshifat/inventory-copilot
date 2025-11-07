import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import useFilter from "@/hooks/use-filter";
import { useNavigate } from "@remix-run/react";
import { ArrowLeftIcon, BellIcon } from "lucide-react";

export default function AlertsHeader() {
    const navigate = useNavigate();
    const { filter, filterValues } = useFilter();

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
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <BellIcon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl! font-bold! text-foreground">Alerts</h1>
                            <p className="text-muted-foreground mt-1!">
                                Monitor inventory warnings and low-stock notifications
                            </p>
                        </div>
                    </div>
                    <div className="flex items-center gap-2">
                        <span className="text-sm text-muted-foreground">Filter by:</span>
                        <Select value={filterValues?.["timeFilter"]} onValueChange={(value) => filter({ timeFilter: value })}>
                            <SelectTrigger className="w-[140px] bg-background z-50">
                                <SelectValue placeholder="Time range" />
                            </SelectTrigger>
                            <SelectContent className="bg-background z-50">
                                <SelectItem value="7">Last 7 days</SelectItem>
                                <SelectItem value="30">Last 30 days</SelectItem>
                            </SelectContent>
                        </Select>
                    </div>
                </div>
            </div>
        </div>
    )
}