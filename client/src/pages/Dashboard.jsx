import { Context, Endpoint, Server } from '@/api/entities';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { createPageUrl } from '@/utils';
import {
    Activity,
    AlertCircle,
    ArrowUpRight,
    BarChart3,
    Box,
    Clock,
    Network,
    Share2,
    Users,
} from 'lucide-react';
import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import ActivityFeed from '../components/dashboard/ActivityFeed';
import MetricCard from '../components/dashboard/MetricCard';
import StatusOverview from '../components/dashboard/StatusOverview';

export default function Dashboard() {
    const [servers, setServers] = useState([]);
    const [contexts, setContexts] = useState([]);
    const [endpoints, setEndpoints] = useState([]);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
        async function fetchData() {
            setIsLoading(true);
            try {
                const [serversData, contextsData, endpointsData] =
                    await Promise.all([
                        Server.list(),
                        Context.list(),
                        Endpoint.list(),
                    ]);
                setServers(serversData);
                setContexts(contextsData);
                setEndpoints(endpointsData);
            } catch (error) {
                console.error('Error fetching data:', error);
            }
            setIsLoading(false);
        }

        fetchData();
    }, []);

    // Calculate statistics
    const activeServers = servers.filter(
        (server) => server.status === 'active'
    ).length;
    const activeContexts = contexts.filter(
        (context) => context.status === 'active'
    ).length;
    const activeEndpoints = endpoints.filter(
        (endpoint) => endpoint.status === 'active'
    ).length;

    // Sample metrics data - would be replaced with real data in production
    const metrics = {
        requestsToday: 2457,
        averageLatency: 120, // ms
        errorRate: 0.8, // %
        activeConnections: 18,
    };

    return (
        <div className="space-y-6">
            <div className="flex flex-col space-y-2">
                <h1 className="text-3xl font-bold tracking-tight">Dashboard</h1>
                <p className="text-muted-foreground">
                    Overview of your Adaptive Business Context system.
                </p>
            </div>

            {/* Metrics Overview */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <MetricCard
                    title="Total Requests Today"
                    value={metrics.requestsToday}
                    description="+12% from yesterday"
                    icon={Activity}
                    trend="up"
                />
                <MetricCard
                    title="Average Latency"
                    value={`${metrics.averageLatency} ms`}
                    description="5ms decrease from average"
                    icon={Clock}
                    trend="down"
                />
                <MetricCard
                    title="Error Rate"
                    value={`${metrics.errorRate}%`}
                    description="Within acceptable range"
                    icon={AlertCircle}
                    trend="neutral"
                />
                <MetricCard
                    title="Active Connections"
                    value={metrics.activeConnections}
                    description="Peak of 32 today"
                    icon={Users}
                    trend="neutral"
                />
            </div>

            {/* System Status */}
            <Tabs defaultValue="overview" className="w-full">
                <TabsList className="grid grid-cols-3 md:w-[400px] mb-4">
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="activity">Activity</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                </TabsList>
                <TabsContent value="overview" className="space-y-4">
                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        <StatusOverview
                            title="Servers"
                            total={servers.length}
                            active={activeServers}
                            icon={Network}
                            color="blue"
                            link={createPageUrl('Servers')}
                        />
                        <StatusOverview
                            title="Contexts"
                            total={contexts.length}
                            active={activeContexts}
                            icon={Box}
                            color="purple"
                            link={createPageUrl('Contexts')}
                        />
                        <StatusOverview
                            title="Endpoints"
                            total={endpoints.length}
                            active={activeEndpoints}
                            icon={Share2}
                            color="green"
                            link={createPageUrl('Endpoints')}
                        />
                    </div>
                </TabsContent>
                <TabsContent value="activity" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Recent Activity</CardTitle>
                            <CardDescription>
                                Latest actions and events across the system
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <ActivityFeed />
                        </CardContent>
                    </Card>
                </TabsContent>
                <TabsContent value="performance" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>System Performance</CardTitle>
                            <CardDescription>
                                Response times and throughput metrics
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="flex items-center justify-center p-6 h-[300px] text-center text-muted-foreground">
                                <div>
                                    <BarChart3 className="h-10 w-10 mb-4 mx-auto opacity-50" />
                                    <p>
                                        Performance metrics will appear here
                                        once you have active endpoints
                                    </p>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>

            {/* Quick Actions */}
            <Card>
                <CardHeader>
                    <CardTitle>Quick Actions</CardTitle>
                    <CardDescription>
                        Common tasks to manage your system
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        <Link to={createPageUrl('Servers')} className="group">
                            <div className="border rounded-lg p-4 hover:border-primary hover:bg-primary/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-md bg-blue-100 text-blue-700">
                                        <Network className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium">
                                            Add New Server
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Connect to an MCP server
                                        </p>
                                    </div>
                                    <ArrowUpRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        </Link>
                        <Link to={createPageUrl('Contexts')} className="group">
                            <div className="border rounded-lg p-4 hover:border-primary hover:bg-primary/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-md bg-purple-100 text-purple-700">
                                        <Box className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium">
                                            Create Context
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Build a new tool composition
                                        </p>
                                    </div>
                                    <ArrowUpRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        </Link>
                        <Link to={createPageUrl('Endpoints')} className="group">
                            <div className="border rounded-lg p-4 hover:border-primary hover:bg-primary/5 transition-colors">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-md bg-green-100 text-green-700">
                                        <Share2 className="h-5 w-5" />
                                    </div>
                                    <div className="flex-1">
                                        <h3 className="font-medium">
                                            Deploy Endpoint
                                        </h3>
                                        <p className="text-sm text-muted-foreground">
                                            Expose a context as an endpoint
                                        </p>
                                    </div>
                                    <ArrowUpRight className="h-5 w-5 opacity-0 group-hover:opacity-100 transition-opacity" />
                                </div>
                            </div>
                        </Link>
                    </div>
                </CardContent>
            </Card>
        </div>
    );
}
