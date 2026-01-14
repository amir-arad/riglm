import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Construction, Layers, Rocket, Settings } from 'lucide-react';

import { Badge } from '@/components/ui/badge';

export default function Dashboard() {
    return (
        <div className="space-y-6">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                    Personal AI Extension Manager - Control Panel
                </p>
            </div>

            <Card className="border-dashed border-2 border-amber-200 bg-amber-50/50">
                <CardHeader>
                    <div className="flex items-center gap-2">
                        <Construction className="h-5 w-5 text-amber-600" />
                        <CardTitle className="text-amber-800">
                            Under Construction
                        </CardTitle>
                        <Badge
                            variant="outline"
                            className="ml-auto bg-amber-100 text-amber-800 border-amber-300"
                        >
                            Phase 4
                        </Badge>
                    </div>
                    <CardDescription className="text-amber-700">
                        The Web UI is being redesigned to work with the new
                        Extension Manager architecture.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <p className="text-sm text-amber-900">
                        The new UI will provide:
                    </p>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-white/60">
                            <Layers className="h-5 w-5 text-amber-600 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-amber-900">
                                    Extension Management
                                </h4>
                                <p className="text-sm text-amber-700">
                                    Add, configure, and organize your MCP
                                    servers
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-white/60">
                            <Settings className="h-5 w-5 text-amber-600 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-amber-900">
                                    Session Control
                                </h4>
                                <p className="text-sm text-amber-700">
                                    Toggle extensions per session in real-time
                                </p>
                            </div>
                        </div>
                        <div className="flex items-start gap-3 p-3 rounded-lg bg-white/60">
                            <Rocket className="h-5 w-5 text-amber-600 mt-0.5" />
                            <div>
                                <h4 className="font-medium text-amber-900">
                                    Live Updates
                                </h4>
                                <p className="text-sm text-amber-700">
                                    WebSocket-powered real-time status
                                </p>
                            </div>
                        </div>
                    </div>
                </CardContent>
            </Card>

            <Card>
                <CardHeader>
                    <CardTitle>Server Status</CardTitle>
                    <CardDescription>
                        The backend server is running and ready to accept MCP
                        connections.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <p className="text-sm text-muted-foreground">
                        Connect your MCP clients (Claude Code, Cursor, Cline) to
                        the server endpoints defined in your{' '}
                        <code className="px-1.5 py-0.5 bg-muted rounded text-xs">
                            server/data/config.local.json5
                        </code>{' '}
                        file.
                    </p>
                </CardContent>
            </Card>
        </div>
    );
}
