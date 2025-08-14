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
    // Weapons
    wooden_sword: {
        id: 'wooden_sword',
        name: '🗡️ Wooden Sword',
        description: 'A basic training sword',
        price: 100,
        type: EquipmentType.WEAPON,
        rarity: 'common',
        stats: { attack: 5 }
    },
    iron_sword: {
        id: 'iron_sword',
        name: '⚔️ Iron Sword',
        description: 'A reliable blade',
        price: 500,
        type: EquipmentType.WEAPON,
        rarity: 'uncommon',
        stats: { attack: 15 }
    },

    // Armor
    leather_armor: {
        id: 'leather_armor',
        name: '🥋 Leather Armor',
        description: 'Basic protective gear',
        price: 200,
        type: EquipmentType.ARMOR,
        rarity: 'common',
        stats: { defense: 5 }
    },

    // Tools
    treasure_map: {
        id: 'treasure_map',
        name: '🗺️ Treasure Map',
        description: 'Reveals hidden treasure locations',
        price: 300,
        type: EquipmentType.TOOL,
        rarity: 'uncommon',
        stats: { luck: 10 }
    },
    
    // Consumables
    health_potion: {
        id: 'health_potion',
        name: '🧪 Health Potion',
        description: 'Restores 50 HP',
        price: 100,
        type: EquipmentType.CONSUMABLE,
        rarity: 'common',
        stats: { healing: 50 }
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
