import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { CalendarIcon } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface InventoryPredictionDataPoint {
    date: string;
    inventory: number;
}

interface ProductDetailsDepletionPredictionChartProps {
    data: InventoryPredictionDataPoint[];
}

export default function ProductDetailsDepletionPredictionChart({ data }: ProductDetailsDepletionPredictionChartProps) {
   return (
      <Card className="shadow-md">
            <CardHeader>
               <CardTitle className="flex items-center gap-2">
                  <CalendarIcon className="h-5 w-5" />
                  Predicted Inventory Depletion
               </CardTitle>
            </CardHeader>
            <CardContent>
               <ResponsiveContainer width="100%" height={300}>
                  <LineChart data={data}>
                        <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                        <XAxis
                           dataKey="date"
                           stroke="hsl(var(--muted-foreground))"
                           fontSize={12}
                        />
                        <YAxis
                           stroke="hsl(var(--muted-foreground))"
                           fontSize={12}
                        />
                        <Tooltip
                           contentStyle={{
                              backgroundColor: "hsl(var(--card))",
                              border: "1px solid hsl(var(--border))",
                              borderRadius: "var(--radius)",
                           }}
                        />
                        <Legend />
                        <Line
                           type="monotone"
                           dataKey="inventory"
                           stroke="hsl(var(--destructive))"
                           strokeWidth={2}
                           name="Predicted Stock Level"
                           dot={false}
                        />
                  </LineChart>
               </ResponsiveContainer>
            </CardContent>
      </Card>
   ) 
}