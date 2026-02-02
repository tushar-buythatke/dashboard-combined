"use client";

import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '@/lib/utils';
import {
    Plus,
    X,
    FileText,
    UserPlus,
    ShieldAlert,
    LogOut,
    Settings
} from 'lucide-react';

interface MobileActionFabProps {
    isAdmin: boolean;
    pendingUsersCount: number;
    hasPendingRequest: boolean;
    onGenerateReport?: () => void;
    onNewConfig?: () => void;
    onLogout: () => void;
    hasWriteAccess: boolean;
    showReport: boolean;
}

export function MobileActionFab({
    isAdmin,
    pendingUsersCount,
    hasPendingRequest,
    onGenerateReport,
    onNewConfig,
    onLogout,
    hasWriteAccess,
    showReport
}: MobileActionFabProps) {
    const [isOpen, setIsOpen] = useState(false);
    const navigate = useNavigate();

    const actions = [
        // Generate Report - only if feature selected
        ...(showReport && onGenerateReport ? [{
            id: 'report',
            icon: FileText,
            label: 'Generate Report',
            onClick: () => { onGenerateReport(); setIsOpen(false); },
            className: 'bg-emerald-500 hover:bg-emerald-600 text-white'
        }] : []),

        // New Config - only if write access
        ...(hasWriteAccess && onNewConfig ? [{
            id: 'config',
            icon: Plus,
            label: 'New Config',
            onClick: () => { onNewConfig(); setIsOpen(false); },
            className: 'bg-indigo-500 hover:bg-indigo-600 text-white'
        }] : []),

        // Admin Panel
        ...(isAdmin ? [{
            id: 'admin',
            icon: ShieldAlert,
            label: 'Admin Panel',
            onClick: () => { navigate('/admin'); setIsOpen(false); },
            className: pendingUsersCount > 0
                ? 'bg-red-500 hover:bg-red-600 text-white animate-pulse'
                : 'bg-amber-500 hover:bg-amber-600 text-white',
            badge: pendingUsersCount > 0 ? pendingUsersCount : undefined
        }] : []),

        // Request Access - only for non-admins
        ...(!isAdmin ? [{
            id: 'request',
            icon: UserPlus,
            label: hasPendingRequest ? 'Check Status' : 'Request Access',
            onClick: () => { navigate('/request-access'); setIsOpen(false); },
            className: hasPendingRequest
                ? 'bg-amber-500 hover:bg-amber-600 text-white'
                : 'bg-blue-500 hover:bg-blue-600 text-white'
        }] : []),

        // Logout
        {
            id: 'logout',
            icon: LogOut,
            label: 'Logout',
            onClick: () => { onLogout(); setIsOpen(false); },
            className: 'bg-red-500/90 hover:bg-red-600 text-white'
        }
    ];

    return (
        <div className="fixed bottom-6 right-6 z-50 sm:hidden">
            {/* Action buttons - expand upward */}
            <div className={cn(
                "absolute bottom-16 right-0 flex flex-col-reverse gap-3 transition-all duration-300 origin-bottom",
                isOpen
                    ? "opacity-100 scale-100 pointer-events-auto"
                    : "opacity-0 scale-75 pointer-events-none"
            )}>
                {actions.map((action, index) => (
                    <div
                        key={action.id}
                        className="flex items-center justify-end gap-3"
                        style={{
                            transitionDelay: isOpen ? `${index * 50}ms` : '0ms',
                            transform: isOpen ? 'translateY(0)' : 'translateY(10px)',
                            opacity: isOpen ? 1 : 0,
                            transition: 'all 0.2s ease-out'
                        }}
                    >
                        {/* Label */}
                        <span className="text-xs font-semibold text-gray-700 dark:text-gray-200 bg-white dark:bg-gray-800 px-3 py-1.5 rounded-full shadow-lg border border-gray-200 dark:border-gray-700 whitespace-nowrap">
                            {action.label}
                        </span>

                        {/* Button */}
                        <button
                            onClick={action.onClick}
                            className={cn(
                                "relative w-12 h-12 rounded-full flex items-center justify-center shadow-lg transition-all duration-200",
                                action.className
                            )}
                        >
                            <action.icon className="h-5 w-5" />
                            {action.badge && (
                                <span className="absolute -top-1 -right-1 w-5 h-5 bg-white text-red-600 rounded-full text-xs font-bold flex items-center justify-center shadow">
                                    {action.badge}
                                </span>
                            )}
                        </button>
                    </div>
                ))}
            </div>

            {/* Main FAB button */}
            <button
                onClick={() => setIsOpen(!isOpen)}
                className={cn(
                    "w-14 h-14 rounded-full flex items-center justify-center shadow-xl transition-all duration-300",
                    isOpen
                        ? "bg-gray-700 dark:bg-gray-600 rotate-45"
                        : "bg-gradient-to-br from-indigo-500 to-purple-600 hover:from-indigo-600 hover:to-purple-700"
                )}
            >
                {isOpen ? (
                    <X className="h-6 w-6 text-white" />
                ) : (
                    <Settings className="h-6 w-6 text-white" />
                )}

                {/* Badge for pending users */}
                {!isOpen && pendingUsersCount > 0 && isAdmin && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white rounded-full text-xs font-bold flex items-center justify-center animate-pulse shadow">
                        {pendingUsersCount}
                    </span>
                )}
            </button>
        </div>
    );
}
