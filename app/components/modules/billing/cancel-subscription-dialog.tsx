import type { PropsWithChildren } from 'react'
import { useState } from "react";
import { TriangleAlertIcon, XCircleIcon } from "lucide-react";
import { useNavigate } from "@remix-run/react";
import { useAppSubscription } from '@/components/providers/subscription';
import { Button } from '@/components/ui/button';
import { AlertDialog, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle, AlertDialogTrigger } from '@/components/ui/alert-dialog';

export default function CancelSubscriptionDialog({ children }: PropsWithChildren) {
    const navigate = useNavigate();
    const { currentSubscription, currentPlan } = useAppSubscription();
    const [loading, setLoading] = useState(false);

    if (!currentSubscription) return null; // If no subscription, don't render the dialog
    return (
        <AlertDialog>
            <AlertDialogTrigger asChild>
                {children}
            </AlertDialogTrigger>
            <AlertDialogContent className="max-w-sm">
                <AlertDialogHeader>
                    <div className="flex items-center gap-2">
                        <TriangleAlertIcon className="h-5 w-5 text-destructive" />
                        <AlertDialogTitle className="text-lg">
                            Wait! Are you sure?
                        </AlertDialogTitle>
                    </div>
                    <AlertDialogDescription>
                        You're about to cancel your <strong>{currentSubscription?.name} Plan</strong>. Here's what you'll lose:
                    </AlertDialogDescription>
                </AlertDialogHeader>

                <ul className="mt-2 mb-4 list-none space-y-2 bg-muted/50 rounded-lg p-3 text-sm">
                    {currentPlan?.features?.map((item: string, index: number) => (
                        <li key={index} className="flex items-center gap-2 text-muted-foreground">
                            <XCircleIcon className="h-4 w-4 text-destructive" />
                            {item}
                        </li>
                    ))}
                </ul>

                {/* <p className="text-sm text-muted-foreground mb-4">
          Your trial will end immediately and you won’t be charged.
        </p> */}

                <AlertDialogFooter className="flex flex-col gap-2 sm:flex-col">
                    <AlertDialogCancel asChild disabled={loading}>
                        <Button
                            // @ts-ignore
                            variant="outline"
                        >Keep My Subscription</Button>
                    </AlertDialogCancel>
                    <Button
                        loading={loading}
                        disabled={loading}
                        // @ts-ignore
                        variant="destructive"
                        className="ml-0" onClick={() => {
                            setLoading(true);
                            navigate(`/app/plan/cancel/${encodeURIComponent(currentSubscription.id)}`);
                        }}>Yes, Cancel Subscription</Button>
                </AlertDialogFooter>
            </AlertDialogContent>
        </AlertDialog>
    );
}