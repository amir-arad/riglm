import { Button } from '@/components/ui/button';
import {
    Card,
    CardContent,
    CardFooter,
    CardHeader,
    CardTitle,
} from '@/components/ui/card';
import { Progress } from '@/components/ui/progress';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';

export default function StatusOverview({
    title,
    total,
    active,
    icon: Icon,
    color,
    link,
}) {
    const percent = total > 0 ? Math.round((active / total) * 100) : 0;

    const colorClasses = {
        blue: 'text-blue-600',
        green: 'text-green-600',
        purple: 'text-purple-600',
        orange: 'text-orange-600',
        red: 'text-red-600',
    };

    const bgColorClasses = {
        blue: 'bg-blue-100',
        green: 'bg-green-100',
        purple: 'bg-purple-100',
        orange: 'bg-orange-100',
        red: 'bg-red-100',
    };

    const progressColorClasses = {
        blue: 'bg-blue-600',
        green: 'bg-green-600',
        purple: 'bg-purple-600',
        orange: 'bg-orange-600',
        red: 'bg-red-600',
    };

    return (
        <Card>
            <CardHeader className="pb-2">
                <div className="flex items-center justify-between">
                    <CardTitle className="text-base font-medium">
                        {title}
                    </CardTitle>
                    <div
                        className={`p-2 rounded-md ${bgColorClasses[color] || bgColorClasses.blue} ${colorClasses[color] || colorClasses.blue}`}
                    >
                        <Icon className="h-4 w-4" />
                    </div>
                </div>
            </CardHeader>
            <CardContent>
                <div className="text-2xl font-bold mb-2">
                    {active}{' '}
                    <span className="text-muted-foreground text-sm font-normal">
                        / {total}
                    </span>
                </div>
                <div className="flex items-center justify-between text-xs text-muted-foreground mb-2">
                    <span>Active</span>
                    <span>{percent}%</span>
                </div>
                <Progress
                    value={percent}
                    className="h-1"
                    indicatorClassName={
                        progressColorClasses[color] || progressColorClasses.blue
                    }
                />
            </CardContent>
            <CardFooter>
                <Link to={link} className="w-full">
                    <Button
                        variant="ghost"
                        className="w-full justify-start text-muted-foreground hover:text-foreground"
                    >
                        View All
                        <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                </Link>
            </CardFooter>
        </Card>
    );
}
