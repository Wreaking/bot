const { EmbedBuilder } = require('discord.js');
const { Item, ItemManager } = require('./Items');

class Player {
    constructor(id, data = {}) {
        this.id = id;
        this.inventory = data.inventory || {
            coins: 100,
            xp: 0,
            items: []
        };
        this.stats = data.stats || {
            level: 1,
            health: 100,
            maxHealth: 100,
            attack: 10,
            defense: 5,
            speed: 10,
            luck: 5
        };
        this.equipment = data.equipment || {
            weapon: null,
            armor: null,
            accessory: null
        };
        this.progress = data.progress || {
            huntsCompleted: 0,
            treasuresFound: 0,
            monstersDefeated: 0,
            questsCompleted: 0
        };
    }

    addItem(itemId) {
        const itemManager = new ItemManager();
        const item = itemManager.getItem(itemId);
        if (!item) return false;

        this.inventory.items.push({
            id: item.id,
            obtained: Date.now()
        });
        return true;
    }

    removeItem(itemId) {
        const index = this.inventory.items.findIndex(item => item.id === itemId);
        if (index === -1) return false;
        
        this.inventory.items.splice(index, 1);
        return true;
    }

    hasItem(itemId) {
        return this.inventory.items.some(item => item.id === itemId);
    }

    equipItem(itemId) {
        const itemManager = new ItemManager();
        const item = itemManager.getItem(itemId);
        if (!item || !this.hasItem(itemId)) return false;

        // Check if item is equipment
        if (!['weapon', 'armor', 'accessory'].includes(item.type)) return false;

        // Unequip previous item in this slot
        if (this.equipment[item.type]) {
            this.addItem(this.equipment[item.type]);
        }

        // Equip new item
        this.equipment[item.type] = itemId;
        this.removeItem(itemId);

        // Update stats
        this.updateStats();
        return true;
    }

    unequipItem(slot) {
        if (!this.equipment[slot]) return false;
        
        // Add item back to inventory
        this.addItem(this.equipment[slot]);
        this.equipment[slot] = null;

        // Update stats
        this.updateStats();
        return true;
    }

    updateStats() {
        // Reset to base stats
        this.stats = {
            level: this.stats.level,
            health: 100 + (this.stats.level - 1) * 10,
            maxHealth: 100 + (this.stats.level - 1) * 10,
            attack: 10 + (this.stats.level - 1) * 2,
            defense: 5 + (this.stats.level - 1),
            speed: 10,
            luck: 5
        };

        // Add equipment bonuses
        const itemManager = new ItemManager();
        for (const [slot, itemId] of Object.entries(this.equipment)) {
            if (!itemId) continue;
            const item = itemManager.getItem(itemId);
            if (!item) continue;

            for (const [stat, value] of Object.entries(item.stats)) {
                if (this.stats.hasOwnProperty(stat)) {
                    this.stats[stat] += value;
                }
            }
        }
    }

    addXP(amount) {
        this.inventory.xp += amount;
        
        // Check for level up
        const xpNeeded = this.getXPForNextLevel();
        if (this.inventory.xp >= xpNeeded) {
            this.stats.level++;
            this.inventory.xp -= xpNeeded;
            this.updateStats();
            return true;
        }
        return false;
    }

    getXPForNextLevel() {
        return Math.floor(100 * Math.pow(1.5, this.stats.level - 1));
    }

    getProfileEmbed() {
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏰 Adventurer Profile')
            .addFields(
                { 
                    name: '📊 Stats', 
                    value: Object.entries(this.stats)
                        .map(([stat, value]) => `${stat}: ${value}`)
                        .join('\n'),
                    inline: true 
                },
                { 
                    name: '⚔️ Equipment', 
                    value: Object.entries(this.equipment)
                        .map(([slot, itemId]) => {
                            if (!itemId) return `${slot}: None`;
                            const itemManager = new ItemManager();
                            const item = itemManager.getItem(itemId);
                            return `${slot}: ${item ? item.name : 'Unknown'}`;
                        })
                        .join('\n'),
                    inline: true 
                },
                {
                    name: '📈 Progress',
                    value: Object.entries(this.progress)
                        .map(([key, value]) => `${key}: ${value}`)
                        .join('\n'),
                    inline: true
                }
            )
            .setFooter({ 
                text: `Level ${this.stats.level} • XP: ${this.inventory.xp}/${this.getXPForNextLevel()} • Coins: ${this.inventory.coins}`
            });

        return embed;
    }
}

module.exports = Player;
