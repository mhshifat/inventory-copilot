import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { ChevronRightIcon, SparklesIcon, TrendingDownIcon } from "lucide-react";

export interface ForecastProduct {
  id: string;
  title: string;
  stock: number;
  predictedDaysToStockout: number;
  riskLevel: "CRITICAL" | "HIGH" | "MODERATE";
  stockoutPercentage: number;
}

const getRiskColor = (riskLevel: string) => {
  switch (riskLevel) {
    case "CRITICAL":
      return "bg-destructive";
    case "HIGH":
      return "bg-warning";
    case "MODERATE":
      return "bg-chart-2";
    default:
      return "bg-muted";
  }
};

const getRiskBadgeColor = (riskLevel: string) => {
  switch (riskLevel) {
    case "CRITICAL":
      return "bg-destructive text-destructive-foreground";
    case "HIGH":
      return "bg-warning text-warning-foreground";
    case "MODERATE":
      return "bg-chart-2 text-chart-2-foreground";
    default:
      return "";
  }
};

interface DashboardAIForecastWidgetProps {
  onViewAll?: () => void;
  aiForecastData: ForecastProduct[];
}

export default function DashboardAiForecastWidget({ onViewAll, aiForecastData }: DashboardAIForecastWidgetProps) {
    return (
    <Card className="shadow-md animate-fade-in border-l-4 border-l-primary">
      <CardHeader className="pb-3!">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
              <SparklesIcon className="h-5 w-5 text-primary animate-pulse" />
            </div>
            <div>
              <CardTitle className="text-lg flex items-center gap-2">
                AI Forecast
                <Badge variant="secondary" className="text-xs! font-normal!">
                  Beta
                </Badge>
              </CardTitle>
              <p className="text-xs! text-muted-foreground mt-0.5!">
                Predicted stockouts in next 7 days
              </p>
            </div>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-4!">
        {/* Forecast Items */}
        <div className="space-y-4!">
          {aiForecastData.map((product, index) => (
            <div
              key={product.id}
              className="space-y-2! animate-fade-in"
              style={{ animationDelay: `${index * 100}ms` }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2">
                    <h4 className="text-sm! font-medium! truncate">
                      {product.title}
                    </h4>
                    <Badge
                      className={`text-xs! ${getRiskBadgeColor(product.riskLevel)}`}
                    >
                      {product.riskLevel}
                    </Badge>
                  </div>
                  <div className="flex items-center gap-3 mt-1!">
                    <span className="text-xs! text-muted-foreground">
                      {product.stock} units left
                    </span>
                    <span className="text-xs! text-muted-foreground flex items-center gap-1">
                      <TrendingDownIcon className="h-3 w-3" />
                      ~{product.predictedDaysToStockout} days
                    </span>
                  </div>
                </div>
                <span className="text-sm! font-semibold! tabular-nums whitespace-nowrap">
                  {product.stockoutPercentage}%
                </span>
              </div>
              <div className="relative">
                <Progress
                  value={product.stockoutPercentage}
                  className="h-2 transition-all duration-500 ease-out"
                  indicatorClassName={getRiskColor(product.riskLevel)}
                />
                <div
                  className="absolute top-0 left-0 h-full bg-white/20 rounded-full transition-all duration-1000 ease-out animate-pulse"
                  style={{ width: `${product.stockoutPercentage}%` }}
                />
              </div>
            </div>
          ))}
        </div>

        {/* View All Button */}
        <Button
            // @ts-ignore 
          variant="outline"
          className="w-full mt-2! group hover-scale"
          onClick={onViewAll}
        >
          View All Forecasts
          <ChevronRightIcon className="ml-2! h-4 w-4 transition-transform group-hover:translate-x-1" />
        </Button>

        {/* Disclaimer */}
        <p className="text-xs! text-muted-foreground text-center pt-2! border-t border-border">
          AI predictions based on historical sales data and current trends
        </p>
      </CardContent>
    </Card>
  );
}