const shopItems = {
    // Weapons
    weapons: [
        {
            id: 'wooden_sword',
            name: '🗡️ Wooden Sword',
            description: 'A basic training sword made from wood, suitable for beginners.',
            price: 100,
            type: 'weapon',
            rarity: 'common',
            stats: { attack: 5, durability: 50 }
        },
        {
            id: 'iron_sword',
            name: '⚔️ Iron Sword',
            description: 'A reliable blade made from iron, offering a balance between attack and defense.',
            price: 500,
            type: 'weapon',
            rarity: 'uncommon',
            stats: { attack: 15, defense: 5, durability: 100 }
        },
        {
            id: 'mystic_blade',
            name: '🗡️ Mystic Blade',
            description: 'A sword imbued with magical power, capable of dealing massive damage to enemies.',
            price: 1500,
            type: 'weapon',
            rarity: 'rare',
            stats: { attack: 25, magic: 10, durability: 150 }
        }
    ],

    // Armor
    armor: [
        {
            id: 'leather_armor',
            name: '🥋 Leather Armor',
            description: 'Basic protective gear made from leather, providing minimal defense.',
            price: 200,
            type: 'armor',
            rarity: 'common',
            stats: { defense: 5, agility: 10 }
        },
        {
            id: 'chain_mail',
            name: '🛡️ Chain Mail',
            description: 'Flexible metal armor offering a balance between defense and agility.',
            price: 800,
            type: 'armor',
            rarity: 'uncommon',
            stats: { defense: 15, agility: 5 }
        },
        {
            id: 'dragon_scale',
            name: '🐉 Dragon Scale Armor',
            description: 'Armor forged from dragon scales, providing maximum defense and resistance to magic.',
            price: 2000,
            type: 'armor',
            rarity: 'rare',
            stats: { defense: 25, magic_resist: 10, agility: 5 }
        }
    ],

    // Accessories
    accessories: [
        {
            id: 'lucky_charm',
            name: '🍀 Lucky Charm',
            description: 'Increases your luck, allowing you to find rare items more often.',
            price: 300,
            type: 'accessory',
            rarity: 'common',
            stats: { luck: 5 }
        },
        {
            id: 'speed_boots',
            name: '👢 Speed Boots',
            description: 'Makes you more agile, increasing your movement speed.',
            price: 600,
            type: 'accessory',
            rarity: 'uncommon',
            stats: { speed: 10 }
        },
        {
            id: 'power_ring',
            name: '💍 Power Ring',
            description: 'Enhances all your abilities, increasing attack, defense, and speed.',
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
            description: 'Restores 50 HP, healing your wounds.',
            price: 100,
            type: 'consumable',
            rarity: 'common',
            stats: { healing: 50 }
        },
        {
            id: 'strength_potion',
            name: '💪 Strength Potion',
            description: 'Temporarily increases attack, making you stronger.',
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
            description: 'Reveals hidden treasure locations, leading you to riches.',
            price: 500,
            type: 'special',
            rarity: 'uncommon',
            stats: { luck: 10 }
        },
        {
            id: 'mystery_key',
            name: '🗝️ Mystery Key',
            description: 'Opens special treasure chests, granting you access to exclusive rewards.',
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
