import { Button } from "@/components/ui/button";
import { useNavigate } from "@remix-run/react";
import { ArrowLeftIcon, BarChart3Icon, DownloadIcon } from "lucide-react";

interface ReportsHeaderProps {
    handleExportCSV: () => void;
}

export default function ReportsHeader({ handleExportCSV }: ReportsHeaderProps) {
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
                    <div className="flex items-center gap-3">
                        <div className="w-12 h-12 rounded-lg bg-primary/10 flex items-center justify-center">
                            <BarChart3Icon className="h-6 w-6 text-primary" />
                        </div>
                        <div>
                            <h1 className="text-3xl! font-bold! text-foreground">Reports & Analytics</h1>
                            <p className="text-muted-foreground mt-1!">
                                Comprehensive insights into inventory performance
                            </p>
                        </div>
                    </div>
                    <Button onClick={handleExportCSV}>
                        <DownloadIcon className="mr-2! h-4 w-4" />
                        Export CSV
                    </Button>
                </div>
            </div>
        </div>
    )
}