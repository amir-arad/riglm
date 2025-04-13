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
import { Checkbox } from '@/components/ui/checkbox';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ScrollArea } from '@/components/ui/scroll-area';
import {
    Select,
    SelectContent,
    SelectItem,
    SelectTrigger,
    SelectValue,
} from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Textarea } from '@/components/ui/textarea';
import { Save, Share2, X } from 'lucide-react';
import { useState } from 'react';

export default function EndpointForm({
    endpoint = null,
    contexts = [],
    onSubmit,
    onCancel,
}) {
    const [formData, setFormData] = useState({
        name: endpoint?.name || '',
        description: endpoint?.description || '',
        contextIds: endpoint?.contextIds || [],
        status: endpoint?.status || 'draft',
        url: endpoint?.url || '',
        apiKey: endpoint?.apiKey || '',
        usage: endpoint?.usage || { connections: 0, requests: 0 },
    });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [generateApiKey, setGenerateApiKey] = useState(
        endpoint?.apiKey ? true : false
    );

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));

        // Clear validation errors when field is changed
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: null }));
        }
    };

    const handleContextToggle = (contextId) => {
        setFormData((prev) => {
            const newContextIds = prev.contextIds.includes(contextId)
                ? prev.contextIds.filter((id) => id !== contextId)
                : [...prev.contextIds, contextId];
            return { ...prev, contextIds: newContextIds };
        });
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
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
            // Generate API key if requested
            if (generateApiKey && !formData.apiKey) {
                // In a real app, this would be a secure random string
                const newApiKey = `mcp_${Math.random().toString(36).substring(2, 15)}`;
                formData.apiKey = newApiKey;
            } else if (!generateApiKey) {
                formData.apiKey = '';
            }

            // Generate URL if not provided
            if (!formData.url) {
                // In a real app, this would be based on deployment configuration
                const baseUrl = 'https://api.example.com/mcp/';
                const urlSuffix = formData.name
                    .toLowerCase()
                    .replace(/\s+/g, '-');
                formData.url = `${baseUrl}${urlSuffix}`;
            }

            await onSubmit(formData);
        } catch (error) {
            console.error('Error submitting endpoint form:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    const activeContexts = contexts.filter((c) => c.status === 'active');

    return (
        <Card>
            <form onSubmit={handleSubmit}>
                <CardHeader className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Share2 className="h-5 w-5" />
                        <CardTitle>
                            {endpoint ? 'Edit Endpoint' : 'Create Endpoint'}
                        </CardTitle>
                    </div>
                    <CardDescription>
                        Expose MCP endpoints for clients to connect
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Endpoint Name</Label>
                            <Input
                                id="name"
                                placeholder="Enter descriptive name"
                                value={formData.name}
                                onChange={(e) =>
                                    handleChange('name', e.target.value)
                                }
                                className={errors.name ? 'border-red-500' : ''}
                            />
                            {errors.name && (
                                <p className="text-xs text-red-500">
                                    {errors.name}
                                </p>
                            )}
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
                                    <SelectItem value="draft">Draft</SelectItem>
                                    <SelectItem value="testing">
                                        Testing
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
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="description">Description</Label>
                        <Textarea
                            id="description"
                            placeholder="Describe the purpose of this endpoint"
                            value={formData.description}
                            onChange={(e) =>
                                handleChange('description', e.target.value)
                            }
                            rows={2}
                        />
                    </div>

                    <div className="space-y-2">
                        <Label>Associated Contexts</Label>
                        <div className="border rounded-md">
                            {activeContexts.length === 0 ? (
                                <div className="p-4 text-center text-sm text-muted-foreground">
                                    No active contexts available. Activate
                                    contexts to associate them with this
                                    endpoint.
                                </div>
                            ) : (
                                <ScrollArea className="h-[200px] p-4">
                                    <div className="space-y-2">
                                        {activeContexts.map((context) => (
                                            <div
                                                key={context.id}
                                                className="flex items-center gap-2"
                                            >
                                                <Checkbox
                                                    id={`context-${context.id}`}
                                                    checked={formData.contextIds.includes(
                                                        context.id
                                                    )}
                                                    onCheckedChange={() =>
                                                        handleContextToggle(
                                                            context.id
                                                        )
                                                    }
                                                />
                                                <Label
                                                    htmlFor={`context-${context.id}`}
                                                    className="flex items-center gap-2 text-sm font-normal cursor-pointer"
                                                >
                                                    {context.name}
                                                    <Badge
                                                        variant="outline"
                                                        className="text-xs"
                                                    >
                                                        v{context.version}
                                                    </Badge>
                                                </Label>
                                            </div>
                                        ))}
                                    </div>
                                </ScrollArea>
                            )}
                        </div>
                        <div className="flex justify-between items-center mt-2">
                            <p className="text-xs text-muted-foreground">
                                {formData.contextIds.length} context(s) selected
                            </p>
                            {formData.contextIds.length > 0 ? (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() =>
                                        handleChange('contextIds', [])
                                    }
                                >
                                    Clear All
                                </Button>
                            ) : (
                                <Button
                                    type="button"
                                    variant="ghost"
                                    size="sm"
                                    className="text-xs"
                                    onClick={() =>
                                        handleChange(
                                            'contextIds',
                                            activeContexts.map((c) => c.id)
                                        )
                                    }
                                    disabled={activeContexts.length === 0}
                                >
                                    Select All
                                </Button>
                            )}
                        </div>
                    </div>

                    <div className="space-y-2">
                        <Label htmlFor="url">Custom URL (Optional)</Label>
                        <Input
                            id="url"
                            placeholder="Leave blank to auto-generate"
                            value={formData.url}
                            onChange={(e) =>
                                handleChange('url', e.target.value)
                            }
                        />
                        <p className="text-xs text-muted-foreground">
                            If left blank, a URL will be automatically generated
                        </p>
                    </div>

                    <div className="flex items-center space-x-2">
                        <Switch
                            id="generate-key"
                            checked={generateApiKey}
                            onCheckedChange={setGenerateApiKey}
                        />
                        <Label htmlFor="generate-key">
                            Require API Key Authentication
                        </Label>
                    </div>

                    {endpoint && endpoint.usage && (
                        <div className="border rounded-md p-4 bg-gray-50">
                            <h4 className="text-sm font-medium mb-2">
                                Current Usage
                            </h4>
                            <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                                <div className="text-sm text-muted-foreground">
                                    Total Requests:
                                </div>
                                <div className="text-sm font-medium">
                                    {endpoint.usage.requests || 0}
                                </div>
                                <div className="text-sm text-muted-foreground">
                                    Active Connections:
                                </div>
                                <div className="text-sm font-medium">
                                    {endpoint.usage.connections || 0}
                                </div>
                            </div>
                        </div>
                    )}
                </CardContent>
                <CardFooter className="flex justify-between">
                    <Button type="button" variant="ghost" onClick={onCancel}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        <Save className="h-4 w-4 mr-2" />
                        {endpoint ? 'Update Endpoint' : 'Create Endpoint'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
