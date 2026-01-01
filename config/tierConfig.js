// Subscription tier configuration
export const TIER_CONFIG = {
    // Map LemonSqueezy variant IDs to plan names and minutes
    variants: {
        'VARIANT_ID_STANDARD': { plan: 'standard', minutes: 30 },
        'VARIANT_ID_PREMIUM': { plan: 'premium', minutes: 100 },
        '1170907': { plan: 'unlimited', minutes: -1 }, // -1 indicates unlimited
    },

    // Default tier minutes (fallback if variant ID not found)
    plans: {
        free: 10,
        standard: 30,
        premium: 100,
        unlimited: -1 // Unlimited
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
