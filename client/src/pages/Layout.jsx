import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';
import { createPageUrl } from '@/utils';
import {
    Activity,
    Box,
    ChevronRight,
    Home,
    Menu,
    Network,
    Settings,
    Share2,
    X,
} from 'lucide-react';
import { useState } from 'react';
import { Link, useLocation } from 'react-router-dom';

export default function Layout({ children, currentPageName }) {
    const [isMenuOpen, setIsMenuOpen] = useState(false);
    const location = useLocation();

    const navigation = [
        { name: 'Dashboard', href: createPageUrl('Dashboard'), icon: Home },
        { name: 'Contexts', href: createPageUrl('Contexts'), icon: Box },
        { name: 'Servers', href: createPageUrl('Servers'), icon: Network },
        { name: 'Endpoints', href: createPageUrl('Endpoints'), icon: Share2 },
        {
            name: 'Monitoring',
            href: createPageUrl('Monitoring'),
            icon: Activity,
        },
        { name: 'Settings', href: createPageUrl('Settings'), icon: Settings },
    ];

    const isActive = (path) => {
        return location.pathname === path;
    };

    return (
        <div className="flex h-screen bg-gray-100 dark:bg-gray-900">
            {/* Mobile menu overlay */}
            {isMenuOpen && (
                <div
                    className="fixed inset-0 z-40 bg-black/50 backdrop-blur-sm lg:hidden"
                    onClick={() => setIsMenuOpen(false)}
                />
            )}

            {/* Sidebar / Navigation */}
            <aside
                className={cn(
                    'fixed inset-y-0 left-0 z-50 w-64 bg-white dark:bg-gray-800 shadow-lg transform transition-transform duration-200 ease-in-out lg:translate-x-0 lg:relative',
                    isMenuOpen ? 'translate-x-0' : '-translate-x-full'
                )}
            >
                <div className="flex items-center justify-between h-16 px-4 border-b dark:border-gray-700">
                    <div className="flex items-center gap-2 text-primary">
                        <Network className="h-6 w-6" />
                        <h1 className="text-xl font-semibold">ABC Manager</h1>
                    </div>
                    <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => setIsMenuOpen(false)}
                        className="lg:hidden"
                    >
                        <X className="h-5 w-5" />
                    </Button>
                </div>
                <nav className="flex-1 p-4 space-y-1 overflow-y-auto">
                    {navigation.map((item) => (
                        <Link
                            key={item.name}
                            to={item.href}
                            className={cn(
                                'flex items-center px-4 py-3 text-sm font-medium rounded-lg group transition-colors',
                                isActive(item.href)
                                    ? 'bg-primary/10 text-primary'
                                    : 'text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700'
                            )}
                            onClick={() => setIsMenuOpen(false)}
                        >
                            <item.icon
                                className={cn(
                                    'mr-3 h-5 w-5 flex-shrink-0',
                                    isActive(item.href)
                                        ? 'text-primary'
                                        : 'text-gray-500 dark:text-gray-400 group-hover:text-gray-700 dark:group-hover:text-gray-200'
                                )}
                            />
                            {item.name}
                            {isActive(item.href) && (
                                <ChevronRight className="ml-auto h-4 w-4 text-primary" />
                            )}
                        </Link>
                    ))}
                </nav>
                <div className="p-4 border-t dark:border-gray-700">
                    <div className="flex items-center gap-3 px-4 py-3">
                        <div className="h-10 w-10 rounded-full bg-gray-200 dark:bg-gray-700 flex items-center justify-center text-gray-500 dark:text-gray-300">
                            <span className="text-sm font-medium">UA</span>
                        </div>
                        <div>
                            <p className="text-sm font-medium text-gray-700 dark:text-gray-200">
                                User Admin
                            </p>
                            <p className="text-xs text-gray-500 dark:text-gray-400">
                                Administrator
                            </p>
                        </div>
                    </div>
                </div>
            </aside>

            {/* Main Content */}
            <div className="flex-1 flex flex-col overflow-hidden">
                {/* Top bar */}
                <header className="bg-white dark:bg-gray-800 shadow-sm z-10">
                    <div className="flex items-center justify-between h-16 px-4">
                        <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setIsMenuOpen(true)}
                            className="lg:hidden"
                        >
                            <Menu className="h-5 w-5" />
                        </Button>
                        <div className="ml-auto flex items-center space-x-4">
                            <Button variant="outline" size="sm">
                                Help
                            </Button>
                        </div>
                    </div>
                </header>

                {/* Page content */}
                <main className="flex-1 overflow-y-auto p-4 md:p-6 bg-gray-50 dark:bg-gray-900">
                    {children}
                </main>
            </div>

            <style>{`
:root {
  /* RGB versions */
  --primary-rgb: 79 70 229;
  --primary-foreground-rgb: 255 255 255;
  --background-rgb: 250 250 250;
  --card-rgb: 255 255 255;
  --card-foreground-rgb: 17 24 39;
  --popover-rgb: 255 255 255;
  --popover-foreground-rgb: 17 24 39;
  --muted-rgb: 241 245 249;
  --muted-foreground-rgb: 107 114 128;
  --accent-rgb: 243 244 246;
  --accent-foreground-rgb: 17 24 39;
  --destructive-rgb: 239 68 68;
  --destructive-foreground-rgb: 255 255 255;
  --border-rgb: 229 231 235;
  --input-rgb: 229 231 235;
  --ring-rgb: 79 70 229;
  
  /* HSL versions */
  --primary: 247 84% 59%;
  --primary-foreground: 0 0% 100%;
  --background: 0 0% 98%;
  --card: 0 0% 100%;
  --card-foreground: 222 47% 11%;
  --popover: 0 0% 100%;
  --popover-foreground: 222 47% 11%;
  --muted: 210 40% 96%;
  --muted-foreground: 215 9% 46%;
  --accent: 220 14% 96%;
  --accent-foreground: 222 47% 11%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 220 13% 91%;
  --input: 220 13% 91%;
  --ring: 247 84% 59%;
  --radius: 0.5rem;
}

.dark {
  /* RGB versions */
  --primary-rgb: 79 70 229;
  --primary-foreground-rgb: 255 255 255;
  --background-rgb: 17 24 39;
  --card-rgb: 31 41 55;
  --card-foreground-rgb: 243 244 246;
  --popover-rgb: 31 41 55;
  --popover-foreground-rgb: 243 244 246;
  --muted-rgb: 55 65 81;
  --muted-foreground-rgb: 156 163 175;
  --accent-rgb: 55 65 81;
  --accent-foreground-rgb: 243 244 246;
  --destructive-rgb: 239 68 68;
  --destructive-foreground-rgb: 255 255 255;
  --border-rgb: 55 65 81;
  --input-rgb: 55 65 81;
  --ring-rgb: 79 70 229;
  
  /* HSL versions */
  --primary: 247 84% 59%;
  --primary-foreground: 0 0% 100%;
  --background: 222 47% 11%;
  --card: 222 41% 17%;
  --card-foreground: 220 14% 96%;
  --popover: 222 41% 17%;
  --popover-foreground: 220 14% 96%;
  --muted: 215 25% 27%;
  --muted-foreground: 215 16% 65%;
  --accent: 215 25% 27%;
  --accent-foreground: 220 14% 96%;
  --destructive: 0 84% 60%;
  --destructive-foreground: 0 0% 100%;
  --border: 215 25% 27%;
  --input: 215 25% 27%;
  --ring: 247 84% 59%;
}

/* Add smooth transitions for theme changes */
*, *::before, *::after {
  transition-property: background-color, border-color, color, fill, stroke;
  transition-duration: 200ms;
  transition-timing-function: cubic-bezier(0.4, 0, 0.2, 1);
}

/* Remove transition from elements where it's unwanted */
.no-transition {
  transition: none !important;
}
      `}</style>
        </div>
    );
}
