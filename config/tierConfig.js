// Subscription tier configuration
export const TIER_CONFIG = {
    // Map LemonSqueezy variant IDs to plan names and minutes
    variants: {
        '1170913': { plan: 'creator', minutes: 300 }, // Your LemonSqueezy variant - UPDATE plan if needed
        // Add more variant IDs as you create them in LemonSqueezy:
        // 'VARIANT_ID_2': { plan: 'pro', minutes: 500 },
        // 'VARIANT_ID_3': { plan: 'enterprise', minutes: 1000 },
    },

    // Default tier minutes (fallback if variant ID not found)
    plans: {
        free: 10,
        starter: 100,
        creator: 300,
        pro: 500
    }
};

// Helper: Get minutes for a plan
export function getTierMinutes(planName) {
    return TIER_CONFIG.plans[planName] || TIER_CONFIG.plans.free;
}

// Helper: Get plan from variant ID
export function getPlanFromVariant(variantId) {
    const variant = TIER_CONFIG.variants[variantId];
    if (variant) {
        return variant.plan;
    }

    // If no variant mapping exists, default to free
    console.warn(`Unknown variant ID: ${variantId}, defaulting to free plan`);
    return 'free';
}
