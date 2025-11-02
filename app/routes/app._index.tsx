import prisma from "@/lib/db.server";
import { authenticate, handleError } from "@/shopify.server";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { useLoaderData, useNavigate } from "@remix-run/react";
import { useEffect, useState } from "react";
import confetti from "canvas-confetti";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ArrowRightIcon, CheckCircle2Icon, CircleIcon } from "lucide-react";
import { Button } from "@/components/ui/button";

export const loader = async (args: LoaderFunctionArgs) => {
  const response = {
    productsCount: 0
  }

  try {
    const { session } = await authenticate.admin(args.request);
    const shop = await prisma.shop.findUnique({
      where: {
        domain: session.shop
      },
      select: {
        id: true,
        _count: {
          select: {
            products: true
          }
        }
      }
    });

    if (!shop?.id) {
      throw new Error(`Shop not found with domain: ${session.shop}`);
    }
    
    response.productsCount = shop._count.products;
    return response;
  } catch (err) {
    handleError(err);
    return response;
  }
}

interface OnboardingStep {
  id: string;
  title: string;
  description: string;
  route: string;
  completed: boolean;
}

export default function Index() {
  const navigate = useNavigate();
  const loaderData =  useLoaderData<typeof loader>();
  const [steps, setSteps] = useState<OnboardingStep[]>([
    {
      id: "sync",
      title: "Sync your Shopify inventory data",
      description: "Connect your store to get started",
      route: "/app/import",
      completed: loaderData.productsCount > 0,
    },
    {
      id: "preferences",
      title: "Set your forecast preferences",
      description: "Customize your inventory alerts",
      route: "/app/settings",
      completed: false,
    },
    {
      id: "forecast",
      title: "View your first forecast report",
      description: "See AI-powered predictions",
      route: "/app/import",
      completed: false,
    },
  ]);

  const completedSteps = steps.filter((step) => step.completed).length;
  const progress = (completedSteps / steps.length) * 100;
  const allCompleted = completedSteps === steps.length;

  useEffect(() => {
    if (allCompleted) {
      // Trigger confetti animation
      const duration = 3000;
      const animationEnd = Date.now() + duration;
      
      const randomInRange = (min: number, max: number) => {
        return Math.random() * (max - min) + min;
      };

      const interval = setInterval(() => {
        const timeLeft = animationEnd - Date.now();

        if (timeLeft <= 0) {
          clearInterval(interval);
          return;
        }

        confetti({
          particleCount: 3,
          angle: randomInRange(55, 125),
          spread: randomInRange(50, 70),
          origin: { x: randomInRange(0.1, 0.9), y: Math.random() - 0.2 },
          colors: ["#2d7a4f", "#4ade80", "#86efac"],
        });
      }, 100);

      return () => clearInterval(interval);
    }
  }, [allCompleted]);

  const handleStepAction = (step: OnboardingStep) => {
    // Mark as completed and navigate
    setSteps((prev) =>
      prev.map((s) => (s.id === step.id ? { ...s, completed: true } : s))
    );
    setTimeout(() => navigate(step.route), 500);
  };

  return (
    <div className="min-h-screen bg-linear-to-br from-background via-accent/30 to-background">
      <div className="container mx-auto px-4 py-12 max-w-4xl">
        {/* Header */}
        <div className="text-center mb-8 animate-fade-in">
          <h1 className="text-4xl md:text-5xl font-bold text-foreground mb-4">
            👋 Welcome to Inventory Copilot!
          </h1>
          <p className="text-lg text-muted-foreground">
            Let's help you forecast inventory and prevent stockouts.
          </p>
        </div>

        {/* Progress Bar */}
        <Card className="mb-8 animate-fade-in border-2">
          <CardContent className="pt-6">
            <div className="space-y-2">
              <div className="flex justify-between items-center text-sm">
                <span className="font-medium text-foreground">Overall Progress</span>
                <span className="text-muted-foreground">
                  {completedSteps} of {steps.length} completed
                </span>
              </div>
              <Progress value={progress} className="h-3" />
            </div>
          </CardContent>
        </Card>

        {/* Onboarding Steps */}
        <div className="space-y-4">
          {steps.map((step, index) => (
            <Card
              key={step.id}
              className={`transition-all duration-300 hover:shadow-md animate-fade-in ${
                step.completed ? "border-success bg-success/5" : ""
              }`}
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <CardHeader>
                <div className="flex items-start justify-between gap-4">
                  <div className="flex items-start gap-4 flex-1">
                    <div className="mt-1">
                      {step.completed ? (
                        <CheckCircle2Icon className="h-6 w-6 text-success animate-scale-in" />
                      ) : (
                        <CircleIcon className="h-6 w-6 text-muted-foreground" />
                      )}
                    </div>
                    <div className="space-y-1 flex-1">
                      <CardTitle className="text-xl">
                        Step {index + 1}: {step.title}
                      </CardTitle>
                      <CardDescription className="text-base">
                        {step.description}
                      </CardDescription>
                    </div>
                  </div>
                  <Button
                    onClick={() => handleStepAction(step)}
                    disabled={step.completed}
                    className="shrink-0"
                  >
                    {step.completed ? (
                      "Completed"
                    ) : (
                      <>
                        Start <ArrowRightIcon className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </CardHeader>
            </Card>
          ))}
        </div>

        {/* Completion Message */}
        {allCompleted && (
          <Card className="mt-8 border-success bg-success/5 animate-scale-in">
            <CardContent className="pt-6 text-center flex flex-col items-center gap-5">
              <h3 className="text-2xl font-bold text-success mb-2">
                🎉 Congratulations!
              </h3>
              <p className="text-muted-foreground mb-4 max-w-[50%] text-center ml-auto">
                You've completed the onboarding process. You're all set to start
                managing your inventory with AI-powered forecasts.
              </p>
              <Button onClick={() => navigate("/app/onboarding-complete")} size="lg">
                Continue to Celebrate
              </Button>
            </CardContent>
          </Card>
        )}

        {/* Skip Option */}
        {!allCompleted && (
          <div className="text-center mt-6">
            <Button
              // @ts-ignore
              variant="ghost"
              onClick={() => navigate("/app/dashboard")}
              className="text-muted-foreground"
            >
              Skip for now
            </Button>
          </div>
        )}
      </div>
    </div>
  );
}
