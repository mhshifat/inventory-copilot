import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { useNavigate } from "@remix-run/react";
import confetti from "canvas-confetti";
import { BarChart3Icon, BellIcon, CheckCircle2Icon, TrendingUpIcon } from "lucide-react";
import { useEffect } from "react";

export default function OnboardingComplete() {
    const navigate = useNavigate();

    useEffect(() => {
        // Trigger confetti animation on mount
        const duration = 3000;
        const animationEnd = Date.now() + duration;
        const defaults = { startVelocity: 30, spread: 360, ticks: 60, zIndex: 0 };

        const randomInRange = (min: number, max: number) => {
            return Math.random() * (max - min) + min;
        };

        const interval = setInterval(() => {
            const timeLeft = animationEnd - Date.now();

            if (timeLeft <= 0) {
                return clearInterval(interval);
            }

            const particleCount = 50 * (timeLeft / duration);

            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.1, 0.3), y: Math.random() - 0.2 },
            });
            confetti({
                ...defaults,
                particleCount,
                origin: { x: randomInRange(0.7, 0.9), y: Math.random() - 0.2 },
            });
        }, 250);

        return () => clearInterval(interval);
    }, []);

    return (
        <div className="min-h-screen relative overflow-hidden">
            {/* Gradient Background */}
            <div className="absolute inset-0 bg-linear-to-br from-blue-50 via-blue-100/50 to-primary/10 dark:from-blue-950/30 dark:via-blue-900/20 dark:to-primary/20" />

            {/* Decorative Elements */}
            <div className="absolute top-20 left-10 w-72 h-72 bg-primary/10 rounded-full blur-3xl animate-pulse" />
            <div className="absolute bottom-20 right-10 w-96 h-96 bg-blue-400/10 rounded-full blur-3xl animate-pulse" style={{ animationDelay: "1s" }} />

            {/* Content */}
            <div className="relative z-10 min-h-screen flex items-center justify-center p-6!">
                <Card className="max-w-2xl w-full shadow-2xl border-2 animate-scale-in">
                    <CardContent className="p-8! md:p-12! text-center space-y-8">
                        {/* Success Icon */}
                        <div className="flex justify-center">
                            <div className="relative">
                                <div className="absolute inset-0 bg-success/20 rounded-full blur-xl animate-pulse" />
                                <div className="relative bg-success/10 rounded-full p-6! animate-scale-in">
                                    <CheckCircle2Icon className="h-20 w-20 text-su!ccess" strokeWidth={1.5} />
                                </div>
                            </div>
                        </div>

                        {/* Headline */}
                        <div className="space-y-3 animate-fade-in flex flex-col items-center gap-2">
                            <h1 className="text-4xl! md:text-5xl! font-bold! text-foreground">
                                You're all set up! 🚀
                            </h1>
                            <p className="text-lg! text-muted-foreground max-w-lg mx-auto!">
                                Your forecasts are now live. We'll keep monitoring your stock and send alerts when needed.
                            </p>
                        </div>

                        {/* Feature Cards */}
                        <div className="grid md:grid-cols-3 gap-4 pt-4! animate-fade-in" style={{ animationDelay: "0.2s" }}>
                            <div className="bg-linear-to-br from-primary/10 to-primary/5 rounded-lg p-4! space-y-2 hover:scale-105 transition-transform">
                                <div className="bg-primary/10 rounded-full w-10 h-10 flex items-center justify-center mx-auto!">
                                    <TrendingUpIcon className="h-5 w-5 text-primary" />
                                </div>
                                <h3 className="font-semibold text-sm!">Smart Forecasting</h3>
                                <p className="text-xs! text-muted-foreground">AI-powered predictions</p>
                            </div>

                            <div className="bg-linear-to-br from-warning/10 to-warning/5 rounded-lg p-4! space-y-2 hover:scale-105 transition-transform">
                                <div className="bg-warning/10 rounded-full w-10 h-10 flex items-center justify-center mx-auto!">
                                    <BellIcon className="h-5 w-5 text-warning" />
                                </div>
                                <h3 className="font-semibold text-sm!">Real-time Alerts</h3>
                                <p className="text-xs! text-muted-foreground">Never miss a stockout</p>
                            </div>

                            <div className="bg-linear-to-br from-info/10 to-info/5 rounded-lg p-4! space-y-2 hover:scale-105 transition-transform">
                                <div className="bg-info/10 rounded-full w-10 h-10 flex items-center justify-center mx-auto!">
                                    <BarChart3Icon className="h-5 w-5 text-info" />
                                </div>
                                <h3 className="font-semibold text-sm!">Detailed Reports</h3>
                                <p className="text-xs! text-muted-foreground">Actionable insights</p>
                            </div>
                        </div>

                        {/* CTA Button */}
                        <div className="pt-4! animate-fade-in" style={{ animationDelay: "0.4s" }}>
                            <Button
                                size="lg"
                                onClick={() => navigate("/app/dashboard")}
                                className="text-lg! px-8! py-6! shadow-lg hover:shadow-xl transition-all hover:scale-105"
                            >
                                Go to Dashboard
                            </Button>
                        </div>

                        {/* Helper Text */}
                        <p className="text-sm! text-muted-foreground animate-fade-in" style={{ animationDelay: "0.6s" }}>
                            Need help getting started? Visit our{" "}
                            <button
                                onClick={() => navigate("/app/help")}
                                className="text-primary hover:underline font-medium!"
                            >
                                Help Center
                            </button>
                        </p>
                    </CardContent>
                </Card>
            </div>
        </div>
    );
}