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
 * Get human-readable name for a POS ID
 * Priority: siteDetails (by originalKey) > POS_MAPPING > siteDetails (by name lookup) > pass-through
 * @param id - The POS name or ID to resolve
 * @param siteDetails - Optional siteDetails array from the API (has proper short names)
 * @param originalKey - Optional original key from the API response (numeric POS ID)
 */
export function getPOSName(
    id: number | string,
    siteDetails?: Array<{ id: number; name: string; image?: string }>,
    originalKey?: string
): string {
    if (id === null || id === undefined) {
        return 'Unknown POS';
    }

    const idStr = String(id).trim();

    // 1. Try siteDetails by originalKey first (highest priority — this is the numeric POS ID)
    if (originalKey && siteDetails && siteDetails.length > 0) {
        const keyNum = parseInt(originalKey);
        if (!isNaN(keyNum)) {
            const siteMatch = siteDetails.find(s => s.id === keyNum);
            if (siteMatch && siteMatch.name && !/^\d+$/.test(siteMatch.name.trim())) {
                return siteMatch.name;
            }
        }
    }

    // 2. CRITICAL: Check if it's in format "Pos 25850" - extract the number!
    const posMatch = idStr.match(/^pos\s+(\d+)$/i);
    if (posMatch) {
        const extractedId = parseInt(posMatch[1]);
        // Check siteDetails first
        if (siteDetails && siteDetails.length > 0) {
            const siteMatch = siteDetails.find(s => s.id === extractedId);
            if (siteMatch && siteMatch.name && !/^\d+$/.test(siteMatch.name.trim())) return siteMatch.name;
        }
        if (POS_MAPPING[extractedId]) {
            return POS_MAPPING[extractedId].name;
        }
    }

    // 3. Try numeric lookup (siteDetails first, then POS_MAPPING)
    const numericId = typeof id === 'number' ? id : parseInt(idStr);
    if (!isNaN(numericId)) {
        if (siteDetails && siteDetails.length > 0) {
            const siteMatch = siteDetails.find(s => s.id === numericId);
            if (siteMatch && siteMatch.name && !/^\d+$/.test(siteMatch.name.trim())) return siteMatch.name;
        }
        if (POS_MAPPING[numericId]) {
            return POS_MAPPING[numericId].name;
        }
    }

    // 4. Try string name lookup in POS_MAPPING (case-insensitive)
    const lowerStr = idStr.toLowerCase();
    const found = Object.values(POS_MAPPING).find(
        pos => pos.name.toLowerCase() === lowerStr
    );
    if (found) {
        return found.name;
    }

    // 5. Capitalize valid strings
    if (isNaN(Number(idStr)) && idStr.length > 0) {
        return idStr.charAt(0).toUpperCase() + idStr.slice(1);
    }

    return `POS ${id}`;
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
