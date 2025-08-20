const { EmbedBuilder } = require('discord.js');

class Item {
    constructor(id, name, description, price, type, rarity = 'common', stats = {}) {
        this.id = id;
        this.name = name;
        this.description = description;
        this.price = price;
        this.type = type;
        this.rarity = rarity;
        this.stats = stats;
    }

    getEmbed() {
        const embed = new EmbedBuilder()
            .setColor(this.getRarityColor())
            .setTitle(this.getRarityIcon() + ' ' + this.name)
            .setDescription(this.description);

        if (Object.keys(this.stats).length > 0) {
            embed.addFields({
                name: '📊 Stats',
                value: Object.entries(this.stats)
                    .map(([stat, value]) => `${this.getStatIcon(stat)} ${stat}: ${value}`)
                    .join('\n'),
                inline: true
            });
        }

        embed.addFields(
            { name: '💰 Price', value: `${this.price} coins`, inline: true },
            { name: '📦 Type', value: this.type, inline: true }
        );

        return embed;
    }

    getRarityColor() {
        const colors = {
            common: '#AAAAAA',
            uncommon: '#55FF55',
            rare: '#5555FF',
            epic: '#AA00AA',
            legendary: '#FFAA00'
        };
        return colors[this.rarity] || colors.common;
    }

    getRarityIcon() {
        const icons = {
            common: '⚪',
            uncommon: '🟢',
            rare: '🔵',
            epic: '🟣',
            legendary: '🟡'
        };
        return icons[this.rarity] || icons.common;
    }

    getStatIcon(stat) {
        const icons = {
            attack: '⚔️',
            defense: '🛡️',
            health: '❤️',
            speed: '⚡',
            luck: '🍀',
            power: '💪'
        };
        return icons[stat.toLowerCase()] || '📊';
    }
}

// Equipment types
const EquipmentType = {
    WEAPON: 'weapon',
    ARMOR: 'armor',
    ACCESSORY: 'accessory',
    TOOL: 'tool',
    CONSUMABLE: 'consumable'
};

// Item templates
const ItemTemplates = {
    // WEAPONS - Common
    wooden_sword: {
        id: 'wooden_sword',
        name: '🗡️ Wooden Sword',
        description: 'A basic training sword made from sturdy oak',
        price: 100,
        type: EquipmentType.WEAPON,
        rarity: 'common',
        stats: { attack: 5, durability: 100 }
    },
    rusty_dagger: {
        id: 'rusty_dagger',
        name: '🔪 Rusty Dagger',
        description: 'An old dagger that\'s seen better days',
        price: 80,
        type: EquipmentType.WEAPON,
        rarity: 'common',
        stats: { attack: 4, speed: 2, durability: 80 }
    },

    // WEAPONS - Uncommon
    iron_sword: {
        id: 'iron_sword',
        name: '⚔️ Iron Sword',
        description: 'A reliable blade forged with quality iron',
        price: 500,
        type: EquipmentType.WEAPON,
        rarity: 'uncommon',
        stats: { attack: 15, durability: 150 }
    },
    silver_rapier: {
        id: 'silver_rapier',
        name: '🤺 Silver Rapier',
        description: 'An elegant blade favored by duelists',
        price: 750,
        type: EquipmentType.WEAPON,
        rarity: 'uncommon',
        stats: { attack: 12, speed: 8, luck: 3, durability: 140 }
    },

    // WEAPONS - Rare
    enchanted_blade: {
        id: 'enchanted_blade',
        name: '✨ Enchanted Blade',
        description: 'A sword imbued with magical properties',
        price: 1500,
        type: EquipmentType.WEAPON,
        rarity: 'rare',
        stats: { attack: 25, speed: 5, power: 10, durability: 200 }
    },

    // WEAPONS - Epic
    dragon_slayer: {
        id: 'dragon_slayer',
        name: '🐉 Dragon Slayer',
        description: 'Forged from dragon scales and blessed by ancient magic',
        price: 5000,
        type: EquipmentType.WEAPON,
        rarity: 'epic',
        stats: { attack: 40, power: 20, luck: 10, durability: 300 }
    },

    // WEAPONS - Legendary
    excalibur: {
        id: 'excalibur',
        name: '👑 Excalibur',
        description: 'The legendary sword of kings, unmatched in power',
        price: 25000,
        type: EquipmentType.WEAPON,
        rarity: 'legendary',
        stats: { attack: 75, power: 50, speed: 25, luck: 25, durability: 500 }
    },

    // ARMOR - Common
    leather_armor: {
        id: 'leather_armor',
        name: '🥋 Leather Armor',
        description: 'Basic protective gear made from tanned hide',
        price: 200,
        type: EquipmentType.ARMOR,
        rarity: 'common',
        stats: { defense: 5, durability: 120 }
    },
    cloth_robe: {
        id: 'cloth_robe',
        name: '👘 Cloth Robe',
        description: 'Simple robes favored by apprentice mages',
        price: 150,
        type: EquipmentType.ARMOR,
        rarity: 'common',
        stats: { defense: 3, power: 5, durability: 100 }
    },

    // ARMOR - Uncommon
    chainmail: {
        id: 'chainmail',
        name: '⛓️ Chainmail',
        description: 'Interlocking metal rings provide solid protection',
        price: 800,
        type: EquipmentType.ARMOR,
        rarity: 'uncommon',
        stats: { defense: 12, speed: -2, durability: 180 }
    },
    mage_robes: {
        id: 'mage_robes',
        name: '🧙‍♂️ Mage Robes',
        description: 'Robes woven with protective enchantments',
        price: 900,
        type: EquipmentType.ARMOR,
        rarity: 'uncommon',
        stats: { defense: 8, power: 15, durability: 160 }
    },

    // ARMOR - Rare
    plate_armor: {
        id: 'plate_armor',
        name: '🛡️ Plate Armor',
        description: 'Heavy armor that offers exceptional protection',
        price: 2000,
        type: EquipmentType.ARMOR,
        rarity: 'rare',
        stats: { defense: 25, health: 20, speed: -5, durability: 250 }
    },

    // ACCESSORIES - Common
    lucky_coin: {
        id: 'lucky_coin',
        name: '🪙 Lucky Coin',
        description: 'An old coin that brings good fortune',
        price: 300,
        type: EquipmentType.ACCESSORY,
        rarity: 'common',
        stats: { luck: 8 }
    },
    iron_ring: {
        id: 'iron_ring',
        name: '💍 Iron Ring',
        description: 'A simple band of metal',
        price: 200,
        type: EquipmentType.ACCESSORY,
        rarity: 'common',
        stats: { defense: 2, durability: 200 }
    },

    // ACCESSORIES - Uncommon
    power_amulet: {
        id: 'power_amulet',
        name: '🔮 Power Amulet',
        description: 'An amulet that enhances magical abilities',
        price: 1200,
        type: EquipmentType.ACCESSORY,
        rarity: 'uncommon',
        stats: { power: 12, luck: 5 }
    },

    // TOOLS
    treasure_map: {
        id: 'treasure_map',
        name: '🗺️ Treasure Map',
        description: 'Reveals hidden treasure locations in your area',
        price: 500,
        type: EquipmentType.TOOL,
        rarity: 'uncommon',
        stats: { luck: 15, treasure_chance: 25 }
    },
    fishing_rod: {
        id: 'fishing_rod',
        name: '🎣 Fishing Rod',
        description: 'A sturdy rod for catching fish',
        price: 300,
        type: EquipmentType.TOOL,
        rarity: 'common',
        stats: { fishing_skill: 10, durability: 150 }
    },
    pickaxe: {
        id: 'pickaxe',
        name: '⛏️ Pickaxe',
        description: 'Essential tool for mining precious ores',
        price: 400,
        type: EquipmentType.TOOL,
        rarity: 'common',
        stats: { mining_skill: 12, durability: 200 }
    },
    master_lockpick: {
        id: 'master_lockpick',
        name: '🔓 Master Lockpick',
        description: 'Can open even the most complex locks',
        price: 800,
        type: EquipmentType.TOOL,
        rarity: 'rare',
        stats: { luck: 10, treasure_chance: 35, lockpicking: 50 }
    },

    // CONSUMABLES - Healing
    health_potion: {
        id: 'health_potion',
        name: '🧪 Health Potion',
        description: 'Restores 50 HP instantly',
        price: 100,
        type: EquipmentType.CONSUMABLE,
        rarity: 'common',
        stats: { healing: 50 }
    },
    greater_health_potion: {
        id: 'greater_health_potion',
        name: '🧪 Greater Health Potion',
        description: 'Restores 150 HP instantly',
        price: 300,
        type: EquipmentType.CONSUMABLE,
        rarity: 'uncommon',
        stats: { healing: 150 }
    },
    
    // CONSUMABLES - Buffs
    strength_elixir: {
        id: 'strength_elixir',
        name: '💪 Strength Elixir',
        description: 'Temporarily increases attack power for 1 hour',
        price: 250,
        type: EquipmentType.CONSUMABLE,
        rarity: 'common',
        stats: { attack_buff: 10, duration: 3600 }
    },
    luck_charm: {
        id: 'luck_charm',
        name: '🍀 Luck Charm',
        description: 'Increases luck for the next 3 treasure hunts',
        price: 400,
        type: EquipmentType.CONSUMABLE,
        rarity: 'uncommon',
        stats: { luck_buff: 20, uses: 3 }
    },

    // RARE MATERIALS
    dragon_scale: {
        id: 'dragon_scale',
        name: '🐲 Dragon Scale',
        description: 'A rare crafting material from ancient dragons',
        price: 2000,
        type: 'material',
        rarity: 'epic',
        stats: { crafting_power: 50 }
    },
    phoenix_feather: {
        id: 'phoenix_feather',
        name: '🔥 Phoenix Feather',
        description: 'A mystical feather that burns with eternal flame',
        price: 3000,
        type: 'material',
        rarity: 'legendary',
        stats: { magic_power: 75, fire_resistance: 50 }
    },

    // SPECIAL ITEMS
    treasure_key: {
        id: 'treasure_key',
        name: '🔑 Ancient Treasure Key',
        description: 'Opens legendary treasure chests',
        price: 1000,
        type: 'special',
        rarity: 'rare',
        stats: { chest_access: 'legendary' }
    },
    time_crystal: {
        id: 'time_crystal',
        name: '⏰ Time Crystal',
        description: 'Reduces all cooldowns by 50% for 24 hours',
        price: 5000,
        type: 'special',
        rarity: 'legendary',
        stats: { cooldown_reduction: 50, duration: 86400 }
    }
};

class ItemManager {
    constructor() {
        this.items = new Map();
        this.loadItems();
    }

    loadItems() {
        for (const [id, template] of Object.entries(ItemTemplates)) {
            this.items.set(id, new Item(
                template.id,
                template.name,
                template.description,
                template.price,
                template.type,
                template.rarity,
                template.stats
            ));
        }
    }

    getItem(id) {
        return this.items.get(id);
    }

    getAllItems() {
        return Array.from(this.items.values());
    }

    getItemsByType(type) {
        return this.getAllItems().filter(item => item.type === type);
    }

    getItemsByRarity(rarity) {
        return this.getAllItems().filter(item => item.rarity === rarity);
    }
}

module.exports = {
    Item,
    ItemManager,
    EquipmentType,
    ItemTemplates
};
