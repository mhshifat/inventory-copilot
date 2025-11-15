import CancelSubscriptionDialog from "@/components/modules/billing/cancel-subscription-dialog";
import { useAppSubscription } from "@/components/providers/subscription";
import type { LoaderFunctionArgs } from "@remix-run/node";
import { Link } from "@remix-run/react";
import { Button } from "app/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "app/components/ui/card";
import { authenticate } from "app/shopify.server";
import { differenceInDays, differenceInHours, format, isBefore } from "date-fns";
import { CheckCircleIcon, CreditCardIcon, SettingsIcon } from "lucide-react";

export const loader = async ({ request }: LoaderFunctionArgs) => {
  const { billing, redirect } = await authenticate.admin(request);
  const existingBilling = await billing.check({});
  const currentBilling = existingBilling.appSubscriptions?.[0];
  if (currentBilling?.status !== "ACTIVE") return redirect("/app/pricing", 303);
  
  return {}
}

export default function PricingPage() {
   const { currentSubscription } = useAppSubscription();

   const getTrialEndDate = () => {
    if (!currentSubscription?.createdAt) return null;
    const date = new Date(currentSubscription.createdAt);
    date.setDate(date.getDate() + 3);
    return date;
  };
  const getTrialDaysRemaining = () => {
    const trialEnd = getTrialEndDate();
    if (trialEnd) {
      const endDate = new Date(trialEnd);
      const today = new Date();
      const diffTime = endDate.getTime() - today.getTime();
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return Math.max(0, diffDays);
    }
    return 0;
  };
   return (
    <div className="min-h-screen bg-background p-6">
      <div className="max-w-4xl mx-auto">
        <div className="flex items-center justify-between mb-8">
          <div>
            <h1 className="text-3xl font-bold text-foreground">Subscription Portal</h1>
            <p className="text-muted-foreground mt-2">
              Manage your subscription and billing
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-muted-foreground">
              {currentSubscription?.name} Plan
            </span>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {/* Current Plan Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <CreditCardIcon className="w-5 h-5" />
                Current Plan
              </CardTitle>
              <CardDescription>
                Your current subscription details
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <span className="font-medium">Plan:</span>
                  <span className="text-primary font-semibold">{currentSubscription?.name}</span>
                </div>
                
                {getTrialDaysRemaining() > 0 && (currentSubscription?.trialDays || 0) > 0 && <div className="flex items-center justify-between">
                    <span className="font-medium">Trial ends:</span>
                    <span className="text-warning font-medium">
                      {getTrialDaysRemaining()} days remaining
                    </span>
                  </div>}

                {currentSubscription?.createdAt && <div className="flex items-center justify-between">
                    <span className="font-medium">Next billing:</span>
                    <span className="text-muted-foreground">
                      {new Date(currentSubscription.currentPeriodEnd || '').toLocaleDateString()}
                    </span>
                  </div>}

                {currentSubscription?.currentPeriodEnd && <div className="flex items-center justify-between">
                    <span className="font-medium">Active until:</span>
                    <span className="text-destructive">
                      {formatWithRemaining(new Date(currentSubscription.currentPeriodEnd))}
                    </span>
                  </div>}
              </div>
            </CardContent>
          </Card>

          {/* Subscription Management Card */}
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <SettingsIcon className="w-5 h-5" />
                Subscription Management
              </CardTitle>
              <CardDescription>
                Manage your billing and subscription
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <Link to={"/app/pricing"}>
                  <Button
                    // @ts-ignore 
                    variant="outline" className="w-full">
                      Change Plan
                  </Button>
                </Link>
                <br />
                {currentSubscription?.createdAt && (
                  <CancelSubscriptionDialog>
                    <Button 
                        // @ts-ignore
                        variant="destructive" className="w-full mt-0">
                      Cancel Subscription
                    </Button>
                  </CancelSubscriptionDialog>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Current Plan Features */}
        <Card className="mt-8">
          <CardHeader>
            <CardTitle>Your Plan Features</CardTitle>
            <CardDescription>
              What's included with your {currentSubscription?.name} plan
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-6">
              {/* Product Count - Main differentiator */}
              {/* <div className="bg-primary/5 p-4 rounded-lg border">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-primary/10 rounded-full flex items-center justify-center">
                      <span className="text-primary font-bold text-lg">
                        {currentSubscription?.name === 'Starter' ? '100' : 
                         currentSubscription?.name === 'Pro' ? '1K' : 
                         currentSubscription?.name === 'Business' ? '10K' : '∞'}
                      </span>
                    </div>
                    <div>
                      <h3 className="font-semibold">Products</h3>
                      <p className="text-sm text-muted-foreground">
                        {currentSubscription?.name === 'Starter' ? 'Up to 100 total products' : 
                         currentSubscription?.name === 'Pro' ? 'Up to 1,000 products' : 
                         currentSubscription?.name === 'Business' ? 'Up to 10,000 products' : 'Unlimited products'}
                      </p>
                    </div>
                  </div>
                  <CheckCircleIcon className="w-5 h-5 text-success" />
                </div>
              </div> */}

              {/* Starter Plan Features */}
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-success" />
                  <div>
                    <span className="font-medium">AND/OR Combination Logic</span>
                    <p className="text-sm text-muted-foreground">Advanced rule combinations</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-success" />
                  <div>
                    <span className="font-medium">Smart Tags & Metafield Rules</span>
                    <p className="text-sm text-muted-foreground">Intelligent tagging system</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-success" />
                  <div>
                    <span className="font-medium">Contains, Starts With Filters</span>
                    <p className="text-sm text-muted-foreground">Flexible filtering options</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-success" />
                  <div>
                    <span className="font-medium">Group & Reorder Rules</span>
                    <p className="text-sm text-muted-foreground">Easily organize your rules</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-success" />
                  <div>
                    <span className="font-medium">Automatically Sync Collections</span>
                    <p className="text-sm text-muted-foreground">Real-time synchronization</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-success" />
                  <div>
                    <span className="font-medium">Import Existing Collections</span>
                    <p className="text-sm text-muted-foreground">Seamless migration</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <CheckCircleIcon className="w-5 h-5 text-success" />
                  <div>
                    <span className="font-medium">Clear Sync Progress Dashboard</span>
                    <p className="text-sm text-muted-foreground">Track synchronization status</p>
                  </div>
                </div>
              </div>

              {currentSubscription?.name === 'Starter' && (
                <div className="bg-gradient-to-r from-primary/10 to-primary/5 p-4 rounded-lg border border-primary/20">
                  <div className="flex items-center justify-between">
                    <div>
                      <h4 className="font-semibold text-primary">Need more products?</h4>
                      <p className="text-sm text-muted-foreground">
                        Upgrade to Pro for 1,000 products
                      </p>
                    </div>
                    <Link to={`/app/pricing`}>
                      <Button size="sm">
                        Upgrade to Pro
                      </Button>
                    </Link>
                  </div>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
   ) 
}


function formatWithRemaining(targetDate: Date): string {
  const now = new Date();

  const formattedDate = format(targetDate, "MMMM do yyyy"); // e.g., "May 1st 2025"

  if (isBefore(targetDate, now)) {
    return `${formattedDate} (expired)`; // optional expired handling
  }

  const daysDiff = differenceInDays(targetDate, now);

  if (daysDiff >= 1) {
    return `${formattedDate} (${daysDiff} day${daysDiff > 1 ? 's' : ''} remaining)`;
  }

  const hoursDiff = differenceInHours(targetDate, now);
  return `${formattedDate} (${hoursDiff} hr${hoursDiff > 1 ? 's' : ''} remaining)`;
}