interface EventDefinition {
    eventId: string;
    eventName: string;
    isApiEvent?: boolean;
    host?: string;
    url?: string;
    customName?: string;
}

/**
 * Get the display name for an event
 * @param event - Event definition object
 * @returns The custom label if set, otherwise the original event name
 */
export const getEventDisplayName = (event: EventDefinition): string => {
    if (!event) return '';
    
    // First priority: customName from event object (handle both camelCase and snake_case)
    const customName = (event as any).customName || (event as any).custom_name;
    if (customName && customName.trim() !== '') {
        return customName;
    }
    
    // Fallback to API event format or regular name
    if (event.isApiEvent && event.host && event.url) {
        return `${event.host} - ${event.url}`;
    }
    
    return event.eventName;
};

/**
 * Get display name by event ID from a list of events
 * @param eventId - Event ID to find
 * @param events - Array of events to search in
 * @returns The custom label if set, otherwise the original event name
 */
export const getEventNameById = (eventId: string, events: EventDefinition[]): string => {
    const event = events.find(e => String(e.eventId) === String(eventId));
    return event ? getEventDisplayName(event) : '';
};

/**
 * Hook to get the display name for an event, using custom label if available
 */
export function useEventName() {
    return {
        getEventDisplayName,
        getEventNameById
    };
}
