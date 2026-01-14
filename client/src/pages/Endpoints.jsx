import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Construction, Users } from "lucide-react";

export default function EndpointsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Sessions</h2>
          <p className="text-muted-foreground">
            Monitor and control active MCP client connections.
          </p>
        </div>
      </div>

      <Card className="border-dashed border-2 border-amber-200 bg-amber-50/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Construction className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-amber-800">Coming Soon</CardTitle>
            <Badge variant="outline" className="ml-auto bg-amber-100 text-amber-800 border-amber-300">
              Phase 2 + 3
            </Badge>
          </div>
          <CardDescription className="text-amber-700">
            Session management will be available after Phase 2 (dynamic state) and Phase 3 (WebSocket).
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 rounded-lg bg-white/60">
            <Users className="h-8 w-8 text-amber-600" />
            <div>
              <h4 className="font-medium text-amber-900">Live Session Control</h4>
              <p className="text-sm text-amber-700">
                See connected MCP clients in real-time and toggle extensions per session with instant updates.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
