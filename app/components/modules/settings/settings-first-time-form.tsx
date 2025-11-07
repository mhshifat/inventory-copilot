import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import type { SettingsFormData } from "@/routes/app.settings";
import { useFetcher, useNavigate, useRevalidator } from "@remix-run/react";
import { InfoIcon, Loader2Icon, SaveIcon, TrendingUpIcon } from "lucide-react";
import { useEffect } from "react";
import { useFormContext } from "react-hook-form";
import { toast } from "sonner";

export default function SettingsFirstTimeForm() {
    const fetcher = useFetcher();
    const navigate = useNavigate();
    const revalidator = useRevalidator();
    const form = useFormContext<SettingsFormData>();

    const formAction = "/app/settings";
    const isLoading = fetcher.formAction === formAction && (fetcher.state === "submitting" || fetcher.state === "loading");
    const isSuccess = fetcher.formAction === formAction && (fetcher.data as { success: boolean })?.success;
    const errorMessage = fetcher.formAction === formAction && (fetcher.data as { error?: string })?.error;

    const onSubmit = () => {
        const formValues = form.getValues();

        fetcher.submit(formValues, {
            method: "PUT",
            action: formAction,
            encType: "application/json",
        });
    }

    useEffect(() => {
        if (isSuccess) {
            revalidator.revalidate();
            toast.success("Settings saved successfully!");
        } else if (errorMessage) {
            toast.error(errorMessage || "Failed to save settings. Please try again.");
        }
    }, [isSuccess, errorMessage, revalidator])

    return (
        <form onSubmit={form.handleSubmit(onSubmit)}>
            <Card className="shadow-md">
                <CardHeader>
                    <CardTitle className="flex items-center gap-2">
                        <TrendingUpIcon className="h-5 w-5 text-primary" />
                        Essential Settings
                    </CardTitle>
                    <CardDescription>Configure the basics to get started</CardDescription>
                </CardHeader>
                <CardContent className="space-y-8">
                    <TooltipProvider>
                        {/* Forecast Period */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="forecastPeriod" className="text-base! font-medium!">
                                    Forecast Period <span className="text-destructive">*</span>
                                </Label>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                        <p>How far ahead to predict. A longer period gives you more time to prepare for restocking.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <FormField
                                name="forecastPeriod"
                                control={form.control}
                                render={({ field }) => {
                                    return (
                                        <FormItem>
                                            <FormControl>
                                                <Select value={field.value} onValueChange={field.onChange}>
                                                    <SelectTrigger id="forecastPeriod" className="max-w-sm">
                                                        <SelectValue placeholder="Select how far ahead to predict" />
                                                    </SelectTrigger>
                                                    <SelectContent>
                                                        <SelectItem value="7">7 days - Short term</SelectItem>
                                                        <SelectItem value="14">14 days - Medium term</SelectItem>
                                                        <SelectItem value="30">30 days - Long term (Recommended)</SelectItem>
                                                        <SelectItem value="60">60 days - Extended planning</SelectItem>
                                                    </SelectContent>
                                                </Select>
                                            </FormControl>
                                            <FormMessage />
                                        </FormItem>
                                    )
                                }}
                            />
                            <p className="text-sm! text-muted-foreground flex items-start gap-2">
                                <span className="text-primary mt-0.5!">💡</span>
                                <span>
                                    We recommend 30 days for most businesses. This gives you enough time to order and receive inventory.
                                </span>
                            </p>
                        </div>

                        <Separator />

                        {/* Lead Time */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="defaultLeadTime" className="text-base! font-medium!">
                                    Lead Time (days) <span className="text-destructive">*</span>
                                </Label>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                        <p>Average days your supplier needs. This helps us alert you before it's too late to reorder.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <FormField
                                control={form.control}
                                name="defaultLeadTime"
                                render={({ field }) => (
                                    <FormItem>
                                        <FormControl>
                                            <Input
                                                id="defaultLeadTime"
                                                type="number"
                                                min="1"
                                                max="365"
                                                placeholder="e.g., 14"
                                                value={field.value}
                                                onChange={field.onChange}
                                                className="max-w-sm"
                                            />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />
                            <p className="text-sm! text-muted-foreground flex items-start gap-2">
                                <span className="text-primary mt-0.5!">💡</span>
                                <span>
                                    Include shipping time + supplier processing time. For example, if your supplier takes 10 days to ship and 4 days for delivery, enter 14.
                                </span>
                            </p>
                        </div>

                        <Separator />

                        {/* Alert Threshold */}
                        <div className="space-y-3">
                            <div className="flex items-center gap-2">
                                <Label htmlFor="lowStockThreshold" className="text-base! font-medium!">
                                    Alert Threshold (units) <span className="text-destructive">*</span>
                                </Label>
                                <Tooltip>
                                    <TooltipTrigger asChild>
                                        <InfoIcon className="h-4 w-4 text-muted-foreground cursor-help" />
                                    </TooltipTrigger>
                                    <TooltipContent className="max-w-xs">
                                        <p>When to trigger low-stock warnings. Set this to your safety stock level.</p>
                                    </TooltipContent>
                                </Tooltip>
                            </div>
                            <FormField
                                control={form.control}
                                name="lowStockThreshold"
                                render={({ field }) => (
                                    <FormItem className="flex-1">
                                        <FormControl>
                                            <div className="flex items-center gap-3 max-w-sm">
                                                <Input
                                                    id="lowStockThreshold"
                                                    type="number"
                                                    min="1"
                                                    placeholder="e.g., 20"
                                                    value={field.value}
                                                    onChange={field.onChange}
                                                    className="flex-1"
                                                />
                                                <span className="text-sm! text-muted-foreground whitespace-nowrap">units remaining</span>
                                            </div>
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                )}
                            />

                            <p className="text-sm! text-muted-foreground flex items-start gap-2">
                                <span className="text-primary mt-0.5!">💡</span>
                                <span>
                                    We'll alert you when stock falls below this number. Set it high enough to reorder before you run out.
                                </span>
                            </p>
                        </div>
                    </TooltipProvider>
                </CardContent>
            </Card>

            {/* Save Button */}
            <div className="flex justify-between items-center mt-6!">
                <Button
                    // @ts-ignore
                    variant="ghost"
                    disabled={isLoading}
                    onClick={() => navigate("/app/dashboard")}
                    className="text-muted-foreground"
                >
                    Skip for now
                </Button>
                <Button
                    disabled={isLoading}
                    type="submit"
                    size="lg"
                    className="min-w-[200px] shadow-lg"
                >
                    {isLoading && <Loader2Icon className="mr-2! h-4 w-4 animate-spin" />}
                    {!isLoading && <SaveIcon className="mr-2! h-4 w-4" />}
                    Save Settings
                </Button>
            </div>
        </form>
    )
}