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
import { Network, Save, X } from 'lucide-react';
import { useState } from 'react';

export default function ServerForm({ server = null, onSubmit, onCancel }) {
    const [formData, setFormData] = useState({
        name: server?.name || '',
        url: server?.url || '',
        transportType: server?.transportType || 'sse',
        authType: server?.authType || 'none',
        apiKey: server?.apiKey || '',
        username: server?.username || '',
        password: server?.password || '',
        headers: server?.headers || [],
    });

    const [newHeader, setNewHeader] = useState({ name: '', value: '' });

    const [errors, setErrors] = useState({});
    const [isSubmitting, setIsSubmitting] = useState(false);

    const handleChange = (field, value) => {
        setFormData((prev) => ({ ...prev, [field]: value }));

        // Clear validation errors when field is changed
        if (errors[field]) {
            setErrors((prev) => ({ ...prev, [field]: null }));
        }
    };

    const validate = () => {
        const newErrors = {};

        if (!formData.name.trim()) {
            newErrors.name = 'Name is required';
        }

        if (!formData.url.trim()) {
            newErrors.url = 'URL is required';
        } else if (!formData.url.startsWith('http')) {
            newErrors.url = 'URL must start with http:// or https://';
        }

        if (formData.authType === 'apiKey' && !formData.apiKey.trim()) {
            newErrors.apiKey = 'API Key is required';
        }

        if (formData.authType === 'basic') {
            if (!formData.username.trim()) {
                newErrors.username = 'Username is required';
            }
            if (!formData.password.trim()) {
                newErrors.password = 'Password is required';
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
            console.error('Error submitting server form:', error);
        } finally {
            setIsSubmitting(false);
        }
    };

    return (
        <Card>
            <form onSubmit={handleSubmit}>
                <CardHeader className="space-y-1">
                    <div className="flex items-center gap-2">
                        <Network className="h-5 w-5" />
                        <CardTitle>
                            {server ? 'Edit Server' : 'Add Server'}
                        </CardTitle>
                    </div>
                    <CardDescription>
                        Connect to an MCP server to access its tools
                    </CardDescription>
                </CardHeader>

                <CardContent className="space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="name">Server Name</Label>
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
                            <Label htmlFor="url">Server URL</Label>
                            <Input
                                id="url"
                                placeholder="https://server.example.com"
                                value={formData.url}
                                onChange={(e) =>
                                    handleChange('url', e.target.value)
                                }
                                className={errors.url ? 'border-red-500' : ''}
                            />
                            {errors.url && (
                                <p className="text-xs text-red-500">
                                    {errors.url}
                                </p>
                            )}
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div className="space-y-2">
                            <Label htmlFor="transportType">
                                Transport Type
                            </Label>
                            <Select
                                value={formData.transportType}
                                onValueChange={(value) =>
                                    handleChange('transportType', value)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select transport" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="sse">
                                        Server-Sent Events (SSE)
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                        <div className="space-y-2">
                            <Label htmlFor="authType">
                                Authentication Type
                            </Label>
                            <Select
                                value={formData.authType}
                                onValueChange={(value) =>
                                    handleChange('authType', value)
                                }
                            >
                                <SelectTrigger>
                                    <SelectValue placeholder="Select authentication" />
                                </SelectTrigger>
                                <SelectContent>
                                    <SelectItem value="none">None</SelectItem>
                                    <SelectItem value="apiKey">
                                        API Key
                                    </SelectItem>
                                    <SelectItem value="basic">
                                        Basic Auth
                                    </SelectItem>
                                </SelectContent>
                            </Select>
                        </div>
                    </div>

                    {formData.authType === 'apiKey' && (
                        <div className="space-y-2">
                            <Label htmlFor="apiKey">API Key</Label>
                            <Input
                                id="apiKey"
                                type="password"
                                placeholder="Enter API key"
                                value={formData.apiKey}
                                onChange={(e) =>
                                    handleChange('apiKey', e.target.value)
                                }
                                className={
                                    errors.apiKey ? 'border-red-500' : ''
                                }
                            />
                            {errors.apiKey && (
                                <p className="text-xs text-red-500">
                                    {errors.apiKey}
                                </p>
                            )}
                        </div>
                    )}

                    {formData.authType === 'basic' && (
                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div className="space-y-2">
                                <Label htmlFor="username">Username</Label>
                                <Input
                                    id="username"
                                    placeholder="Enter username"
                                    value={formData.username}
                                    onChange={(e) =>
                                        handleChange('username', e.target.value)
                                    }
                                    className={
                                        errors.username ? 'border-red-500' : ''
                                    }
                                />
                                {errors.username && (
                                    <p className="text-xs text-red-500">
                                        {errors.username}
                                    </p>
                                )}
                            </div>
                            <div className="space-y-2">
                                <Label htmlFor="password">Password</Label>
                                <Input
                                    id="password"
                                    type="password"
                                    placeholder="Enter password"
                                    value={formData.password}
                                    onChange={(e) =>
                                        handleChange('password', e.target.value)
                                    }
                                    className={
                                        errors.password ? 'border-red-500' : ''
                                    }
                                />
                                {errors.password && (
                                    <p className="text-xs text-red-500">
                                        {errors.password}
                                    </p>
                                )}
                            </div>
                        </div>
                    )}

                    {/* Custom Headers Section */}
                    <div className="space-y-4 pt-4 border-t">
                        <div className="flex justify-between items-center">
                            <Label>Custom Headers</Label>
                            <Button
                                type="button"
                                variant="outline"
                                size="sm"
                                onClick={() => {
                                    if (newHeader.name && newHeader.value) {
                                        setFormData((prev) => ({
                                            ...prev,
                                            headers: [
                                                ...(prev.headers || []),
                                                newHeader,
                                            ],
                                        }));
                                        setNewHeader({ name: '', value: '' });
                                    }
                                }}
                                disabled={!newHeader.name || !newHeader.value}
                            >
                                Add Header
                            </Button>
                        </div>

                        <div className="space-y-2">
                            <div className="grid grid-cols-2 gap-2">
                                <Input
                                    placeholder="Header name"
                                    value={newHeader.name}
                                    onChange={(e) =>
                                        setNewHeader((prev) => ({
                                            ...prev,
                                            name: e.target.value,
                                        }))
                                    }
                                />
                                <Input
                                    placeholder="Header value"
                                    value={newHeader.value}
                                    onChange={(e) =>
                                        setNewHeader((prev) => ({
                                            ...prev,
                                            value: e.target.value,
                                        }))
                                    }
                                />
                            </div>
                        </div>

                        {formData.headers && formData.headers.length > 0 && (
                            <div className="space-y-2">
                                {formData.headers.map((header, index) => (
                                    <div
                                        key={index}
                                        className="flex items-center gap-2 bg-gray-50 p-2 rounded-md"
                                    >
                                        <div className="flex-1 font-mono text-sm">
                                            {header.name}: {header.value}
                                        </div>
                                        <Button
                                            type="button"
                                            variant="ghost"
                                            size="icon"
                                            className="h-8 w-8 text-red-500 hover:text-red-600 hover:bg-red-50"
                                            onClick={() => {
                                                setFormData((prev) => ({
                                                    ...prev,
                                                    headers:
                                                        prev.headers.filter(
                                                            (_, i) =>
                                                                i !== index
                                                        ),
                                                }));
                                            }}
                                        >
                                            <X className="h-4 w-4" />
                                        </Button>
                                    </div>
                                ))}
                            </div>
                        )}
                    </div>
                </CardContent>

                <CardFooter className="flex justify-between">
                    <Button type="button" variant="ghost" onClick={onCancel}>
                        <X className="h-4 w-4 mr-2" />
                        Cancel
                    </Button>
                    <Button type="submit" disabled={isSubmitting}>
                        <Save className="h-4 w-4 mr-2" />
                        {server ? 'Update Server' : 'Add Server'}
                    </Button>
                </CardFooter>
            </form>
        </Card>
    );
}
