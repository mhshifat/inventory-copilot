import { useLocation, useNavigate } from "@remix-run/react";
import type { PropsWithChildren} from "react";
import { createContext, useContext, useEffect, useMemo, useState } from "react";

interface AppSubscription {
    id: string;
    name: string;
    trialDays: number;
    createdAt: string | null;
    currentPeriodEnd: string;
}

interface AppSubscriptionState {
    currentSubscription: AppSubscription | null;
    currentPlan: any | null; // Adjust type as needed
}

const SubscriptionCtx = createContext<AppSubscriptionState | null>(null);

interface AppSubscriptionProps {
    currentSubscription?: AppSubscription | null;
    billingPlans: any[]; // Adjust type as needed
}

export default function AppSubscription({ children, currentSubscription: currentSubscriptionProps, billingPlans }: PropsWithChildren<AppSubscriptionProps>) {
    const navigate = useNavigate();
    const location = useLocation();
    const [currentSubscription, setCurrentSubscription] = useState<AppSubscription | null>(null);

    const currentPlan = useMemo(() => {
        return billingPlans.find(plan => plan.title === currentSubscription?.name) || null;
    }, [billingPlans, currentSubscription?.name])

    useEffect(() => {
        setCurrentSubscription(currentSubscriptionProps || null);
    }, [currentSubscriptionProps])

  useEffect(() => {
    const params = new URLSearchParams(location.search);
    if (params.has("force-reload")) {
      params.delete("force-reload");
      navigate(location.pathname + "?" + params.toString(), { replace: true });
    }
  }, [location, navigate]);

  return (
    <SubscriptionCtx.Provider value={{ currentSubscription, currentPlan }}>
        {children}
    </SubscriptionCtx.Provider>
  )
}

export function useAppSubscription() {
    const res = useContext(SubscriptionCtx);
    if (!res) throw new Error("useAppSubscription must be used within a AppSubscriptionProvider");
    return res;
}