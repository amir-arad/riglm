import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Construction, Box } from "lucide-react";

export default function ContextsPage() {
  return (
    <div className="space-y-6">
      <div className="flex justify-between">
        <div className="space-y-1">
          <h2 className="text-3xl font-bold tracking-tight">Profiles</h2>
          <p className="text-muted-foreground">
            Save and load extension configurations.
          </p>
        </div>
      </div>

      <Card className="border-dashed border-2 border-amber-200 bg-amber-50/50">
        <CardHeader>
          <div className="flex items-center gap-2">
            <Construction className="h-5 w-5 text-amber-600" />
            <CardTitle className="text-amber-800">Coming Soon</CardTitle>
            <Badge variant="outline" className="ml-auto bg-amber-100 text-amber-800 border-amber-300">
              Phase 4
            </Badge>
          </div>
          <CardDescription className="text-amber-700">
            Extension profiles will be available in Phase 4.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-4 p-4 rounded-lg bg-white/60">
            <Box className="h-8 w-8 text-amber-600" />
            <div>
              <h4 className="font-medium text-amber-900">Quick-Switch Profiles</h4>
              <p className="text-sm text-amber-700">
                Save your favorite extension combinations as profiles and switch between them instantly.
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
