const shopItems = {
    // Weapons
    weapons: [
        {
            id: 'wooden_sword',
            name: '🗡️ Wooden Sword',
            description: 'A basic training sword',
            price: 100,
            type: 'weapon',
            rarity: 'common',
            stats: { attack: 5 }
        },
        {
            id: 'iron_sword',
            name: '⚔️ Iron Sword',
            description: 'A reliable blade',
            price: 500,
            type: 'weapon',
            rarity: 'uncommon',
            stats: { attack: 15 }
        },
        {
            id: 'mystic_blade',
            name: '🗡️ Mystic Blade',
            description: 'A sword imbued with magical power',
            price: 1500,
            type: 'weapon',
            rarity: 'rare',
            stats: { attack: 25, magic: 10 }
        }
    ],

    // Armor
    armor: [
        {
            id: 'leather_armor',
            name: '🥋 Leather Armor',
            description: 'Basic protective gear',
            price: 200,
            type: 'armor',
            rarity: 'common',
            stats: { defense: 5 }
        },
        {
            id: 'chain_mail',
            name: '🛡️ Chain Mail',
            description: 'Flexible metal armor',
            price: 800,
            type: 'armor',
            rarity: 'uncommon',
            stats: { defense: 15 }
        },
        {
            id: 'dragon_scale',
            name: '🐉 Dragon Scale Armor',
            description: 'Armor forged from dragon scales',
            price: 2000,
            type: 'armor',
            rarity: 'rare',
            stats: { defense: 25, magic_resist: 10 }
        }
    ],

    // Accessories
    accessories: [
        {
            id: 'lucky_charm',
            name: '🍀 Lucky Charm',
            description: 'Increases your luck',
            price: 300,
            type: 'accessory',
            rarity: 'common',
            stats: { luck: 5 }
        },
        {
            id: 'speed_boots',
            name: '👢 Speed Boots',
            description: 'Makes you more agile',
            price: 600,
            type: 'accessory',
            rarity: 'uncommon',
            stats: { speed: 10 }
        },
        {
            id: 'power_ring',
            name: '💍 Power Ring',
            description: 'Enhances all your abilities',
            price: 1000,
            type: 'accessory',
            rarity: 'rare',
            stats: { attack: 5, defense: 5, speed: 5 }
        }
    ],

    // Consumables
    consumables: [
        {
            id: 'health_potion',
            name: '🧪 Health Potion',
            description: 'Restores 50 HP',
            price: 100,
            type: 'consumable',
            rarity: 'common',
            stats: { healing: 50 }
        },
        {
            id: 'strength_potion',
            name: '💪 Strength Potion',
            description: 'Temporarily increases attack',
            price: 150,
            type: 'consumable',
            rarity: 'common',
            stats: { attack_boost: 10 },
            duration: 3600000 // 1 hour
        }
    ],

    // Special Items
    special: [
        {
            id: 'treasure_map',
            name: '🗺️ Treasure Map',
            description: 'Reveals hidden treasure locations',
            price: 500,
            type: 'special',
            rarity: 'uncommon',
            stats: { luck: 10 }
        },
        {
            id: 'mystery_key',
            name: '🗝️ Mystery Key',
            description: 'Opens special treasure chests',
            price: 1000,
            type: 'special',
            rarity: 'rare',
            stats: { treasure_bonus: 20 }
        }
    ]
};

// Helper functions
function getItemById(id) {
    for (const category of Object.values(shopItems)) {
        const item = category.find(item => item.id === id);
        if (item) return item;
    }
    return null;
}

function getItemsByType(type) {
    return Object.values(shopItems)
        .flat()
        .filter(item => item.type === type);
}

function getItemsByRarity(rarity) {
    return Object.values(shopItems)
        .flat()
        .filter(item => item.rarity === rarity);
}

function getAllItems() {
    return Object.values(shopItems).flat();
}

module.exports = {
    shopItems,
    getItemById,
    getItemsByType,
    getItemsByRarity,
    getAllItems
};
