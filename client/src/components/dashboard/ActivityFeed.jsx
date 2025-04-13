import { ScrollArea } from '@/components/ui/scroll-area';
import { format } from 'date-fns';
import { Circle } from 'lucide-react';

// This would be real data in production
const SAMPLE_ACTIVITIES = [
    {
        id: 1,
        type: 'server',
        action: 'connected',
        name: 'Development MCP Server',
        timestamp: new Date(Date.now() - 1000 * 60 * 5), // 5 minutes ago
    },
    {
        id: 2,
        type: 'context',
        action: 'updated',
        name: 'Frontend Development',
        timestamp: new Date(Date.now() - 1000 * 60 * 30), // 30 minutes ago
    },
    {
        id: 3,
        type: 'endpoint',
        action: 'created',
        name: 'Production API Endpoint',
        timestamp: new Date(Date.now() - 1000 * 60 * 60), // 1 hour ago
    },
    {
        id: 4,
        type: 'context',
        action: 'created',
        name: 'Backend Development',
        timestamp: new Date(Date.now() - 1000 * 60 * 120), // 2 hours ago
    },
    {
        id: 5,
        type: 'server',
        action: 'error',
        name: 'Testing MCP Server',
        timestamp: new Date(Date.now() - 1000 * 60 * 180), // 3 hours ago
    },
    {
        id: 6,
        type: 'endpoint',
        action: 'updated',
        name: 'Staging API Endpoint',
        timestamp: new Date(Date.now() - 1000 * 60 * 240), // 4 hours ago
    },
    {
        id: 7,
        type: 'context',
        action: 'deprecated',
        name: 'Legacy Development',
        timestamp: new Date(Date.now() - 1000 * 60 * 300), // 5 hours ago
    },
];

export default function ActivityFeed() {
    // Define colors and styles for different activity types and actions
    const getActivityStyles = (type, action) => {
        const baseStyles = {
            server: 'border-blue-200',
            context: 'border-purple-200',
            endpoint: 'border-green-200',
        };

        const dotStyles = {
            connected: 'text-green-500',
            created: 'text-green-500',
            updated: 'text-blue-500',
            error: 'text-red-500',
            deprecated: 'text-orange-500',
        };

        return {
            borderClass: baseStyles[type] || 'border-gray-200',
            dotClass: dotStyles[action] || 'text-gray-500',
        };
    };

    // Format time relative to now (e.g., "5 minutes ago")
    const formatTime = (date) => {
        const now = new Date();
        const diffMinutes = Math.floor((now - date) / (1000 * 60));

        if (diffMinutes < 60) {
            return `${diffMinutes} minute${diffMinutes !== 1 ? 's' : ''} ago`;
        } else if (diffMinutes < 1440) {
            // less than a day
            const hours = Math.floor(diffMinutes / 60);
            return `${hours} hour${hours !== 1 ? 's' : ''} ago`;
        } else {
            return format(date, 'MMM d, h:mm a');
        }
    };

    return (
        <ScrollArea className="h-[400px]">
            <div className="space-y-0">
                {SAMPLE_ACTIVITIES.map((activity, i) => {
                    const { borderClass, dotClass } = getActivityStyles(
                        activity.type,
                        activity.action
                    );

                    return (
                        <div
                            key={activity.id}
                            className={`relative pl-6 pb-5 ${i !== SAMPLE_ACTIVITIES.length - 1 ? 'border-l' : ''} ${borderClass}`}
                        >
                            <Circle
                                className={`absolute left-[-4px] top-1 h-2 w-2 fill-current ${dotClass}`}
                            />
                            <div className="text-sm">
                                <div className="font-medium">
                                    {activity.name}
                                    <span className="font-normal text-muted-foreground ml-1">
                                        was {activity.action}
                                    </span>
                                </div>
                                <p className="text-xs text-muted-foreground mt-1">
                                    {formatTime(activity.timestamp)}
                                </p>
                            </div>
                        </div>
                    );
                })}
            </div>
        </ScrollArea>
    );
}
