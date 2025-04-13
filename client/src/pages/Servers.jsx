import { Server } from '@/api/entities';
import ServerForm from '@/components/servers/ServerForm';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Input } from '@/components/ui/input';
import { Tabs, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    AlertCircle,
    CheckCircle,
    MoreVertical,
    Network,
    Plus,
    RefreshCw,
    Search,
    Settings,
    Trash,
} from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ServersPage() {
    const [servers, setServers] = useState([]);
    const [filteredServers, setFilteredServers] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [showAddServer, setShowAddServer] = useState(false);
    const [editingServer, setEditingServer] = useState(null);
    const [refreshing, setRefreshing] = useState({});

    useEffect(() => {
        fetchServers();
    }, []);

    useEffect(() => {
        filterServers();
    }, [servers, searchQuery, activeTab]);

    const fetchServers = async () => {
        setIsLoading(true);
        try {
            const data = await Server.list();
            setServers(data);
        } catch (error) {
            console.error('Error fetching servers:', error);
        }
        setIsLoading(false);
    };

    const filterServers = () => {
        let filtered = [...servers];

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (server) =>
                    server.name.toLowerCase().includes(query) ||
                    server.url.toLowerCase().includes(query)
            );
        }

        // Filter by status tab
        if (activeTab !== 'all') {
            filtered = filtered.filter((server) => server.status === activeTab);
        }

        setFilteredServers(filtered);
    };

    const handleAddServer = async (serverData) => {
        try {
            await Server.create(serverData);
            setShowAddServer(false);
            fetchServers();
        } catch (error) {
            console.error('Error adding server:', error);
        }
    };

    const handleEditServer = async (serverData) => {
        try {
            await Server.update(editingServer.id, serverData);
            setEditingServer(null);
            fetchServers();
        } catch (error) {
            console.error('Error updating server:', error);
        }
    };

    const handleDeleteServer = async (serverId) => {
        try {
            await Server.delete(serverId);
            fetchServers();
        } catch (error) {
            console.error('Error deleting server:', error);
        }
    };

    const handleRefreshStatus = async (serverId) => {
        setRefreshing((prev) => ({ ...prev, [serverId]: true }));
        try {
            // Simulate status check - in a real app this would make an actual connection test
            await new Promise((resolve) => setTimeout(resolve, 1500));

            const server = servers.find((s) => s.id === serverId);
            if (server) {
                // Randomly assign a status for demo purposes
                const newStatus = Math.random() > 0.3 ? 'active' : 'error';
                const error =
                    newStatus === 'error' ? 'Connection refused' : null;

                await Server.update(serverId, {
                    status: newStatus,
                    error: error,
                    lastConnected:
                        newStatus === 'active'
                            ? new Date().toISOString()
                            : server.lastConnected,
                });
                fetchServers();
            }
        } catch (error) {
            console.error('Error refreshing server status:', error);
        } finally {
            setRefreshing((prev) => ({ ...prev, [serverId]: false }));
        }
    };

    const getStatusBadge = (status) => {
        switch (status) {
            case 'active':
                return (
                    <Badge
                        variant="outline"
                        className="bg-green-50 text-green-700 border-green-200"
                    >
                        <CheckCircle className="w-3 h-3 mr-1" />
                        Active
                    </Badge>
                );
            case 'error':
                return (
                    <Badge
                        variant="outline"
                        className="bg-red-50 text-red-700 border-red-200"
                    >
                        <AlertCircle className="w-3 h-3 mr-1" />
                        Error
                    </Badge>
                );
            default:
                return (
                    <Badge
                        variant="outline"
                        className="bg-gray-50 text-gray-500 border-gray-200"
                    >
                        Inactive
                    </Badge>
                );
        }
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">
                        Servers
                    </h2>
                    <p className="text-muted-foreground">
                        Manage connections to your MCP servers.
                    </p>
                </div>
                <div>
                    <Button
                        onClick={() => {
                            setEditingServer(null);
                            setShowAddServer(true);
                        }}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Add Server
                    </Button>
                </div>
            </div>

            <div className="flex items-center justify-between">
                <div className="flex items-center space-x-2">
                    <Tabs
                        value={activeTab}
                        onValueChange={setActiveTab}
                        className="w-full"
                    >
                        <TabsList>
                            <TabsTrigger value="all">All</TabsTrigger>
                            <TabsTrigger value="active">Active</TabsTrigger>
                            <TabsTrigger value="inactive">Inactive</TabsTrigger>
                            <TabsTrigger value="error">Error</TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                <div className="relative w-[300px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search servers..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {showAddServer && (
                <ServerForm
                    onSubmit={handleAddServer}
                    onCancel={() => setShowAddServer(false)}
                />
            )}

            {editingServer && (
                <ServerForm
                    server={editingServer}
                    onSubmit={handleEditServer}
                    onCancel={() => setEditingServer(null)}
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {isLoading ? (
                    Array(3)
                        .fill(0)
                        .map((_, index) => (
                            <Card
                                key={`skeleton-${index}`}
                                className="opacity-70 animate-pulse"
                            >
                                <CardHeader className="pb-3">
                                    <div className="h-5 w-3/4 bg-gray-200 rounded mb-2"></div>
                                    <div className="h-4 w-1/2 bg-gray-100 rounded"></div>
                                </CardHeader>
                                <CardContent>
                                    <div className="h-4 w-full bg-gray-100 rounded mb-4"></div>
                                    <div className="h-4 w-2/3 bg-gray-100 rounded"></div>
                                </CardContent>
                                <CardFooter>
                                    <div className="h-8 w-full bg-gray-200 rounded"></div>
                                </CardFooter>
                            </Card>
                        ))
                ) : filteredServers.length === 0 ? (
                    <div className="col-span-full text-center py-10">
                        <Network className="h-12 w-12 mx-auto text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">
                            No servers found
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            {servers.length === 0
                                ? 'Add your first server to get started'
                                : 'Try adjusting your filters or search term'}
                        </p>
                        {servers.length === 0 && (
                            <Button
                                onClick={() => setShowAddServer(true)}
                                className="mt-4"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Add Server
                            </Button>
                        )}
                    </div>
                ) : (
                    filteredServers.map((server) => (
                        <Card key={server.id} className="overflow-hidden">
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div>
                                        <CardTitle>{server.name}</CardTitle>
                                        <CardDescription>
                                            {server.url}
                                        </CardDescription>
                                    </div>
                                    <DropdownMenu>
                                        <DropdownMenuTrigger asChild>
                                            <Button
                                                variant="ghost"
                                                size="icon"
                                                className="h-8 w-8"
                                            >
                                                <MoreVertical className="h-4 w-4" />
                                            </Button>
                                        </DropdownMenuTrigger>
                                        <DropdownMenuContent align="end">
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    setEditingServer(server)
                                                }
                                            >
                                                <Settings className="h-4 w-4 mr-2" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    handleRefreshStatus(
                                                        server.id
                                                    )
                                                }
                                                disabled={refreshing[server.id]}
                                            >
                                                <RefreshCw
                                                    className={`h-4 w-4 mr-2 ${refreshing[server.id] ? 'animate-spin' : ''}`}
                                                />
                                                Refresh Status
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    handleDeleteServer(
                                                        server.id
                                                    )
                                                }
                                                className="text-red-600 focus:text-red-600"
                                            >
                                                <Trash className="h-4 w-4 mr-2" />
                                                Delete
                                            </DropdownMenuItem>
                                        </DropdownMenuContent>
                                    </DropdownMenu>
                                </div>
                            </CardHeader>
                            <CardContent className="pb-3 space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="text-sm">Status:</div>
                                    <div>{getStatusBadge(server.status)}</div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="text-sm">Auth Type:</div>
                                    <div className="text-sm font-medium">
                                        {server.authType === 'none'
                                            ? 'None'
                                            : server.authType === 'apiKey'
                                              ? 'API Key'
                                              : 'Basic Auth'}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="text-sm">Tools:</div>
                                    <div className="text-sm font-medium">
                                        {server.tools ? server.tools.length : 0}
                                    </div>
                                </div>
                                {server.status === 'error' && server.error && (
                                    <div className="text-sm text-red-600 border-t border-red-100 pt-2 mt-2">
                                        Error: {server.error}
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    disabled={refreshing[server.id]}
                                    onClick={() =>
                                        handleRefreshStatus(server.id)
                                    }
                                >
                                    {refreshing[server.id] ? (
                                        <>
                                            <RefreshCw className="h-3 w-3 mr-2 animate-spin" />
                                            Checking Connection...
                                        </>
                                    ) : (
                                        <>
                                            <RefreshCw className="h-3 w-3 mr-2" />
                                            Check Connection
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
