import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Bar, BarChart, CartesianGrid, Legend, ResponsiveContainer, Tooltip, XAxis, YAxis } from "recharts";

interface ReportsChartProps {
    units?: string;
    data?: Array<{
        name: string;
        inventory: number;
        salesVelocity: number;
    }>;
}

export default function ReportsChart({ units, data }: ReportsChartProps) {
    return (
        <Card className="shadow-md">
            <CardHeader>
                <CardTitle>Inventory Level vs Sales Velocity - Top 10 Products</CardTitle>
                <p className="text-sm! text-muted-foreground mt-2!">
                    Compare current inventory levels against daily sales velocity to identify potential stockouts
                </p>
            </CardHeader>
            <CardContent>
                <div className="h-[500px] w-full">
                    <ResponsiveContainer width="100%" height="100%">
                        <BarChart
                            data={data}
                            margin={{ top: 20, right: 30, left: 20, bottom: 80 }}
                        >
                            <CartesianGrid strokeDasharray="3 3" className="stroke-muted" />
                            <XAxis
                                dataKey="name"
                                angle={-45}
                                textAnchor="end"
                                height={80}
                                className="text-xs!"
                                tick={{ fill: "hsl(var(--muted-foreground))" }}
                            />
                            <YAxis
                                yAxisId="left"
                                orientation="left"
                                className="text-xs!"
                                tick={{ fill: "hsl(var(--muted-foreground))" }}
                                label={{
                                    value: `Inventory Level (${units})`,
                                    angle: -90,
                                    position: "insideLeft",
                                    style: { fill: "hsl(var(--muted-foreground))" },
                                }}
                            />
                            <YAxis
                                yAxisId="right"
                                orientation="right"
                                className="text-xs!"
                                tick={{ fill: "hsl(var(--muted-foreground))" }}
                                label={{
                                    value: `Sales Velocity (${units}/day)`,
                                    angle: 90,
                                    position: "insideRight",
                                    style: { fill: "hsl(var(--muted-foreground))" },
                                }}
                            />
                            <Tooltip
                                contentStyle={{
                                    backgroundColor: "hsl(var(--popover))",
                                    border: "1px solid hsl(var(--border))",
                                    borderRadius: "var(--radius)",
                                }}
                                labelStyle={{ color: "hsl(var(--popover-foreground))" }}
                            />
                            <Legend
                                wrapperStyle={{ paddingTop: "20px" }}
                                iconType="rect"
                            />
                            <Bar
                                yAxisId="left"
                                dataKey="inventory"
                                name="Inventory Level"
                                fill="hsl(var(--primary))"
                                radius={[4, 4, 0, 0]}
                            />
                            <Bar
                                yAxisId="right"
                                dataKey="salesVelocity"
                                name="Sales Velocity"
                                fill="hsl(var(--chart-2))"
                                radius={[4, 4, 0, 0]}
                            />
                        </BarChart>
                    </ResponsiveContainer>
                </div>
            </CardContent>
        </Card>
    )
}