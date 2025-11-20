import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useNavigate } from "@remix-run/react";
import { ChevronLeftIcon } from "lucide-react";

export default function Help() {
    const navigate = useNavigate();

    return (
        <div className="min-h-screen bg-background p-6">
            <div className="max-w-5xl mx-auto! space-y-6">
                {/* Header */}
                <header className="flex items-center justify-between">
                    <div className="flex items-center gap-4">
                        <Button
                            // @ts-ignore
                            variant="ghost"
                            size="icon"
                            onClick={() => navigate("/app/dashboard")}
                            className="hover:bg-accent"
                        >
                            <ChevronLeftIcon className="h-5 w-5" />
                        </Button>
                        <div>
                            <h1 className="text-3xl! font-bold! tracking-tight">Help & Tutorials</h1>
                            <p className="text-muted-foreground">Learn how to get the most out of Inventory Copilot</p>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <Tabs defaultValue="quick-start" className="space-y-6">
                    <TabsList className="grid w-full grid-cols-3 lg:w-[400px]">
                        <TabsTrigger value="quick-start">Quick Start</TabsTrigger>
                        <TabsTrigger value="video">Video Tutorial</TabsTrigger>
                        <TabsTrigger value="faq">FAQ</TabsTrigger>
                    </TabsList>

                    {/* Quick Start Tab */}
                    <TabsContent value="quick-start" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Getting Started</CardTitle>
                                <CardDescription>
                                    Follow these simple steps to start forecasting your inventory
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-6">
                                <div className="space-y-4">
                                    <div className="flex items-start gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold!">
                                            1
                                        </div>
                                        <div>
                                            <h3 className="font-semibold! mb-1!">Sync Your Inventory</h3>
                                            <p className="text-sm! text-muted-foreground">
                                                Import your product data from Shopify or upload a CSV file to get started with accurate stock levels.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold!">
                                            2
                                        </div>
                                        <div>
                                            <h3 className="font-semibold! mb-1!">Configure Settings</h3>
                                            <p className="text-sm! text-muted-foreground">
                                                Set up your lead times, reorder points, and notification preferences in the Settings page to match your business needs.
                                            </p>
                                        </div>
                                    </div>

                                    <div className="flex items-start gap-3">
                                        <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-full bg-primary text-primary-foreground font-semibold!">
                                            3
                                        </div>
                                        <div>
                                            <h3 className="font-semibold! mb-1!">Start Forecasting</h3>
                                            <p className="text-sm! text-muted-foreground">
                                                Review your dashboard to see predicted stockout dates, suggested reorder quantities, and low-stock alerts automatically generated from your sales data.
                                            </p>
                                        </div>
                                    </div>
                                </div>

                                <div className="pt-4! border-t">
                                    <p className="text-sm! text-muted-foreground">
                                        💡 <strong>Pro Tip:</strong> The more sales history you have, the more accurate your forecasts will be. We recommend at least 30 days of data for optimal results.
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* Video Tutorial Tab */}
                    <TabsContent value="video" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Video Tutorial</CardTitle>
                                <CardDescription>
                                    Watch a quick walkthrough of Inventory Copilot's key features
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                {/* Video Embed Placeholder */}
                                <div className="relative aspect-video w-full rounded-lg bg-muted flex items-center justify-center border-2 border-dashed border-border">
                                    <iframe className="absolute inset-0 w-full h-full" src="https://player.vimeo.com/video/1138918043?badge=0&amp;autopause=0&amp;player_id=0&amp;app_id=58479" frameBorder="0" referrerPolicy="strict-origin-when-cross-origin" title="d68f2a03-ba3a-426c-b262-63deb16ef00d"></iframe>
                                </div>

                                {/* Video Description */}
                                <div className="space-y-2">
                                    <h4 className="font-semibold!">What you'll learn:</h4>
                                    <ul className="space-y-1 text-sm! text-muted-foreground list-disc list-inside">
                                        <li>How to navigate the dashboard and understand key metrics</li>
                                        <li>Setting up alerts for low-stock products</li>
                                        <li>Using AI-powered forecasts to plan reorders</li>
                                        <li>Managing suppliers and automating purchase orders</li>
                                        <li>Customizing settings for your business needs</li>
                                    </ul>
                                </div>
                            </CardContent>
                        </Card>
                    </TabsContent>

                    {/* FAQ Tab */}
                    <TabsContent value="faq" className="space-y-4">
                        <Card>
                            <CardHeader>
                                <CardTitle>Frequently Asked Questions</CardTitle>
                                <CardDescription>
                                    Find answers to common questions about inventory forecasting
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <Accordion type="single" collapsible className="w-full">
                                    <AccordionItem value="item-1">
                                        <AccordionTrigger>How are forecasts calculated?</AccordionTrigger>
                                        <AccordionContent className="text-muted-foreground">
                                            Forecasts are calculated using your historical sales data from the past 30-90 days.
                                            We analyze average daily sales velocity, seasonal trends, and current stock levels to
                                            predict when you'll run out of inventory. The AI model continuously learns from your
                                            sales patterns to improve accuracy over time.
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="item-2">
                                        <AccordionTrigger>Can I change the forecast period?</AccordionTrigger>
                                        <AccordionContent className="text-muted-foreground">
                                            Yes! You can adjust the forecast period in the Settings page. Choose between 30, 60,
                                            or 90-day lookback periods depending on your business seasonality. Longer periods
                                            provide more data for stable forecasts, while shorter periods are better for rapidly
                                            changing inventory or new products.
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="item-3">
                                        <AccordionTrigger>How do alerts work?</AccordionTrigger>
                                        <AccordionContent className="text-muted-foreground">
                                            Alerts are automatically triggered when a product is projected to run out within your
                                            configured threshold (default is 14 days). You'll receive notifications both in the app
                                            and via email. Alerts take into account your supplier lead times, so you're notified
                                            with enough time to reorder before stockouts occur.
                                        </AccordionContent>
                                    </AccordionItem>

                                    <AccordionItem value="item-4">
                                        <AccordionTrigger>What's "Suggested Reorder"?</AccordionTrigger>
                                        <AccordionContent className="text-muted-foreground">
                                            Suggested Reorder is the recommended quantity to purchase based on your lead time and
                                            average daily sales. The calculation ensures you have enough stock to cover demand
                                            during the reorder period, plus a safety buffer. This helps prevent both stockouts
                                            and overstocking, optimizing your inventory investment.
                                        </AccordionContent>
                                    </AccordionItem>
                                </Accordion>
                            </CardContent>
                        </Card>
                    </TabsContent>
                </Tabs>
            </div>
        </div>
    );
}