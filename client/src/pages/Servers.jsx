import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Construction, Network } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

export default function ServersPage() {
    return (
        <div className="space-y-6">
            <div className="flex justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">
                        Extensions
                    </h2>
                    <p className="text-muted-foreground">
                        Manage your MCP server extensions.
                    </p>
                </div>
            </div>

            <Card className="border-dashed border-2 border-amber-200 bg-amber-50/50">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Construction className="h-5 w-5 text-amber-600" />
                        <CardTitle className="text-amber-800">
                            Coming Soon
                        </CardTitle>
                        <Badge
                            variant="outline"
                            className="ml-auto bg-amber-100 text-amber-800 border-amber-300"
                        >
                            Phase 1.4
                        </Badge>
                    </div>
                    <CardDescription className="text-amber-700">
                        Extension management is being implemented.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="flex items-center gap-4 p-4 rounded-lg bg-white/60">
                        <Network className="h-8 w-8 text-amber-600" />
                        <div>
                            <h4 className="font-medium text-amber-900">
                                Extension Registry
                            </h4>
                            <p className="text-sm text-amber-700">
                                Soon you&apos;ll be able to add, edit, and
                                manage your MCP extensions from this page. For
                                now, configure extensions in your{' '}
                                <code className="px-1 py-0.5 bg-amber-100 rounded text-xs">
                                    server/data/config.local.json5
                                </code>{' '}
                                file.
                            </p>
                        </div>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
