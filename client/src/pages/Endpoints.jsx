import { Context, Endpoint } from '@/api/entities';
import EndpointForm from '@/components/endpoints/EndpointForm';
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
import { format } from 'date-fns';
import {
    Activity,
    AlertCircle,
    CheckCircle,
    Clock,
    FileEdit,
    Key,
    Link as LinkIcon,
    MoreVertical,
    Plus,
    Search,
    Settings,
    Share2,
    Trash,
} from 'lucide-react';
import { useEffect, useState } from 'react';

export default function EndpointsPage() {
    const [endpoints, setEndpoints] = useState([]);
    const [contexts, setContexts] = useState([]);
    const [filteredEndpoints, setFilteredEndpoints] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [showAddEndpoint, setShowAddEndpoint] = useState(false);
    const [editingEndpoint, setEditingEndpoint] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        filterEndpoints();
    }, [endpoints, searchQuery, activeTab]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [endpointsData, contextsData] = await Promise.all([
                Endpoint.list('-created_date'),
                Context.list(),
            ]);
            setEndpoints(endpointsData);
            setContexts(contextsData);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
        setIsLoading(false);
    };

    const filterEndpoints = () => {
        let filtered = [...endpoints];

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (endpoint) =>
                    endpoint.name.toLowerCase().includes(query) ||
                    (endpoint.description &&
                        endpoint.description.toLowerCase().includes(query)) ||
                    (endpoint.url && endpoint.url.toLowerCase().includes(query))
            );
        }

        // Filter by status tab
        if (activeTab !== 'all') {
            filtered = filtered.filter(
                (endpoint) => endpoint.status === activeTab
            );
        }

        setFilteredEndpoints(filtered);
    };

    const handleAddEndpoint = async (endpointData) => {
        try {
            await Endpoint.create(endpointData);
            setShowAddEndpoint(false);
            fetchData();
        } catch (error) {
            console.error('Error adding endpoint:', error);
        }
    };

    const handleEditEndpoint = async (endpointData) => {
        try {
            await Endpoint.update(editingEndpoint.id, endpointData);
            setEditingEndpoint(null);
            fetchData();
        } catch (error) {
            console.error('Error updating endpoint:', error);
        }
    };

    const handleDeleteEndpoint = async (endpointId) => {
        try {
            await Endpoint.delete(endpointId);
            fetchData();
        } catch (error) {
            console.error('Error deleting endpoint:', error);
        }
    };

    const handleStatusChange = async (endpointId, newStatus) => {
        try {
            await Endpoint.update(endpointId, { status: newStatus });
            fetchData();
        } catch (error) {
            console.error('Error updating endpoint status:', error);
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
                        <CheckCircle className="h-3 w-3 mr-1" />
                        Active
                    </Badge>
                );
            case 'testing':
                return (
                    <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200"
                    >
                        <Activity className="h-3 w-3 mr-1" />
                        Testing
                    </Badge>
                );
            case 'deprecated':
                return (
                    <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-200"
                    >
                        <AlertCircle className="h-3 w-3 mr-1" />
                        Deprecated
                    </Badge>
                );
            default:
                return (
                    <Badge
                        variant="outline"
                        className="bg-purple-50 text-purple-700 border-purple-200"
                    >
                        <Clock className="h-3 w-3 mr-1" />
                        Draft
                    </Badge>
                );
        }
    };

    const getContextName = (contextId) => {
        if (!contextId) return 'None';
        const context = contexts.find((c) => c.id === contextId);
        return context ? context.name : 'Unknown';
    };

    const getContextsInfo = (contextIds) => {
        if (!contextIds || contextIds.length === 0) return 'None';

        if (contextIds.length === 1) {
            const context = contexts.find((c) => c.id === contextIds[0]);
            return context ? context.name : 'Unknown';
        }

        return `${contextIds.length} contexts`;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">
                        Endpoints
                    </h2>
                    <p className="text-muted-foreground">
                        Manage MCP endpoints that expose contexts to clients.
                    </p>
                </div>
                <div>
                    <Button
                        onClick={() => {
                            setEditingEndpoint(null);
                            setShowAddEndpoint(true);
                        }}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Endpoint
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
                            <TabsTrigger value="draft">Draft</TabsTrigger>
                            <TabsTrigger value="testing">Testing</TabsTrigger>
                            <TabsTrigger value="active">Active</TabsTrigger>
                            <TabsTrigger value="deprecated">
                                Deprecated
                            </TabsTrigger>
                        </TabsList>
                    </Tabs>
                </div>
                <div className="relative w-[300px]">
                    <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                    <Input
                        placeholder="Search endpoints..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {showAddEndpoint && (
                <EndpointForm
                    contexts={contexts}
                    onSubmit={handleAddEndpoint}
                    onCancel={() => setShowAddEndpoint(false)}
                />
            )}

            {editingEndpoint && (
                <EndpointForm
                    endpoint={editingEndpoint}
                    contexts={contexts}
                    onSubmit={handleEditEndpoint}
                    onCancel={() => setEditingEndpoint(null)}
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
                ) : filteredEndpoints.length === 0 ? (
                    <div className="col-span-full text-center py-10">
                        <Share2 className="h-12 w-12 mx-auto text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">
                            No endpoints found
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            {endpoints.length === 0
                                ? 'Create your first endpoint to expose contexts to clients'
                                : 'Try adjusting your filters or search term'}
                        </p>
                        {endpoints.length === 0 && (
                            <Button
                                onClick={() => setShowAddEndpoint(true)}
                                className="mt-4"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Create Endpoint
                            </Button>
                        )}
                    </div>
                ) : (
                    filteredEndpoints.map((endpoint) => (
                        <Card key={endpoint.id}>
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle>{endpoint.name}</CardTitle>
                                        <CardDescription>
                                            {endpoint.description ||
                                                'No description'}
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
                                                    setEditingEndpoint(endpoint)
                                                }
                                            >
                                                <FileEdit className="h-4 w-4 mr-2" />
                                                Edit
                                            </DropdownMenuItem>
                                            {endpoint.status === 'draft' && (
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        handleStatusChange(
                                                            endpoint.id,
                                                            'testing'
                                                        )
                                                    }
                                                >
                                                    <Activity className="h-4 w-4 mr-2" />
                                                    Move to Testing
                                                </DropdownMenuItem>
                                            )}
                                            {endpoint.status === 'testing' && (
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        handleStatusChange(
                                                            endpoint.id,
                                                            'active'
                                                        )
                                                    }
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                    Activate
                                                </DropdownMenuItem>
                                            )}
                                            {endpoint.status === 'active' && (
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        handleStatusChange(
                                                            endpoint.id,
                                                            'deprecated'
                                                        )
                                                    }
                                                >
                                                    <AlertCircle className="h-4 w-4 mr-2" />
                                                    Deprecate
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    handleDeleteEndpoint(
                                                        endpoint.id
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
                            <CardContent className="space-y-3">
                                <div className="flex justify-between items-center">
                                    <div className="text-sm">Status:</div>
                                    <div>{getStatusBadge(endpoint.status)}</div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="text-sm">Contexts:</div>
                                    <div className="text-sm font-medium">
                                        {getContextsInfo(endpoint.contextIds)}
                                    </div>
                                </div>
                                {endpoint.url && (
                                    <div className="flex justify-between items-center">
                                        <div className="text-sm">URL:</div>
                                        <div className="text-sm font-medium truncate max-w-[180px]">
                                            <div className="flex items-center gap-1">
                                                <LinkIcon className="h-3 w-3 text-blue-500" />
                                                <span className="text-blue-500">
                                                    {endpoint.url}
                                                </span>
                                            </div>
                                        </div>
                                    </div>
                                )}
                                {endpoint.apiKey && (
                                    <div className="flex justify-between items-center">
                                        <div className="text-sm">Auth:</div>
                                        <Badge
                                            variant="outline"
                                            className="text-xs"
                                        >
                                            <Key className="h-3 w-3 mr-1" />
                                            API Key
                                        </Badge>
                                    </div>
                                )}
                                {endpoint.usage && (
                                    <div className="border-t pt-2 mt-2">
                                        <div className="grid grid-cols-2 gap-2 text-xs">
                                            <div className="text-muted-foreground">
                                                Requests:
                                            </div>
                                            <div className="text-right font-medium">
                                                {endpoint.usage.requests || 0}
                                            </div>
                                            <div className="text-muted-foreground">
                                                Connections:
                                            </div>
                                            <div className="text-right font-medium">
                                                {endpoint.usage.connections ||
                                                    0}
                                            </div>
                                            {endpoint.usage.lastUsed && (
                                                <>
                                                    <div className="text-muted-foreground">
                                                        Last Used:
                                                    </div>
                                                    <div className="text-right font-medium">
                                                        {format(
                                                            new Date(
                                                                endpoint.usage.lastUsed
                                                            ),
                                                            'MMM d, HH:mm'
                                                        )}
                                                    </div>
                                                </>
                                            )}
                                        </div>
                                    </div>
                                )}
                            </CardContent>
                            <CardFooter>
                                <Button
                                    variant="outline"
                                    size="sm"
                                    className="w-full"
                                    onClick={() => setEditingEndpoint(endpoint)}
                                >
                                    <Settings className="h-3 w-3 mr-2" />
                                    Manage Endpoint
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
