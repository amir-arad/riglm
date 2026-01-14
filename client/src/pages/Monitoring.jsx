import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Construction, Activity } from "lucide-react";

export default function MonitoringPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Monitoring</h2>
          <p className="text-muted-foreground">
            Monitor system performance and activity.
          </p>
        </div>
      </div>

      <Card className="border-dashed border-2 border-amber-200 bg-amber-50/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Construction className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-amber-800">Coming Soon</CardTitle>
            <Badge variant="outline" className="ml-auto bg-amber-100 text-amber-800 border-amber-300">
              Future
            </Badge>
          </div>
          <CardDescription className="text-amber-700">
            Monitoring and analytics will be added in a future phase.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 rounded-lg bg-white/60">
            <Activity className="h-8 w-8 text-amber-600" />
            <div>
              <h4 className="font-medium text-amber-900">Performance Metrics</h4>
              <p className="text-sm text-amber-700">
                Track tool usage, response times, and system health across all your extensions.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
