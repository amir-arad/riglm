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
import { Switch } from '@/components/ui/switch';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
    DatabaseBackup,
    FileCode,
    Key,
    Laptop,
    RefreshCw,
    Save,
    Server,
    Settings,
    ShieldCheck,
    Undo,
    UserCog,
} from 'lucide-react';
import { useState } from 'react';

export default function SettingsPage() {
    const [activeTab, setActiveTab] = useState('general');
    const [saved, setSaved] = useState(false);

    const mockSave = (e) => {
        e.preventDefault();
        setSaved(true);
        setTimeout(() => setSaved(false), 2000);
    };

    return (
        <div className="space-y-6">
            <div className="flex justify-between">
                <div className="space-y-1">
                    <h2 className="text-3xl font-bold tracking-tight">
                        Settings
                    </h2>
                    <p className="text-muted-foreground">
                        Configure the ABC system settings and options.
                    </p>
                </div>
            </div>

            <Tabs
                value={activeTab}
                onValueChange={setActiveTab}
                className="space-y-4"
            >
                <TabsList>
                    <TabsTrigger value="general">
                        <Settings className="h-4 w-4 mr-2" />
                        General
                    </TabsTrigger>
                    <TabsTrigger value="security">
                        <ShieldCheck className="h-4 w-4 mr-2" />
                        Security
                    </TabsTrigger>
                    <TabsTrigger value="users">
                        <UserCog className="h-4 w-4 mr-2" />
                        Users
                    </TabsTrigger>
                    <TabsTrigger value="backup">
                        <DatabaseBackup className="h-4 w-4 mr-2" />
                        Backup & Restore
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="general" className="space-y-4">
                    <Card>
                        <form onSubmit={mockSave}>
                            <CardHeader>
                                <CardTitle>General Settings</CardTitle>
                                <CardDescription>
                                    Configure general system settings and
                                    defaults
                                </CardDescription>
                            </CardHeader>
                            <CardContent className="space-y-4">
                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="system-name">
                                            System Name
                                        </Label>
                                        <Input
                                            id="system-name"
                                            defaultValue="Adaptive Business Context Manager"
                                        />
                                    </div>
                                    <div className="space-y-2">
                                        <Label htmlFor="admin-email">
                                            Admin Email
                                        </Label>
                                        <Input
                                            id="admin-email"
                                            type="email"
                                            defaultValue="admin@example.com"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="base-url">Base URL</Label>
                                    <Input
                                        id="base-url"
                                        defaultValue="https://api.example.com/mcp/"
                                    />
                                    <p className="text-xs text-muted-foreground">
                                        The base URL for all generated endpoint
                                        URLs
                                    </p>
                                </div>

                                <div className="space-y-2">
                                    <Label htmlFor="default-timeout">
                                        Default Request Timeout (ms)
                                    </Label>
                                    <Input
                                        id="default-timeout"
                                        type="number"
                                        defaultValue="30000"
                                        min="1000"
                                        step="1000"
                                    />
                                </div>

                                <div className="space-y-1">
                                    <div className="flex items-center justify-between">
                                        <Label htmlFor="log-level">
                                            Logging Level
                                        </Label>
                                        <div>
                                            <select
                                                id="log-level"
                                                className="h-8 rounded-md border border-input bg-background px-3 text-sm"
                                                defaultValue="info"
                                            >
                                                <option value="debug">
                                                    Debug
                                                </option>
                                                <option value="info">
                                                    Info
                                                </option>
                                                <option value="warn">
                                                    Warning
                                                </option>
                                                <option value="error">
                                                    Error
                                                </option>
                                            </select>
                                        </div>
                                    </div>
                                </div>

                                <div className="flex items-center justify-between pt-2">
                                    <div className="space-y-0.5">
                                        <Label htmlFor="telemetry">
                                            Usage Telemetry
                                        </Label>
                                        <p className="text-xs text-muted-foreground">
                                            Share anonymous usage data to help
                                            improve the system
                                        </p>
                                    </div>
                                    <Switch id="telemetry" defaultChecked />
                                </div>
                            </CardContent>
                            <CardFooter className="flex justify-between">
                                <Button type="button" variant="outline">
                                    <Undo className="h-4 w-4 mr-2" />
                                    Reset to Defaults
                                </Button>
                                <Button type="submit">
                                    {saved ? (
                                        <>
                                            <RefreshCw className="h-4 w-4 mr-2 animate-spin" />
                                            Saving...
                                        </>
                                    ) : (
                                        <>
                                            <Save className="h-4 w-4 mr-2" />
                                            Save Changes
                                        </>
                                    )}
                                </Button>
                            </CardFooter>
                        </form>
                    </Card>

                    <Card>
                        <CardHeader>
                            <CardTitle>Environment Configuration</CardTitle>
                            <CardDescription>
                                Configure environment-specific settings
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="flex items-center justify-between pb-4 border-b">
                                <div className="flex items-center gap-2">
                                    <Laptop className="h-5 w-5" />
                                    <div>
                                        <p className="font-medium">
                                            Development Mode
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Enable additional debugging features
                                        </p>
                                    </div>
                                </div>
                                <Switch defaultChecked />
                            </div>

                            <div className="flex items-center justify-between pb-4 border-b">
                                <div className="flex items-center gap-2">
                                    <Server className="h-5 w-5" />
                                    <div>
                                        <p className="font-medium">
                                            Server Discovery
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Automatically discover MCP servers
                                            on the network
                                        </p>
                                    </div>
                                </div>
                                <Switch />
                            </div>

                            <div className="flex items-center justify-between">
                                <div className="flex items-center gap-2">
                                    <FileCode className="h-5 w-5" />
                                    <div>
                                        <p className="font-medium">
                                            Validate Tool Schemas
                                        </p>
                                        <p className="text-sm text-muted-foreground">
                                            Strictly validate tool input/output
                                            schemas
                                        </p>
                                    </div>
                                </div>
                                <Switch defaultChecked />
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="security" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Security Settings</CardTitle>
                            <CardDescription>
                                Configure authentication and security options
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <div className="space-y-2">
                                <Label htmlFor="api-key-expiry">
                                    API Key Expiration (days)
                                </Label>
                                <Input
                                    id="api-key-expiry"
                                    type="number"
                                    defaultValue="90"
                                    min="1"
                                />
                                <p className="text-xs text-muted-foreground">
                                    Number of days until generated API keys
                                    expire (0 for no expiration)
                                </p>
                            </div>

                            <div className="flex items-center justify-between py-2 border-b">
                                <div className="space-y-0.5">
                                    <Label>Require Authentication</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Require authentication for all endpoints
                                    </p>
                                </div>
                                <Switch defaultChecked />
                            </div>

                            <div className="flex items-center justify-between py-2 border-b">
                                <div className="space-y-0.5">
                                    <Label>Rate Limiting</Label>
                                    <p className="text-xs text-muted-foreground">
                                        Enable rate limiting for API requests
                                    </p>
                                </div>
                                <Switch defaultChecked />
                            </div>

                            <div className="space-y-2">
                                <Label htmlFor="rate-limit">
                                    Request Limit per Minute
                                </Label>
                                <Input
                                    id="rate-limit"
                                    type="number"
                                    defaultValue="100"
                                    min="1"
                                />
                            </div>

                            <div className="pt-4">
                                <Button variant="outline" className="w-full">
                                    <Key className="h-4 w-4 mr-2" />
                                    Regenerate System API Keys
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="users" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>User Management</CardTitle>
                            <CardDescription>
                                Manage system users and permissions
                            </CardDescription>
                        </CardHeader>
                        <CardContent>
                            <div className="relative overflow-x-auto">
                                <table className="w-full text-sm text-left">
                                    <thead className="text-xs uppercase bg-gray-50 dark:bg-gray-800">
                                        <tr>
                                            <th className="px-4 py-3">User</th>
                                            <th className="px-4 py-3">Email</th>
                                            <th className="px-4 py-3">Role</th>
                                            <th className="px-4 py-3">
                                                Last Active
                                            </th>
                                            <th className="px-4 py-3 text-right">
                                                Actions
                                            </th>
                                        </tr>
                                    </thead>
                                    <tbody>
                                        <tr className="border-b">
                                            <td className="px-4 py-3">
                                                Admin User
                                            </td>
                                            <td className="px-4 py-3">
                                                admin@example.com
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded-full text-xs">
                                                    Administrator
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">Now</td>
                                            <td className="px-4 py-3 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                >
                                                    Edit
                                                </Button>
                                            </td>
                                        </tr>
                                        <tr className="border-b">
                                            <td className="px-4 py-3">
                                                Developer User
                                            </td>
                                            <td className="px-4 py-3">
                                                dev@example.com
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="bg-purple-100 text-purple-800 px-2 py-1 rounded-full text-xs">
                                                    Developer
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                2 hours ago
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                >
                                                    Edit
                                                </Button>
                                            </td>
                                        </tr>
                                        <tr className="border-b">
                                            <td className="px-4 py-3">
                                                Viewer User
                                            </td>
                                            <td className="px-4 py-3">
                                                viewer@example.com
                                            </td>
                                            <td className="px-4 py-3">
                                                <span className="bg-green-100 text-green-800 px-2 py-1 rounded-full text-xs">
                                                    Viewer
                                                </span>
                                            </td>
                                            <td className="px-4 py-3">
                                                1 day ago
                                            </td>
                                            <td className="px-4 py-3 text-right">
                                                <Button
                                                    variant="ghost"
                                                    size="sm"
                                                >
                                                    Edit
                                                </Button>
                                            </td>
                                        </tr>
                                    </tbody>
                                </table>
                            </div>
                            <div className="mt-4">
                                <Button>
                                    <UserCog className="h-4 w-4 mr-2" />
                                    Add New User
                                </Button>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>

                <TabsContent value="backup" className="space-y-4">
                    <Card>
                        <CardHeader>
                            <CardTitle>Backup & Restore</CardTitle>
                            <CardDescription>
                                Manage system backups and restore points
                            </CardDescription>
                        </CardHeader>
                        <CardContent className="space-y-6">
                            <div className="space-y-2">
                                <h3 className="text-lg font-medium">
                                    Create Backup
                                </h3>
                                <p className="text-sm text-muted-foreground">
                                    Create a complete backup of the system
                                    configuration and data
                                </p>
                                <div className="flex gap-4 pt-2">
                                    <Button>
                                        <DatabaseBackup className="h-4 w-4 mr-2" />
                                        Create Backup
                                    </Button>
                                    <Button variant="outline">
                                        Schedule Automatic Backups
                                    </Button>
                                </div>
                            </div>

                            <div className="border-t pt-6">
                                <h3 className="text-lg font-medium mb-4">
                                    Recent Backups
                                </h3>
                                <div className="relative overflow-x-auto">
                                    <table className="w-full text-sm text-left">
                                        <thead className="text-xs uppercase bg-gray-50">
                                            <tr>
                                                <th className="px-4 py-2">
                                                    Date
                                                </th>
                                                <th className="px-4 py-2">
                                                    Size
                                                </th>
                                                <th className="px-4 py-2">
                                                    Type
                                                </th>
                                                <th className="px-4 py-2">
                                                    Created By
                                                </th>
                                                <th className="px-4 py-2 text-right">
                                                    Actions
                                                </th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            <tr className="border-b">
                                                <td className="px-4 py-3">
                                                    May 15, 2025 14:30
                                                </td>
                                                <td className="px-4 py-3">
                                                    4.2 MB
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="bg-blue-100 text-blue-800 px-2 py-0.5 rounded-full text-xs">
                                                        Full
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    admin@example.com
                                                </td>
                                                <td className="px-4 py-3 text-right space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                    >
                                                        Download
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                    >
                                                        Restore
                                                    </Button>
                                                </td>
                                            </tr>
                                            <tr className="border-b">
                                                <td className="px-4 py-3">
                                                    May 10, 2025 10:15
                                                </td>
                                                <td className="px-4 py-3">
                                                    3.9 MB
                                                </td>
                                                <td className="px-4 py-3">
                                                    <span className="bg-green-100 text-green-800 px-2 py-0.5 rounded-full text-xs">
                                                        Scheduled
                                                    </span>
                                                </td>
                                                <td className="px-4 py-3">
                                                    System
                                                </td>
                                                <td className="px-4 py-3 text-right space-x-2">
                                                    <Button
                                                        variant="outline"
                                                        size="sm"
                                                    >
                                                        Download
                                                    </Button>
                                                    <Button
                                                        variant="ghost"
                                                        size="sm"
                                                    >
                                                        Restore
                                                    </Button>
                                                </td>
                                            </tr>
                                        </tbody>
                                    </table>
                                </div>
                            </div>

                            <div className="border-t pt-6">
                                <h3 className="text-lg font-medium mb-4">
                                    Restore System
                                </h3>
                                <div className="grid gap-4">
                                    <div className="space-y-2">
                                        <Label htmlFor="backup-file">
                                            Upload Backup File
                                        </Label>
                                        <Input id="backup-file" type="file" />
                                    </div>
                                    <div>
                                        <Button variant="outline">
                                            Restore from Uploaded Backup
                                        </Button>
                                    </div>
                                </div>
                            </div>
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
