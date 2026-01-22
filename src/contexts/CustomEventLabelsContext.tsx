import React, { createContext, useContext, useState, useCallback } from 'react';

interface CustomEventLabelsContextType {
    refreshTrigger: number;
    triggerRefresh: () => void;
}

const CustomEventLabelsContext = createContext<CustomEventLabelsContextType | undefined>(undefined);

export function CustomEventLabelsProvider({ children }: { children: React.ReactNode }) {
    const [refreshTrigger, setRefreshTrigger] = useState(0);

    const triggerRefresh = useCallback(() => {
        setRefreshTrigger(prev => prev + 1);
    }, []);

    return (
        <CustomEventLabelsContext.Provider
            value={{
                refreshTrigger,
                triggerRefresh
            }}
        >
            {children}
        </CustomEventLabelsContext.Provider>
    );
}

export function useCustomEventLabels() {
    const context = useContext(CustomEventLabelsContext);
    if (context === undefined) {
        throw new Error('useCustomEventLabels must be used within a CustomEventLabelsProvider');
    }
    return context;
}
