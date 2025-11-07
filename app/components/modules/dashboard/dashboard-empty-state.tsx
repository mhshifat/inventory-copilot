import { Package, CheckCircle, FileText, Warehouse } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";

interface EmptyStateProps {
  type?: "inventory" | "alerts" | "suppliers" | "reports";
  title?: string;
  description?: string;
  onAction?: () => void;
  actionLabel?: string;
  tipText?: string;
}

const emptyStateConfig = {
  inventory: {
    icon: Warehouse,
    title: "No inventory data yet!",
    description: "Once you sync your Shopify inventory, we'll start forecasting your stock health and restock dates.",
    actionLabel: "Sync Inventory Data",
    tipText: "You can always re-sync from Settings.",
  },
  alerts: {
    icon: CheckCircle,
    title: "All stocked up!",
    description: "You'll see low-stock alerts here when any product is projected to run out soon.",
    actionLabel: "Sync Inventory",
    tipText: undefined,
  },
  suppliers: {
    icon: Package,
    title: "No Suppliers Yet",
    description: "Add your first supplier to start managing your inventory.",
    actionLabel: "Add Supplier",
    tipText: undefined,
  },
  reports: {
    icon: FileText,
    title: "No Report Data",
    description: "Generate your first report to see inventory insights.",
    actionLabel: "Generate Report",
    tipText: undefined,
  },
};

export const DashboardEmptyState = ({
  type = "inventory",
  title,
  description,
  onAction,
  actionLabel,
  tipText,
}: EmptyStateProps) => {
  const config = emptyStateConfig[type];
  const Icon = config.icon;

  const isAlertsType = type === "alerts";
  
  return (
    <Card className="border-dashed border-2">
      <div className="flex flex-col items-center justify-center py-20! px-6! text-center">
        <div className="relative mb-8! animate-in fade-in-50 duration-500">
          <div className={`w-32 h-32 rounded-full flex items-center justify-center ${
            isAlertsType 
              ? "bg-linear-to-br from-green-500/20 to-green-500/5" 
              : "bg-linear-to-br from-primary/20 to-primary/5"
          }`}>
            <Icon className={`h-16 w-16 ${
              isAlertsType ? "text-green-600 dark:text-green-400" : "text-primary"
            }`} strokeWidth={1.5} />
          </div>
        </div>
        
        <h2 className="text-3xl! font-bold! text-foreground mb-3! animate-in fade-in-50 duration-500 delay-100">
          {title || config.title}
        </h2>
        
        <p className="text-muted-foreground mb-8! max-w-lg text-lg! leading-relaxed animate-in fade-in-50 duration-500 delay-200">
          {description || config.description}
        </p>
        
        {onAction && (
          <div className="flex flex-col items-center gap-3 animate-in fade-in-50 duration-500 delay-300">
            <Button 
              onClick={onAction} 
              size="lg" 
              className={`shadow-lg ${
                isAlertsType 
                  ? "bg-green-600 hover:bg-green-700 text-white dark:bg-green-500 dark:hover:bg-green-600" 
                  : ""
              }`}
            >
              {actionLabel || config.actionLabel}
            </Button>
            
            {(tipText || config.tipText) && (
              <p className="text-sm! text-muted-foreground/80">
                💡 {tipText || config.tipText}
              </p>
            )}
          </div>
        )}
      </div>
    </Card>
  );
};