/**
 * POS Mapping Constants
 * Maps POS IDs to human-readable names for the dashboard
 */

export interface POSInfo {
    id: number;
    name: string;
    table?: string;
}

// Grocery POS Mappings
export const GROCERY_POS: Record<number, POSInfo> = {
    25622: { id: 1, name: 'INSTAMART', table: 'buyhatke_grocery.instamart_PID_table' },
    25850: { id: 3, name: 'JIOMART_Grocery', table: 'buyhatke_grocery.jiomart_PID_table' },
    25848: { id: 5, name: 'FLIPKART_MINUTES', table: 'buyhatke_grocery.flipkart_minutes_PID_table' },
    25847: { id: 6, name: 'Amazon Now', table: 'buyhatke_grocery.amazon_now_PID_table' },
    25846: { id: 7, name: 'Amazon Fresh', table: 'buyhatke_grocery.amazon_fresh_PID_table' },
};

// E-commerce POS Mappings (example - add more as needed)
export const ECOMMERCE_POS: Record<number, POSInfo> = {
    2: { id: 2, name: 'Flipkart' },
    63: { id: 63, name: 'Amazon' },
    111: { id: 111, name: 'Myntra' },
    2191: { id: 2191, name: 'Ajio' },
    7376: { id: 7376, name: 'Meesho' },
};

// Combined POS Mapping
export const POS_MAPPING: Record<number, POSInfo> = {
    ...GROCERY_POS,
    ...ECOMMERCE_POS,
};

/**
 * Get POS name by ID
 */
export function getPOSName(posId: number | string): string {
    const id = typeof posId === 'string' ? parseInt(posId) : posId;
    return POS_MAPPING[id]?.name || `POS ${id}`;
}

/**
 * Get POS info by ID
 */
export function getPOSInfo(posId: number | string): POSInfo | undefined {
    const id = typeof posId === 'string' ? parseInt(posId) : posId;
    return POS_MAPPING[id];
}

/**
 * Check if POS is a grocery POS
 */
export function isGroceryPOS(posId: number | string): boolean {
    const id = typeof posId === 'string' ? parseInt(posId) : posId;
    return id in GROCERY_POS;
}

/**
 * Get all POS options for dropdowns
 */
export function getAllPOSOptions(): Array<{ value: string; label: string }> {
    return Object.entries(POS_MAPPING).map(([id, info]) => ({
        value: id,
        label: info.name,
    }));
}

/**
 * Get grocery POS options for dropdowns
 */
export function getGroceryPOSOptions(): Array<{ value: string; label: string }> {
    return Object.entries(GROCERY_POS).map(([id, info]) => ({
        value: id,
        label: info.name,
    }));
}
