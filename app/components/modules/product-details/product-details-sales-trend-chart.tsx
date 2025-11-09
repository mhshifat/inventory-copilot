import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { TrendingDownIcon } from "lucide-react";
import { CartesianGrid, Legend, Line, LineChart, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface SalesDataPoint {
    sales: number;
    predicted: number | null;
}

interface SalesTrendChartProps {
    data: SalesDataPoint[];
}

export default function ProductDetailsSalesTrendChart({ data }: SalesTrendChartProps) {
    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <TrendingDownIcon className="h-5 w-5" />
                    Sales Trend (Last 30 Days)
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
                            dataKey="sales"
                            stroke="hsl(var(--primary))"
                            strokeWidth={2}
                            name="Actual Sales"
                            dot={{ fill: "hsl(var(--primary))" }}
                        />
                        <Line
                            type="monotone"
                            dataKey="predicted"
                            stroke="hsl(var(--muted-foreground))"
                            strokeWidth={2}
                            strokeDasharray="5 5"
                            name="Predicted"
                            dot={false}
                        />
                    </LineChart>
                </ResponsiveContainer>
            </CardContent>
        </Card>
    )
}