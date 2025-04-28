import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardDescription,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Textarea } from '@/components/ui/textarea';
import {
    Box,
    Code,
    GripVertical,
    Plus,
    Save,
    Settings,
    Trash,
    X,
} from 'lucide-react';
import { useState } from 'react';

export default function ContextForm({
    context = null,
    servers = [],
    onSubmit,
    onCancel,
}) {
    const [activeTab, setActiveTab] = useState('details');
    const [formData, setFormData] = useState({
        name: context?.name || '',
        description: context?.description || '',
        version: context?.version || '1.0.0',
        status: context?.status || 'draft',
        guidelines: context?.guidelines || '',
        tools: context?.tools || [],
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));

        // Clear validation errors when field is changed
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: null }));
        }
    };

    const handleToolChange = (index, field, value) => {
        const updatedTools = [...formData.tools];
        updatedTools[index] = { ...updatedTools[index], [field]: value };

        setFormData((prev) => ({ ...prev, tools: updatedTools }));
    };

    const addTool = () => {
        setFormData((prev) => ({
            ...prev,
            tools: [
                ...prev.tools,
                {
                    serverId: servers[0]?.id || '',
                    originalName: '',
                    exposedName: '',
                    description: '',
                    inputSchema: {},
                    configuration: {},
                },
            ],
        }));
    };

    const removeTool = (index) => {
        setFormData((prev) => ({
            ...prev,
            tools: prev.tools.filter((_, i) => i !== index),
        }));
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        // Validate tools if any
        if (formData.tools.length > 0) {
            const toolErrors = [];
            formData.tools.forEach((tool, index) => {
                const toolError = {};

                if (!tool.serverId) {
                    toolError.serverId = 'Server is required';
                }

                if (!tool.originalName) {
                    toolError.originalName = 'Tool name is required';
                }

                if (!tool.exposedName) {
                    toolError.exposedName = 'Exposed name is required';
                }

                if (Object.keys(toolError).length > 0) {
                    toolErrors[index] = toolError;
                }
            });

            if (toolErrors.length > 0) {
                newErrors.tools = toolErrors;
            }
        }

        setErrors(newErrors);
        return Object.keys(newErrors).length === 0;
    };

    const handleSubmit = async (e) => {
        e.preventDefault();

        if (!validate()) {
            return;
        }

        setIsSubmitting(true);
        try {
            await onSubmit(formData);
        } catch (error) {
            console.error('Error submitting context form:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card className="mb-6">
            <form onSubmit={handleSubmit}>
                <CardHeader className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Box className="h-5 w-5" />
                        <CardTitle>
                            {context ? 'Edit Context' : 'Create Context'}
                        </CardTitle>
                    </div>
                    <CardDescription>
                        Define a composition of tools for a specific business
                        purpose
                    </CardDescription>
                </CardHeader>
                <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="px-6 pb-2">
                        <TabsList className="grid grid-cols-3 w-full lg:w-[400px]">
                            <TabsTrigger value="details">Details</TabsTrigger>
                            <TabsTrigger value="tools">Tools</TabsTrigger>
                            <TabsTrigger value="advanced">Advanced</TabsTrigger>
                        </TabsList>
                    </div>
                    <CardContent className="space-y-4">
                        <TabsContent value="details" className="space-y-4">
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div className="space-y-2">
                                    <Label htmlFor="name">Context Name</Label>
                                    <Input
                                        id="name"
                                        placeholder="Enter descriptive name"
                                        value={formData.name}
                                        onChange={(e) =>
                                            handleChange('name', e.target.value)
                                        }
                                        className={
                                            errors.name ? 'border-red-500' : ''
                                        }
                                    />
                                    {errors.name && (
                                        <p className="text-xs text-red-500">
                                            {errors.name}
                                        </p>
                                    )}
                                </div>
                                <div className="space-y-2">
                                    <Label htmlFor="version">Version</Label>
                                    <Input
                                        id="version"
                                        placeholder="1.0.0"
                                        value={formData.version}
                                        onChange={(e) =>
                                            handleChange(
                                                'version',
                                                e.target.value
                                            )
                                        }
                                    />
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="description">Description</Label>
                                <Textarea
                                    id="description"
                                    placeholder="Describe the purpose of this context"
                                    value={formData.description}
                                    onChange={(e) =>
                                        handleChange(
                                            'description',
                                            e.target.value
                                        )
                                    }
                                    rows={3}
                                />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="status">Status</Label>
                                <Select
                                    value={formData.status}
                                    onValueChange={(value) =>
                                        handleChange('status', value)
                                    }
                                >
                                    <SelectTrigger>
                                        <SelectValue placeholder="Select status" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="draft">
                                            Draft
                                        </SelectItem>
                                        <SelectItem value="active">
                                            Active
                                        </SelectItem>
                                        <SelectItem value="deprecated">
                                            Deprecated
                                        </SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="guidelines">
                                    Usage Guidelines
                                </Label>
                                <Textarea
                                    id="guidelines"
                                    placeholder="(Optional) Provide guidelines for using this context"
                                    value={formData.guidelines}
                                    onChange={(e) =>
                                        handleChange(
                                            'guidelines',
                                            e.target.value
                                        )
                                    }
                                    rows={4}
                                />
                            </div>
                        </TabsContent>

                        <TabsContent value="tools" className="space-y-4">
                            <div className="flex justify-between items-center">
                                <h3 className="text-sm font-medium">
                                    Tools in this Context
                                </h3>
                                <Button
                                    type="button"
                                    variant="outline"
                                    size="sm"
                                    onClick={addTool}
                                >
                                    <Plus className="h-3 w-3 mr-1" />
                                    Add Tool
                                </Button>
                            </div>

                            {formData.tools.length === 0 ? (
                                <div className="text-center py-8 border rounded-md bg-gray-50">
                                    <Box className="h-8 w-8 mx-auto text-muted-foreground mb-2" />
                                    <p className="text-muted-foreground">
                                        No tools added yet
                                    </p>
                                    <Button
                                        type="button"
                                        variant="outline"
                                        size="sm"
                                        onClick={addTool}
                                        className="mt-4"
                                    >
                                        <Plus className="h-3 w-3 mr-1" />
                                        Add Tool
                                    </Button>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {formData.tools.map((tool, index) => (
                                        <div
                                            key={index}
                                            className="border rounded-md p-4 bg-gray-50"
                                        >
                                            <div className="flex justify-between items-center mb-4">
                                                <div className="flex items-center gap-2">
                                                    <GripVertical className="h-4 w-4 text-muted-foreground cursor-move" />
                                                    <h4 className="font-medium text-sm">
                                                        Tool #{index + 1}
                                                    </h4>
                                                </div>
                                                <Button
                                                    type="button"
                                                    variant="ghost"
                                                    size="icon"
                                                    onClick={() =>
                                                        removeTool(index)
                                                    }
                                                    className="h-7 w-7 text-red-500 hover:text-red-600 hover:bg-red-50"
                                                >
                                                    <Trash className="h-4 w-4" />
                                                </Button>
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                                                <div className="space-y-1">
                                                    <Label
                                                        htmlFor={`tool-${index}-server`}
                                                        className="text-xs"
                                                    >
                                                        Server
                                                    </Label>
                                                    <Select
                                                        value={tool.serverId}
                                                        onValueChange={(
                                                            value
                                                        ) =>
                                                            handleToolChange(
                                                                index,
                                                                'serverId',
                                                                value
                                                            )
                                                        }
                                                    >
                                                        <SelectTrigger className="h-8 text-sm">
                                                            <SelectValue placeholder="Select server" />
                                                        </SelectTrigger>
                                                        <SelectContent>
                                                            {servers.map(
                                                                (server) => (
                                                                    <SelectItem
                                                                        key={
                                                                            server.id
                                                                        }
                                                                        value={
                                                                            server.id
                                                                        }
                                                                    >
                                                                        {
                                                                            server.name
                                                                        }
                                                                    </SelectItem>
                                                                )
                                                            )}
                                                        </SelectContent>
                                                    </Select>
                                                    {errors.tools &&
                                                        errors.tools[index]
                                                            ?.serverId && (
                                                            <p className="text-xs text-red-500">
                                                                {
                                                                    errors
                                                                        .tools[
                                                                        index
                                                                    ].serverId
                                                                }
                                                            </p>
                                                        )}
                                                </div>

                                                <div className="space-y-1">
                                                    <Label
                                                        htmlFor={`tool-${index}-original`}
                                                        className="text-xs"
                                                    >
                                                        Original Tool Name
                                                    </Label>
                                                    <Input
                                                        id={`tool-${index}-original`}
                                                        placeholder="e.g., weather_lookup"
                                                        value={
                                                            tool.originalName
                                                        }
                                                        onChange={(e) =>
                                                            handleToolChange(
                                                                index,
                                                                'originalName',
                                                                e.target.value
                                                            )
                                                        }
                                                        className={`h-8 text-sm ${errors.tools && errors.tools[index]?.originalName ? 'border-red-500' : ''}`}
                                                    />
                                                    {errors.tools &&
                                                        errors.tools[index]
                                                            ?.originalName && (
                                                            <p className="text-xs text-red-500">
                                                                {
                                                                    errors
                                                                        .tools[
                                                                        index
                                                                    ]
                                                                        .originalName
                                                                }
                                                            </p>
                                                        )}
                                                </div>

                                                <div className="space-y-1">
                                                    <Label
                                                        htmlFor={`tool-${index}-exposed`}
                                                        className="text-xs"
                                                    >
                                                        Exposed As
                                                    </Label>
                                                    <Input
                                                        id={`tool-${index}-exposed`}
                                                        placeholder="e.g., getWeather"
                                                        value={tool.exposedName}
                                                        onChange={(e) =>
                                                            handleToolChange(
                                                                index,
                                                                'exposedName',
                                                                e.target.value
                                                            )
                                                        }
                                                        className={`h-8 text-sm ${errors.tools && errors.tools[index]?.exposedName ? 'border-red-500' : ''}`}
                                                    />
                                                    {errors.tools &&
                                                        errors.tools[index]
                                                            ?.exposedName && (
                                                            <p className="text-xs text-red-500">
                                                                {
                                                                    errors
                                                                        .tools[
                                                                        index
                                                                    ]
                                                                        .exposedName
                                                                }
                                                            </p>
                                                        )}
                                                </div>

                                                <div className="space-y-1">
                                                    <Label
                                                        htmlFor={`tool-${index}-description`}
                                                        className="text-xs"
                                                    >
                                                        Description (Optional)
                                                    </Label>
                                                    <Input
                                                        id={`tool-${index}-description`}
                                                        placeholder="Override tool description"
                                                        value={
                                                            tool.description ||
                                                            ''
                                                        }
                                                        onChange={(e) =>
                                                            handleToolChange(
                                                                index,
                                                                'description',
                                                                e.target.value
                                                            )
                                                        }
                                                        className="h-8 text-sm"
                                                    />
                                                </div>
                                            </div>

                                            <div className="flex gap-2 mt-3">
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-xs h-7"
                                                    onClick={() => {
                                                        // This would open a modal to edit the schema in a real app
                                                        alert(
                                                            'Schema editor would open here'
                                                        );
                                                    }}
                                                >
                                                    <Code className="h-3 w-3 mr-1" />
                                                    Edit Schema
                                                </Button>
                                                <Button
                                                    type="button"
                                                    variant="outline"
                                                    size="sm"
                                                    className="text-xs h-7"
                                                    onClick={() => {
                                                        // This would open a modal to edit the configuration in a real app
                                                        alert(
                                                            'Configuration editor would open here'
                                                        );
                                                    }}
                                                >
                                                    <Settings className="h-3 w-3 mr-1" />
                                                    Configure
                                                </Button>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </TabsContent>

                        <TabsContent value="advanced" className="space-y-4">
                            <div className="space-y-2">
                                <Label>Parent Contexts</Label>
                                <p className="text-sm text-muted-foreground">
                                    Select contexts to inherit tools from
                                </p>
                                <div className="border rounded-md p-4 min-h-[100px] bg-gray-50">
                                    <p className="text-center text-sm text-muted-foreground">
                                        Parent context selection would go here
                                    </p>
                                </div>
                            </div>

                            <div className="space-y-2">
                                <Label>Persistent State</Label>
                                <p className="text-sm text-muted-foreground">
                                    Define state that persists between sessions
                                </p>
                                <div className="border rounded-md p-4 bg-gray-50">
                                    <Textarea
                                        placeholder="{}"
                                        className="font-mono text-sm"
                                        rows={5}
                                    />
                                    <p className="text-xs text-muted-foreground mt-2">
                                        Enter JSON object that defines the
                                        initial state
                                    </p>
                                </div>
                            </div>
                        </TabsContent>
                    </CardContent>
                </Tabs>
                <CardFooter className="flex justify-between">
                    <Button type="button" variant="ghost" onClick={onCancel}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        <Save className="h-4 w-4 mr-2" />
                        {context ? 'Update Context' : 'Create Context'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
