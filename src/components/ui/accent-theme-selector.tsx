import { useAccentTheme, THEME_INFO, type AccentTheme } from '@/contexts/AccentThemeContext';
import { cn } from '@/lib/utils';
import { Check, Palette } from 'lucide-react';
import {
    DropdownMenu,
    DropdownMenuContent,
    DropdownMenuItem,
    DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { Button } from '@/components/ui/button';

export function AccentThemeSelector({ className }: { className?: string }) {
    const { accentTheme, setAccentTheme } = useAccentTheme();

    return (
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button
                    variant="outline"
                    size="icon"
                    className={cn(
                        "rounded-full h-8 w-8 border border-gray-200 dark:border-gray-700 bg-white/80 dark:bg-gray-800/80 backdrop-blur-sm shadow-sm hover:scale-105 hover:shadow-md transition-all",
                        className
                    )}
                >
                    <Palette className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent 
                align="end" 
                className="w-40 p-2 bg-white/95 dark:bg-gray-900/95 backdrop-blur-xl border border-gray-200 dark:border-gray-700 shadow-xl rounded-xl z-[110]"
            >
                <div className="text-[10px] uppercase tracking-wider text-gray-400 dark:text-gray-500 font-semibold px-2 pb-1.5">
                    Theme
                </div>
                {(Object.entries(THEME_INFO) as [AccentTheme, typeof THEME_INFO[AccentTheme]][]).map(([key, theme]) => (
                    <DropdownMenuItem
                        key={key}
                        onClick={() => setAccentTheme(key)}
                        className={cn(
                            "flex items-center gap-3 px-2 py-2.5 rounded-lg cursor-pointer transition-all",
                            accentTheme === key 
                                ? "bg-gray-100 dark:bg-gray-800" 
                                : "hover:bg-gray-50 dark:hover:bg-gray-800/50"
                        )}
                    >
                        {/* 3-color gradient swatch */}
                        <div 
                            className="w-6 h-6 rounded-lg flex-shrink-0 shadow-sm"
                            style={{
                                background: `linear-gradient(135deg, ${theme.colors[0]} 0%, ${theme.colors[1]} 50%, ${theme.colors[2]} 100%)`
                            }}
                        />
                        <span className="flex-1 text-sm font-medium text-gray-700 dark:text-gray-200">
                            {theme.name}
                        </span>
                        {accentTheme === key && (
                            <Check className="w-4 h-4 text-gray-500 dark:text-gray-400" strokeWidth={2.5} />
                        )}
                    </DropdownMenuItem>
                ))}
            </DropdownMenuContent>
        </DropdownMenu>
    );
}
