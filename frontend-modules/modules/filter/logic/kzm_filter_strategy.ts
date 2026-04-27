/**
 * 🛰️ KzmFilterStrategy (v1.0 - Sovereign Protocol)
 * ========================================================
 * Patterns: Strategy, Command.
 * Defining distinct behaviors for MEMO exploration vs Geographic search.
 */

export interface KzmFilterEffects {
    useStigmataDimming: boolean;   // MEMO++: Blackout mode
    useConstellationLines: boolean; // MEMO++: Purple ethereal connections
    forceClearRegionFocus: boolean; // Common: Clear regional glow highlights
    autoWarpToLocation: boolean;    // Regional: Warp map to specified geometry
    uxWeight: number;               // Interaction priority (0.1 ~ 1.0)
}

export interface KzmFilterStrategy {
    category: 'MEMO' | 'KR' | 'JP';
    accentColor: string;            // Standard: #9D50FF (Kuzmo Purple)
    effects: KzmFilterEffects;
}

export const KZM_FILTER_STRATEGIES: Record<string, KzmFilterStrategy> = {
    'MEMO': {
        category: 'MEMO',
        accentColor: '#9D50FF',
        effects: {
            useStigmataDimming: true,
            useConstellationLines: true,
            forceClearRegionFocus: true,
            autoWarpToLocation: false, // MEMO relies on marker link, not single point warp
            uxWeight: 1.0              // Full Sovereign focus
        }
    },
    'KR': {
        category: 'KR',
        accentColor: '#9D50FF',
        effects: {
            useStigmataDimming: false,
            useConstellationLines: false,
            forceClearRegionFocus: true,
            autoWarpToLocation: true,
            uxWeight: 0.8
        }
    },
    'JP': {
        category: 'JP',
        accentColor: '#9D50FF',
        effects: {
            useStigmataDimming: false,
            useConstellationLines: false,
            forceClearRegionFocus: true,
            autoWarpToLocation: true,
            uxWeight: 0.8
        }
    }
};

/**
 * 🛰️ [STRATEGY-RESOLVER] Get strategy by category key
 */
export function getKzmStrategy(category: string): KzmFilterStrategy {
    return KZM_FILTER_STRATEGIES[category] || KZM_FILTER_STRATEGIES['KR'];
}
