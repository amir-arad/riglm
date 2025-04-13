import { Context, Server } from '@/api/entities';
import ContextForm from '@/components/contexts/ContextForm';
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
    Archive,
    Box,
    CheckCircle,
    Clock,
    Copy,
    FileEdit,
    MoreVertical,
    Plus,
    Search,
    Trash,
} from 'lucide-react';
import { useEffect, useState } from 'react';

export default function ContextsPage() {
    const [contexts, setContexts] = useState([]);
    const [servers, setServers] = useState([]);
    const [filteredContexts, setFilteredContexts] = useState([]);
    const [isLoading, setIsLoading] = useState(true);
    const [searchQuery, setSearchQuery] = useState('');
    const [activeTab, setActiveTab] = useState('all');
    const [showAddContext, setShowAddContext] = useState(false);
    const [editingContext, setEditingContext] = useState(null);

    useEffect(() => {
        fetchData();
    }, []);

    useEffect(() => {
        filterContexts();
    }, [contexts, searchQuery, activeTab]);

    const fetchData = async () => {
        setIsLoading(true);
        try {
            const [contextsData, serversData] = await Promise.all([
                Context.list('-created_date'),
                Server.list(),
            ]);
            setContexts(contextsData);
            setServers(serversData);
        } catch (error) {
            console.error('Error fetching data:', error);
        }
        setIsLoading(false);
    };

    const filterContexts = () => {
        let filtered = [...contexts];

        // Filter by search query
        if (searchQuery) {
            const query = searchQuery.toLowerCase();
            filtered = filtered.filter(
                (context) =>
                    context.name.toLowerCase().includes(query) ||
                    (context.description &&
                        context.description.toLowerCase().includes(query))
            );
        }

        // Filter by status tab
        if (activeTab !== 'all') {
            filtered = filtered.filter(
                (context) => context.status === activeTab
            );
        }

        setFilteredContexts(filtered);
    };

    const handleAddContext = async (contextData) => {
        try {
            await Context.create(contextData);
            setShowAddContext(false);
            fetchData();
        } catch (error) {
            console.error('Error adding context:', error);
        }
    };

    const handleEditContext = async (contextData) => {
        try {
            await Context.update(editingContext.id, contextData);
            setEditingContext(null);
            fetchData();
        } catch (error) {
            console.error('Error updating context:', error);
        }
    };

    const handleDeleteContext = async (contextId) => {
        try {
            await Context.delete(contextId);
            fetchData();
        } catch (error) {
            console.error('Error deleting context:', error);
        }
    };

    const handleDuplicateContext = async (context) => {
        try {
            const { id, created_date, updated_date, ...contextData } = context;
            contextData.name = `${contextData.name} (Copy)`;
            await Context.create(contextData);
            fetchData();
        } catch (error) {
            console.error('Error duplicating context:', error);
        }
    };

    const handleStatusChange = async (contextId, newStatus) => {
        try {
            await Context.update(contextId, { status: newStatus });
            fetchData();
        } catch (error) {
            console.error('Error updating context status:', error);
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
            case 'deprecated':
                return (
                    <Badge
                        variant="outline"
                        className="bg-amber-50 text-amber-700 border-amber-200"
                    >
                        <Archive className="h-3 w-3 mr-1" />
                        Deprecated
                    </Badge>
                );
            default:
                return (
                    <Badge
                        variant="outline"
                        className="bg-blue-50 text-blue-700 border-blue-200"
                    >
                        <Clock className="h-3 w-3 mr-1" />
                        Draft
                    </Badge>
                );
        }
    };

    const getToolCount = (context) => {
        if (!context.tools || !Array.isArray(context.tools)) return 0;
        return context.tools.length;
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">
                        Contexts
                    </h2>
                    <p className="text-muted-foreground">
                        Manage your tool compositions and business contexts.
                    </p>
                </div>
                <div>
                    <Button
                        onClick={() => {
                            setEditingContext(null);
                            setShowAddContext(true);
                        }}
                    >
                        <Plus className="h-4 w-4 mr-2" />
                        Create Context
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
                        placeholder="Search contexts..."
                        className="pl-8"
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                    />
                </div>
            </div>

            {showAddContext && (
                <ContextForm
                    servers={servers}
                    onSubmit={handleAddContext}
                    onCancel={() => setShowAddContext(false)}
                />
            )}

            {editingContext && (
                <ContextForm
                    context={editingContext}
                    servers={servers}
                    onSubmit={handleEditContext}
                    onCancel={() => setEditingContext(null)}
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
                ) : filteredContexts.length === 0 ? (
                    <div className="col-span-full text-center py-10">
                        <Box className="h-12 w-12 mx-auto text-muted-foreground" />
                        <h3 className="mt-4 text-lg font-medium">
                            No contexts found
                        </h3>
                        <p className="text-sm text-muted-foreground mt-2">
                            {contexts.length === 0
                                ? 'Create your first context to get started'
                                : 'Try adjusting your filters or search term'}
                        </p>
                        {contexts.length === 0 && (
                            <Button
                                onClick={() => setShowAddContext(true)}
                                className="mt-4"
                            >
                                <Plus className="h-4 w-4 mr-2" />
                                Create Context
                            </Button>
                        )}
                    </div>
                ) : (
                    filteredContexts.map((context) => (
                        <Card key={context.id}>
                            <CardHeader className="pb-3">
                                <div className="flex justify-between items-start">
                                    <div className="space-y-1">
                                        <CardTitle className="flex items-center gap-2">
                                            {context.name}
                                            {context.version && (
                                                <span className="text-xs bg-gray-100 px-2 py-1 rounded-full text-gray-600">
                                                    v{context.version}
                                                </span>
                                            )}
                                        </CardTitle>
                                        <CardDescription>
                                            {context.description ||
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
                                                    setEditingContext(context)
                                                }
                                            >
                                                <FileEdit className="h-4 w-4 mr-2" />
                                                Edit
                                            </DropdownMenuItem>
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    handleDuplicateContext(
                                                        context
                                                    )
                                                }
                                            >
                                                <Copy className="h-4 w-4 mr-2" />
                                                Duplicate
                                            </DropdownMenuItem>
                                            {context.status === 'draft' && (
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        handleStatusChange(
                                                            context.id,
                                                            'active'
                                                        )
                                                    }
                                                >
                                                    <CheckCircle className="h-4 w-4 mr-2" />
                                                    Set Active
                                                </DropdownMenuItem>
                                            )}
                                            {context.status === 'active' && (
                                                <DropdownMenuItem
                                                    onClick={() =>
                                                        handleStatusChange(
                                                            context.id,
                                                            'deprecated'
                                                        )
                                                    }
                                                >
                                                    <Archive className="h-4 w-4 mr-2" />
                                                    Deprecate
                                                </DropdownMenuItem>
                                            )}
                                            <DropdownMenuItem
                                                onClick={() =>
                                                    handleDeleteContext(
                                                        context.id
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
                                    <div>{getStatusBadge(context.status)}</div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="text-sm">Tools:</div>
                                    <div className="text-sm font-medium">
                                        {getToolCount(context)}
                                    </div>
                                </div>
                                <div className="flex justify-between items-center">
                                    <div className="text-sm">Created:</div>
                                    <div className="text-sm font-medium">
                                        {context.created_date
                                            ? format(
                                                  new Date(
                                                      context.created_date
                                                  ),
                                                  'MMM d, yyyy'
                                              )
                                            : 'Unknown'}
                                    </div>
                                </div>
                                {context.parentContexts &&
                                    context.parentContexts.length > 0 && (
                                        <div className="pt-2 border-t">
                                            <p className="text-sm text-muted-foreground mb-1">
                                                Parent Contexts:
                                            </p>
                                            <div className="flex flex-wrap gap-2">
                                                {context.parentContexts.map(
                                                    (parentId) => {
                                                        const parent =
                                                            contexts.find(
                                                                (c) =>
                                                                    c.id ===
                                                                    parentId
                                                            );
                                                        return (
                                                            <Badge
                                                                key={parentId}
                                                                variant="secondary"
                                                                className="text-xs"
                                                            >
                                                                {parent?.name ||
                                                                    'Unknown'}
                                                            </Badge>
                                                        );
                                                    }
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
                                    onClick={() => setEditingContext(context)}
                                >
                                    <FileEdit className="h-3 w-3 mr-2" />
                                    Edit Context
                                </Button>
                            </CardFooter>
                        </Card>
                    ))
                )}
            </div>
        </div>
    );
}
