import { Card, CardContent } from '@/components/ui/card';
import { Minus, TrendingDown, TrendingUp } from 'lucide-react';

export default function MetricCard({
    title,
    value,
    description,
    icon: Icon,
    trend = 'neutral',
}) {
    // Define trend color and icon based on trend direction
    const trendConfig = {
        up: {
            icon: TrendingUp,
            textColor: 'text-green-600',
            bgColor: 'bg-green-50',
        },
        down: {
            icon: TrendingDown,
            textColor: 'text-red-600',
            bgColor: 'bg-red-50',
        },
        neutral: {
            icon: Minus,
            textColor: 'text-gray-600',
            bgColor: 'bg-gray-50',
        },
    };

    const TrendIcon = trendConfig[trend]?.icon || Minus;

    return (
        <Card>
            <CardContent className="p-6">
                <div className="flex justify-between items-start">
                    <div className="space-y-2">
                        <p className="text-sm font-medium text-muted-foreground">
                            {title}
                        </p>
                        <div className="flex items-baseline gap-2">
                            <h2 className="text-3xl font-bold tracking-tight">
                                {value}
                            </h2>
                            <div
                                className={`flex items-center px-2 py-1 rounded-full text-xs font-medium ${trendConfig[trend].bgColor} ${trendConfig[trend].textColor}`}
                            >
                                <TrendIcon className="h-3 w-3 mr-1" />
                                <span>
                                    {trend === 'neutral'
                                        ? 'Stable'
                                        : trend === 'up'
                                          ? 'Up'
                                          : 'Down'}
                                </span>
                            </div>
                        </div>
                        <p className="text-xs text-muted-foreground">
                            {description}
                        </p>
                    </div>
                    <div className="p-2 bg-gray-100 rounded-md dark:bg-gray-800">
                        <Icon className="h-5 w-5 text-gray-500" />
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
