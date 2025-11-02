import SettingsFirstTimeBanner from "@/components/modules/settings/settings-first-time-banner";
import SettingsFirstTimeForm from "@/components/modules/settings/settings-first-time-form";
import SettingsHeader from "@/components/modules/settings/settings-header";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Switch } from "@/components/ui/switch";
import { Label } from "@radix-ui/react-label";
import { useFetcher, useLoaderData, useNavigate } from "@remix-run/react";
import { BellIcon, Loader2Icon, MonitorIcon, SaveIcon, TrendingUpIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useForm } from "react-hook-form";
import { toast } from "sonner";
import { z } from 'zod';
import { zodResolver } from '@hookform/resolvers/zod'
import { Form, FormControl, FormField, FormItem, FormMessage } from "@/components/ui/form";
import type { ActionFunctionArgs, LoaderFunctionArgs } from "@remix-run/node";
import prisma from "@/lib/db.server";
import { authenticate, handleError } from "@/shopify.server";
import type { Setting } from "@prisma/client";

const settingsFormSchema = z.object({
  forecastPeriod: z.string().min(1, "Forecast Period is required"),
  defaultLeadTime: z.string().min(1, "Default Lead Time is required"),
  lowStockThreshold: z.string().min(1, "Low Stock Threshold is required"),
  emailAlertsEnabled: z.boolean().optional(),
  alertEmail: z.email().optional(),
  inAppAlertsEnabled: z.boolean().optional(),
  units: z.string().optional(),
});

export type SettingsFormData = z.infer<typeof settingsFormSchema>;

export const loader = async (args: LoaderFunctionArgs) => {
  const response = {
    settings: null as Setting | null,
  }

  try {
    const { session } = await authenticate.admin(args.request);
    const shop = await prisma.shop.findUnique({
      where: {
        domain: session.shop
      },
      select: {
        id: true,
        settings: true,
      }
    });

    if (!shop?.id) {
      throw new Error(`Shop not found with domain: ${session.shop}`);
    }
    
    response.settings = shop.settings;
    return response;
  } catch (err) {
    handleError(err);
    return response;
  }
}

export const action = async ({ request }: ActionFunctionArgs) => {
  const response = {
    success: true,
    message: "Settings saved successfully",
    error: "",
    data: null as Setting | null
  }

  try {
    const { session } = await authenticate.admin(request);
    const shop = await prisma.shop.findUnique({
      where: {
        domain: session.shop
      },
      select: {
        id: true,
      }
    });

    if (!shop?.id) {
      throw new Error(`Shop not found with domain: ${session.shop}`);
    }

    switch (request.method) {
      case "PUT": {
        const payload = await request.json();
        const settings = await prisma.setting.upsert({
          where: {
            shop_id: shop.id
          },
          update: {
            default_lead_time: payload.defaultLeadTime,
            forecast_period: payload.forecastPeriod,
            low_stock_threshold: payload.lowStockThreshold,
            email_alerts_enabled: payload.emailAlertsEnabled,
            alert_email: payload.alertEmail,
            in_app_alerts_enabled: payload.inAppAlertsEnabled,
            units: payload.units,
          },
          create: {
            default_lead_time: payload.defaultLeadTime,
            forecast_period: payload.forecastPeriod,
            low_stock_threshold: payload.lowStockThreshold,
            email_alerts_enabled: payload.emailAlertsEnabled,
            alert_email: payload.alertEmail,
            in_app_alerts_enabled: payload.inAppAlertsEnabled,
            shop_id: shop.id
          }
        });
        if (!settings.id) {
          throw new Error("Failed to create settings");
        }
        response.success = true;
        response.data = settings;
        return response;
      }
      default:
        break;
    }
  } catch (err) {
    response.success = false;
    response.message = "Failed to save settings";
    response.error = (err as Error).message;
    return response;
  }
}

export default function Settings() {
  const fetcher = useFetcher();
  const navigate = useNavigate();
  const loaderData =  useLoaderData<typeof loader>();
  const form = useForm<SettingsFormData>({
    resolver: zodResolver(settingsFormSchema),
    defaultValues: {
      forecastPeriod: "",
      defaultLeadTime: "",
      lowStockThreshold: "",
      emailAlertsEnabled: false,
      alertEmail: undefined,
      inAppAlertsEnabled: false,
      units: "UNITS",
    }
  });
  const [isFirstTime, setIsFirstTime] = useState(true);

  const formAction = "/app/settings";
  const isLoading = fetcher.formAction === formAction && (fetcher.state === "submitting" || fetcher.state === "loading");
  const isSuccess = fetcher.formAction === formAction && (fetcher.data as { success: boolean })?.success;
  const errorMessage = fetcher.formAction === formAction && (fetcher.data as { error?: string })?.error;

  useEffect(() => {
    if (loaderData.settings) {
      setIsFirstTime(false);
      form.reset({
        forecastPeriod: loaderData.settings.forecast_period,
        defaultLeadTime: loaderData.settings.default_lead_time,
        lowStockThreshold: loaderData.settings.low_stock_threshold,
        emailAlertsEnabled: loaderData.settings.email_alerts_enabled,
        alertEmail: loaderData.settings.alert_email || undefined,
        inAppAlertsEnabled: loaderData.settings.in_app_alerts_enabled,
        units: loaderData.settings.units || "UNITS",
      });
    }
  }, [form, loaderData.settings]);

  useEffect(() => {
        if (isSuccess) {
            toast.success("Settings saved successfully!");
        } else if (errorMessage) {
            toast.error(errorMessage || "Failed to save settings. Please try again.");
        }
    }, [isSuccess, errorMessage])

  function onSubmit() {
    const formValues = form.getValues();

    fetcher.submit(formValues, {
        method: "PUT",
        action: formAction,
        encType: "application/json",
    });
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <SettingsHeader />

      {/* Settings Content */}
      <div className="max-w-5xl mx-auto p-6 space-y-6">
        {isFirstTime ? (
          /* First-time Setup View */
          <>
            {/* Welcome Message */}
            <SettingsFirstTimeBanner />

            {/* First-time Setup Form */}
            <Form {...form}>
                <SettingsFirstTimeForm />
            </Form>
          </>
        ) : (
          /* Full Settings View */
          <Form {...form}>
            <form className="flex flex-col gap-5" onSubmit={form.handleSubmit(onSubmit)}>
              {/* Forecast Settings */}
              <Card className="shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <TrendingUpIcon className="h-5 w-5 text-primary" />
                    <div className="flex flex-col gap-1">
                      <CardTitle>Forecast Settings</CardTitle>
                      <CardDescription>Configure default forecast and inventory parameters</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    <div className="space-y-2">
                      <Label htmlFor="forecastPeriod">Default Forecast Period</Label>
                      <FormField
                        control={form.control}
                        name="forecastPeriod"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Select value={field.value} onValueChange={field.onChange}>
                                <SelectTrigger id="forecastPeriod" className="min-w-[200px]">
                                  <SelectValue placeholder="Select forecast period" />
                                </SelectTrigger>
                                <SelectContent>
                                  <SelectItem value="7">7 days</SelectItem>
                                  <SelectItem value="14">14 days</SelectItem>
                                  <SelectItem value="30">30 days</SelectItem>
                                </SelectContent>
                              </Select>
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <p className="text-xs! text-muted-foreground">
                        How far ahead to forecast sales and inventory needs
                      </p>
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="defaultLeadTime">Default Lead Time (days)</Label>
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
                                value={field.value}
                                onChange={field.onChange}
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <p className="text-xs! text-muted-foreground">
                        Expected time from order to delivery for suppliers
                      </p>
                    </div>
                  </div>

                  <Separator />

                  <div className="space-y-2">
                    <Label htmlFor="lowStockThreshold">Low Stock Alert Threshold</Label>
                    <FormField
                      control={form.control}
                      name="lowStockThreshold"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <div className="flex items-center gap-4">
                              <Input
                                id="lowStockThreshold"
                                type="number"
                                min="1"
                                value={field.value}
                                onChange={field.onChange}
                                className="max-w-xs"
                              />
                              <span className="text-sm! text-muted-foreground">units remaining</span>
                            </div>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <p className="text-xs! text-muted-foreground">
                      Alert when inventory falls below this level
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Notifications */}
              <Card className="shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <BellIcon className="h-5 w-5 text-primary" />
                    <div className="flex flex-col gap-1">
                      <CardTitle>Notifications</CardTitle>
                      <CardDescription>Manage how you receive inventory alerts</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="emailAlerts" className="text-base!">Email Alerts</Label>
                      <p className="text-sm! text-muted-foreground">
                        Receive low stock and reorder alerts via email
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="emailAlertsEnabled"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch
                              id="emailAlerts"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>

                  {form.watch("emailAlertsEnabled") && (
                    <div className="space-y-2 pl-4 border-l-2 border-primary/20 flex flex-col">
                      <Label htmlFor="alertEmail">Alert Email Address</Label>
                      <FormField
                        control={form.control}
                        name="alertEmail"
                        render={({ field }) => (
                          <FormItem>
                            <FormControl>
                              <Input
                                id="alertEmail"
                                type="email"
                                placeholder="admin@company.com"
                                value={field.value}
                                onChange={field.onChange}
                                className="max-w-md"
                              />
                            </FormControl>
                            <FormMessage />
                          </FormItem>
                        )}
                      />
                      <p className="text-xs! text-muted-foreground">
                        All inventory notifications will be sent to this address
                      </p>
                    </div>
                  )}

                  <Separator />

                  <div className="flex items-center justify-between">
                    <div className="space-y-0.5">
                      <Label htmlFor="inAppAlerts" className="text-base!">In-App Alerts</Label>
                      <p className="text-sm! text-muted-foreground">
                        Show notifications within the application
                      </p>
                    </div>
                    <FormField
                      control={form.control}
                      name="inAppAlertsEnabled"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Switch
                              id="inAppAlerts"
                              checked={field.value}
                              onCheckedChange={field.onChange}
                            />
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                  </div>
                </CardContent>
              </Card>

              {/* Display Preferences */}
              <Card className="shadow-md">
                <CardHeader>
                  <div className="flex items-center gap-2">
                    <MonitorIcon className="h-5 w-5 text-primary" />
                    <div>
                      <CardTitle>Display Preferences</CardTitle>
                      <CardDescription>Customize how information is displayed</CardDescription>
                    </div>
                  </div>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-2">
                    <Label htmlFor="units">Inventory Units</Label>
                    <FormField
                      control={form.control}
                      name="units"
                      render={({ field }) => (
                        <FormItem>
                          <FormControl>
                            <Select
                              value={field.value}
                              onValueChange={field.onChange}
                            >
                              <SelectTrigger id="units" className="max-w-xs min-w-[200px]">
                                <SelectValue placeholder="Select unit type" />
                              </SelectTrigger>
                              <SelectContent>
                                <SelectItem value="UNITS">Units</SelectItem>
                                <SelectItem value="CASES">Cases</SelectItem>
                                <SelectItem value="PACKS">Packs</SelectItem>
                              </SelectContent>
                            </Select>
                          </FormControl>
                          <FormMessage />
                        </FormItem>
                      )}
                    />
                    <p className="text-xs! text-muted-foreground">
                      How inventory quantities are displayed throughout the app
                    </p>
                  </div>
                </CardContent>
              </Card>

              {/* Save Button */}
              <div className="flex justify-end gap-4">
                {/* @ts-ignore */}
                <Button disabled={isLoading} variant="outline" onClick={() => navigate("/app/dashboard")}>
                  Cancel
                </Button>
                <Button type="submit" disabled={isLoading} className="min-w-[150px]">
                  {isLoading && <Loader2Icon className="mr-2 h-4 w-4 animate-spin" />}
                  {!isLoading && <SaveIcon className="mr-2 h-4 w-4" />}
                  Save Changes
                </Button>
              </div>
            </form>
          </Form>
        )}
      </div>
    </div>
  )
}