import { Endpoint, Server } from '@/api/entities';
import {
    Card,
    CardContent,
    CardDescription,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { format } from 'date-fns';
import { AlertCircle, CheckCircle, Clock } from 'lucide-react';
import { useEffect, useState } from 'react';
import {
    Bar,
    BarChart,
    CartesianGrid,
    Line,
    LineChart,
    ResponsiveContainer,
    Tooltip,
    XAxis,
    YAxis,
} from 'recharts';

// Sample data - in a real app, this would come from an API
const SAMPLE_DATA = {
    requestsOverTime: [
        { time: '00:00', requests: 120 },
        { time: '01:00', requests: 80 },
        { time: '02:00', requests: 40 },
        { time: '03:00', requests: 30 },
        { time: '04:00', requests: 25 },
        { time: '05:00', requests: 20 },
        { time: '06:00', requests: 45 },
        { time: '07:00', requests: 90 },
        { time: '08:00', requests: 210 },
        { time: '09:00', requests: 350 },
        { time: '10:00', requests: 410 },
        { time: '11:00', requests: 380 },
        { time: '12:00', requests: 360 },
        { time: '13:00', requests: 390 },
        { time: '14:00', requests: 420 },
        { time: '15:00', requests: 380 },
        { time: '16:00', requests: 340 },
        { time: '17:00', requests: 280 },
        { time: '18:00', requests: 220 },
        { time: '19:00', requests: 180 },
        { time: '20:00', requests: 150 },
        { time: '21:00', requests: 130 },
        { time: '22:00', requests: 110 },
        { time: '23:00', requests: 90 },
    ],
    latencyOverTime: [
        { time: '00:00', latency: 85 },
        { time: '01:00', latency: 78 },
        { time: '02:00', latency: 75 },
        { time: '03:00', latency: 72 },
        { time: '04:00', latency: 70 },
        { time: '05:00', latency: 68 },
        { time: '06:00', latency: 80 },
        { time: '07:00', latency: 95 },
        { time: '08:00', latency: 110 },
        { time: '09:00', latency: 130 },
        { time: '10:00', latency: 150 },
        { time: '11:00', latency: 140 },
        { time: '12:00', latency: 135 },
        { time: '13:00', latency: 140 },
        { time: '14:00', latency: 145 },
        { time: '15:00', latency: 140 },
        { time: '16:00', latency: 130 },
        { time: '17:00', latency: 120 },
        { time: '18:00', latency: 110 },
        { time: '19:00', latency: 100 },
        { time: '20:00', latency: 95 },
        { time: '21:00', latency: 90 },
        { time: '22:00', latency: 85 },
        { time: '23:00', latency: 80 },
    ],
    toolUsage: [
        { name: 'weather_lookup', count: 450 },
        { name: 'search_web', count: 380 },
        { name: 'generate_image', count: 320 },
        { name: 'calendar_query', count: 280 },
        { name: 'stock_prices', count: 210 },
        { name: 'code_completion', count: 180 },
        { name: 'translate_text', count: 150 },
        { name: 'calculate_formula', count: 120 },
        { name: 'other_tools', count: 220 },
    ],
    recentErrors: [
        {
            id: 1,
            timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 mins ago
            endpoint: 'Production API',
            error: 'Failed to call external tool: timeout',
            status: 'resolved',
        },
        {
            id: 2,
            timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 mins ago
            endpoint: 'Testing API',
            error: "Invalid input schema: missing required parameter 'query'",
            status: 'open',
        },
        {
            id: 3,
            timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
            endpoint: 'Development API',
            error: 'Server connection lost during tool execution',
            status: 'open',
        },
        {
            id: 4,
            timestamp: new Date(Date.now() - 1000 * 60 * 240), // 4 hours ago
            endpoint: 'Production API',
            error: 'Rate limit exceeded for external API',
            status: 'resolved',
        },
    ],
    healthStatus: {
        overall: 'healthy',
        components: [
            { name: 'API Gateway', status: 'healthy', latency: 5 },
            { name: 'Tool Execution', status: 'healthy', latency: 95 },
            { name: 'Connection Manager', status: 'healthy', latency: 8 },
            { name: 'External Servers', status: 'degraded', latency: 150 },
        ],
    },
};

export default function MonitoringPage() {
    const [endpoints, setEndpoints] = useState([]);
    const [servers, setServers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [timeRange, setTimeRange] = useState('24h');

    useEffect(() => {
        fetchData();
    }, []);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [endpointsData, serversData] = await Promise.all([
                Endpoint.list(),
                Server.list(),
            ]);
            setEndpoints(endpointsData);
            setServers(serversData);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
        setIsLoading(false);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">
                        Monitoring
                    </h2>
                    <p className="text-muted-foreground">
                        Monitor system performance, activity, and health.
                    </p>
                </div>
                <div className="flex space-x-2">
                    <Tabs
                        value={timeRange}
                        onValueChange={setTimeRange}
                        className="w-[400px]"
                    >
                        <TabsList>
                            <TabsTrigger value="1h">Last Hour</TabsTrigger>
                            <TabsTrigger value="24h">Last 24 Hours</TabsTrigger>
                            <TabsTrigger value="7d">Last 7 Days</TabsTrigger>
                            <TabsTrigger value="30d">Last 30 Days</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
            </div>

            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="space-y-4"
            >
                <TabsList>
                    <TabsTrigger value="overview">Overview</TabsTrigger>
                    <TabsTrigger value="performance">Performance</TabsTrigger>
                    <TabsTrigger value="errors">Errors</TabsTrigger>
                    <TabsTrigger value="health">Health</TabsTrigger>
                </TabsList>

                <TabsContent value="overview" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Requests Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Requests Over Time</CardTitle>
                                <CardDescription>
                                    Total tool call requests processed by
                                    endpoints
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <LineChart
                                            data={SAMPLE_DATA.requestsOverTime}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="time" />
                                            <YAxis />
                                            <Tooltip />
                                            <Line
                                                type="monotone"
                                                dataKey="requests"
                                                stroke="#4f46e5"
                                                strokeWidth={2}
                                                activeDot={{ r: 6 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Tool Usage Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Tool Usage</CardTitle>
                                <CardDescription>
                                    Most frequently used tools across all
                                    endpoints
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <BarChart
                                            data={SAMPLE_DATA.toolUsage}
                                            layout="vertical"
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis type="number" />
                                            <YAxis
                                                dataKey="name"
                                                type="category"
                                                tick={{ fontSize: 12 }}
                                                width={100}
                                            />
                                            <Tooltip />
                                            <Bar
                                                dataKey="count"
                                                fill="#4f46e5"
                                                radius={[0, 4, 4, 0]}
                                            />
                                        </BarChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {/* Active Endpoints */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Active Endpoints</CardTitle>
                                <CardDescription>
                                    Currently active endpoint connections
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {endpoints
                                        .filter((e) => e.status === 'active')
                                        .slice(0, 5)
                                        .map((endpoint) => (
                                            <div
                                                key={endpoint.id}
                                                className="flex justify-between items-center"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <div className="w-2 h-2 rounded-full bg-green-500"></div>
                                                    <span className="font-medium">
                                                        {endpoint.name}
                                                    </span>
                                                </div>
                                                <div className="text-sm">
                                                    {endpoint.usage
                                                        ?.connections || 0}{' '}
                                                    connections
                                                </div>
                                            </div>
                                        ))}
                                    {endpoints.filter(
                                        (e) => e.status === 'active'
                                    ).length === 0 && (
                                        <div className="text-center py-6 text-muted-foreground">
                                            No active endpoints
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Server Status */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Server Status</CardTitle>
                                <CardDescription>
                                    Connected MCP server status
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {servers.map((server) => (
                                        <div
                                            key={server.id}
                                            className="flex justify-between items-center"
                                        >
                                            <div className="flex items-center gap-2">
                                                <div
                                                    className={`w-2 h-2 rounded-full ${
                                                        server.status ===
                                                        'active'
                                                            ? 'bg-green-500'
                                                            : server.status ===
                                                                'error'
                                                              ? 'bg-red-500'
                                                              : 'bg-gray-400'
                                                    }`}
                                                ></div>
                                                <span className="font-medium">
                                                    {server.name}
                                                </span>
                                            </div>
                                            <div className="text-sm capitalize">
                                                {server.status}
                                            </div>
                                        </div>
                                    ))}
                                    {servers.length === 0 && (
                                        <div className="text-center py-6 text-muted-foreground">
                                            No servers registered
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>

                        {/* Recent Errors */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Recent Errors</CardTitle>
                                <CardDescription>
                                    Latest system errors or warnings
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="space-y-4">
                                    {SAMPLE_DATA.recentErrors
                                        .slice(0, 3)
                                        .map((error) => (
                                            <div
                                                key={error.id}
                                                className="space-y-1"
                                            >
                                                <div className="flex items-center gap-2">
                                                    <AlertCircle className="h-4 w-4 text-red-500" />
                                                    <span className="font-medium truncate">
                                                        {error.endpoint}
                                                    </span>
                                                    <span className="ml-auto text-xs text-muted-foreground">
                                                        {format(
                                                            error.timestamp,
                                                            'HH:mm'
                                                        )}
                                                    </span>
                                                </div>
                                                <p className="text-xs text-muted-foreground pl-6 truncate">
                                                    {error.error}
                                                </p>
                                            </div>
                                        ))}
                                    {SAMPLE_DATA.recentErrors.length === 0 && (
                                        <div className="text-center py-6 text-muted-foreground">
                                            No recent errors
                                        </div>
                                    )}
                                </div>
                            </CardContent>
                        </Card>
                    </div>
                </TabsContent>

                <TabsContent value="performance" className="space-y-4">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                        {/* Response Time Chart */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Response Time</CardTitle>
                                <CardDescription>
                                    Average response time in milliseconds
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px]">
                                    <ResponsiveContainer
                                        width="100%"
                                        height="100%"
                                    >
                                        <LineChart
                                            data={SAMPLE_DATA.latencyOverTime}
                                        >
                                            <CartesianGrid strokeDasharray="3 3" />
                                            <XAxis dataKey="time" />
                                            <YAxis />
                                            <Tooltip />
                                            <Line
                                                type="monotone"
                                                dataKey="latency"
                                                stroke="#10b981"
                                                strokeWidth={2}
                                                activeDot={{ r: 6 }}
                                            />
                                        </LineChart>
                                    </ResponsiveContainer>
                                </div>
                            </CardContent>
                        </Card>

                        {/* Throughput */}
                        <Card>
                            <CardHeader>
                                <CardTitle>Throughput</CardTitle>
                                <CardDescription>
                                    Requests processed per minute
                                </CardDescription>
                            </CardHeader>
                            <CardContent>
                                <div className="h-[300px] flex items-center justify-center">
                                    <p className="text-muted-foreground">
                                        Throughput data visualization would
                                        appear here
                                    </p>
                                </div>
                            </CardContent>
                        </Card>
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Performance by Endpoint</CardTitle>
                            <CardDescription>
                                Comparative performance metrics across endpoints
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-3">
                                                Endpoint
                                            </th>
                                            <th className="px-4 py-3">
                                                Avg Response Time
                                            </th>
                                            <th className="px-4 py-3">
                                                Requests/Min
                                            </th>
                                            <th className="px-4 py-3">
                                                Error Rate
                                            </th>
                                            <th className="px-4 py-3">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {endpoints.map((endpoint, index) => (
                                            <tr
                                                key={endpoint.id}
                                                className={
                                                    index % 2
                                                        ? 'bg-gray-50 dark:bg-gray-800'
                                                        : 'bg-white dark:bg-gray-700'
                                                }
                                            >
                                                <td className="px-4 py-3 font-medium">
                                                    {endpoint.name}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {Math.floor(
                                                        Math.random() * 100
                                                    ) + 50}{' '}
                                                    ms
                                                </td>
                                                <td className="px-4 py-3">
                                                    {Math.floor(
                                                        Math.random() * 20
                                                    ) + 1}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {(
                                                        Math.random() * 2
                                                    ).toFixed(2)}
                                                    %
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center">
                                                        <div
                                                            className={`h-2.5 w-2.5 rounded-full mr-2 ${
                                                                endpoint.status ===
                                                                'active'
                                                                    ? 'bg-green-500'
                                                                    : endpoint.status ===
                                                                        'testing'
                                                                      ? 'bg-blue-500'
                                                                      : endpoint.status ===
                                                                          'deprecated'
                                                                        ? 'bg-amber-500'
                                                                        : 'bg-gray-400'
                                                            }`}
                                                        ></div>
                                                        {endpoint.status}
                                                    </div>
                                                </td>
                                            </tr>
                                        ))}
                                        {endpoints.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="px-4 py-8 text-center text-muted-foreground"
                                                >
                                                    No endpoint data available
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="errors" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Error Log</CardTitle>
                            <CardDescription>
                                System errors and exceptions
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs uppercase bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3">
                                                Timestamp
                                            </th>
                                            <th className="px-4 py-3">
                                                Endpoint
                                            </th>
                                            <th className="px-4 py-3">Error</th>
                                            <th className="px-4 py-3">
                                                Status
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {SAMPLE_DATA.recentErrors.map(
                                            (error) => (
                                                <tr
                                                    key={error.id}
                                                    className="border-b"
                                                >
                                                    <td className="px-4 py-3">
                                                        {format(
                                                            error.timestamp,
                                                            'MMM d, HH:mm:ss'
                                                        )}
                                                    </td>
                                                    <td className="px-4 py-3 font-medium">
                                                        {error.endpoint}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        {error.error}
                                                    </td>
                                                    <td className="px-4 py-3">
                                                        <span
                                                            className={`px-2 py-1 text-xs rounded-full ${
                                                                error.status ===
                                                                'resolved'
                                                                    ? 'bg-green-100 text-green-800'
                                                                    : 'bg-amber-100 text-amber-800'
                                                            }`}
                                                        >
                                                            {error.status}
                                                        </span>
                                                    </td>
                                                </tr>
                                            )
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Error Distribution</CardTitle>
                            <CardDescription>
                                Types of errors across the system
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="h-[300px] flex items-center justify-center">
                                <p className="text-muted-foreground">
                                    Error distribution chart would appear here
                                </p>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="health" className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                        {SAMPLE_DATA.healthStatus.components.map(
                            (component) => (
                                <Card key={component.name}>
                                    <CardHeader className="pb-2">
                                        <CardTitle className="text-base">
                                            {component.name}
                                        </CardTitle>
                                    </CardHeader>
                                    <CardContent>
                                        <div className="flex flex-col items-center justify-center py-4">
                                            <div
                                                className={`p-3 rounded-full ${
                                                    component.status ===
                                                    'healthy'
                                                        ? 'bg-green-100'
                                                        : component.status ===
                                                            'degraded'
                                                          ? 'bg-amber-100'
                                                          : 'bg-red-100'
                                                }`}
                                            >
                                                {component.status ===
                                                'healthy' ? (
                                                    <CheckCircle
                                                        className={`h-6 w-6 text-green-600`}
                                                    />
                                                ) : component.status ===
                                                  'degraded' ? (
                                                    <Clock
                                                        className={`h-6 w-6 text-amber-600`}
                                                    />
                                                ) : (
                                                    <AlertCircle
                                                        className={`h-6 w-6 text-red-600`}
                                                    />
                                                )}
                                            </div>
                                            <div className="mt-3 text-center">
                                                <p className="text-sm font-medium capitalize">
                                                    {component.status}
                                                </p>
                                                <p className="text-xs text-muted-foreground mt-1">
                                                    {component.latency}ms
                                                    latency
                                                </p>
                                            </div>
                                        </div>
                                    </CardContent>
                                </Card>
                            )
                        )}
                    </div>

                    <Card>
                        <CardHeader>
                            <CardTitle>Server Health</CardTitle>
                            <CardDescription>
                                Status and health of connected servers
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs uppercase bg-gray-50">
                                        <tr>
                                            <th className="px-4 py-3">
                                                Server
                                            </th>
                                            <th className="px-4 py-3">
                                                Status
                                            </th>
                                            <th className="px-4 py-3">
                                                Last Connected
                                            </th>
                                            <th className="px-4 py-3">
                                                Tools Available
                                            </th>
                                            <th className="px-4 py-3">Error</th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        {servers.map((server) => (
                                            <tr
                                                key={server.id}
                                                className="border-b"
                                            >
                                                <td className="px-4 py-3 font-medium">
                                                    {server.name}
                                                </td>
                                                <td className="px-4 py-3">
                                                    <div className="flex items-center">
                                                        <div
                                                            className={`h-2.5 w-2.5 rounded-full mr-2 ${
                                                                server.status ===
                                                                'active'
                                                                    ? 'bg-green-500'
                                                                    : server.status ===
                                                                        'error'
                                                                      ? 'bg-red-500'
                                                                      : 'bg-gray-400'
                                                            }`}
                                                        ></div>
                                                        {server.status}
                                                    </div>
                                                </td>
                                                <td className="px-4 py-3">
                                                    {server.lastConnected
                                                        ? format(
                                                              new Date(
                                                                  server.lastConnected
                                                              ),
                                                              'MMM d, HH:mm:ss'
                                                          )
                                                        : 'Never'}
                                                </td>
                                                <td className="px-4 py-3">
                                                    {server.tools
                                                        ? server.tools.length
                                                        : 0}
                                                </td>
                                                <td className="px-4 py-3 text-red-500">
                                                    {server.error || '-'}
                                                </td>
                                            </tr>
                                        ))}
                                        {servers.length === 0 && (
                                            <tr>
                                                <td
                                                    colSpan={5}
                                                    className="px-4 py-8 text-center text-muted-foreground"
                                                >
                                                    No server data available
                                                </td>
                                            </tr>
                                        )}
                                    </tbody>
                                </table>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
