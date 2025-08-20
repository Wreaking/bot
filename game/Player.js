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
        const { EmbedBuilder } = require('discord.js');
        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏰 Adventurer Profile')
            .setDescription(`**Level ${this.stats.level} Treasure Hunter**`)
            .addFields(
                { 
                    name: '💪 Combat Stats', 
                    value: `⚔️ Attack: ${this.stats.attack}\n🛡️ Defense: ${this.stats.defense}\n❤️ Health: ${this.stats.health}/${this.stats.maxHealth}\n⚡ Speed: ${this.stats.speed}`,
                    inline: true 
                },
                { 
                    name: '🍀 Special Stats', 
                    value: `🍀 Luck: ${this.stats.luck}\n✨ Power: ${this.stats.power || 0}\n🎯 Critical: ${this.getCriticalRate()}%\n🔄 Regen: ${this.getRegenRate()}/turn`,
                    inline: true 
                },
                { 
                    name: '⚔️ Equipment', 
                    value: this.getEquipmentDisplay(),
                    inline: true 
                },
                {
                    name: '🏆 Achievements',
                    value: `🎯 Hunts: ${this.progress.huntsCompleted}\n💰 Treasures: ${this.progress.treasuresFound}\n⚔️ Battles: ${this.progress.monstersDefeated}\n📜 Quests: ${this.progress.questsCompleted}`,
                    inline: true
                },
                {
                    name: '📊 Experience',
                    value: `🔥 Current XP: ${this.inventory.xp}\n⭐ Next Level: ${this.getXPForNextLevel()}\n📈 Progress: ${this.getXPProgressBar()}`,
                    inline: true
                },
                {
                    name: '💰 Wealth',
                    value: `💰 Coins: ${this.inventory.coins.toLocaleString()}\n💎 Net Worth: ${this.getNetWorth().toLocaleString()}\n🎒 Items: ${this.inventory.items.length}`,
                    inline: true
                }
            )
            .setFooter({ 
                text: `Power Level: ${this.getPowerLevel()} • Total Playtime: ${this.getPlaytime()}`
            })
            .setTimestamp();

        return embed;
    }

    getEquipmentDisplay() {
        const itemManager = require('./Items.js').ItemManager;
        const manager = new itemManager();
        
        return Object.entries(this.equipment)
            .map(([slot, itemId]) => {
                if (!itemId) return `${this.getSlotIcon(slot)} ${slot}: *None*`;
                const item = manager.getItem(itemId);
                return `${this.getSlotIcon(slot)} ${slot}: ${item ? item.name : 'Unknown'}`;
            })
            .join('\n');
    }

    getSlotIcon(slot) {
        const icons = {
            weapon: '⚔️',
            armor: '🛡️',
            accessory: '💍',
            tool: '🔧'
        };
        return icons[slot] || '📦';
    }

    getCriticalRate() {
        return Math.min(50, Math.floor(this.stats.luck / 2) + Math.floor(this.stats.level / 3));
    }

    getRegenRate() {
        return Math.floor(this.stats.level / 5) + 1;
    }

    getPowerLevel() {
        return Math.floor(
            (this.stats.attack * 2) + 
            (this.stats.defense * 1.5) + 
            (this.stats.speed * 1.2) + 
            (this.stats.luck * 0.8) + 
            (this.stats.level * 10)
        );
    }

    getNetWorth() {
        const itemManager = require('./Items.js').ItemManager;
        const manager = new itemManager();
        
        let totalValue = this.inventory.coins;
        
        // Add value of items in inventory
        this.inventory.items.forEach(invItem => {
            const item = manager.getItem(invItem.id);
            if (item) {
                totalValue += Math.floor(item.price * 0.7); // 70% of original value
            }
        });

        // Add value of equipped items
        Object.values(this.equipment).forEach(itemId => {
            if (itemId) {
                const item = manager.getItem(itemId);
                if (item) {
                    totalValue += item.price;
                }
            }
        });

        return totalValue;
    }

    getPlaytime() {
        const created = this.created || Date.now();
        const playtime = Date.now() - created;
        const days = Math.floor(playtime / (1000 * 60 * 60 * 24));
        const hours = Math.floor((playtime % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
        
        if (days > 0) {
            return `${days}d ${hours}h`;
        }
        return `${hours}h`;
    }

    getXPProgressBar() {
        const current = this.inventory.xp;
        const needed = this.getXPForNextLevel();
        const progress = Math.floor((current / needed) * 20);
        const bar = '█'.repeat(progress) + '░'.repeat(20 - progress);
        return `${bar} (${Math.floor((current / needed) * 100)}%)`;
    }

    // Advanced methods for treasure hunting
    getTreasureFindingBonus() {
        let bonus = 0;
        const itemManager = require('./Items.js').ItemManager;
        const manager = new itemManager();
        
        // Check equipment for treasure finding bonuses
        Object.values(this.equipment).forEach(itemId => {
            if (itemId) {
                const item = manager.getItem(itemId);
                if (item && item.stats.treasure_chance) {
                    bonus += item.stats.treasure_chance;
                }
            }
        });

        // Add luck bonus
        bonus += Math.floor(this.stats.luck / 2);
        
        return bonus;
    }

    canUseBuff(buffType) {
        if (!this.activeBuffs) this.activeBuffs = [];
        return !this.activeBuffs.some(buff => buff.type === buffType && buff.expires > Date.now());
    }

    addBuff(buffType, value, duration) {
        if (!this.activeBuffs) this.activeBuffs = [];
        
        // Remove existing buff of same type
        this.activeBuffs = this.activeBuffs.filter(buff => buff.type !== buffType);
        
        // Add new buff
        this.activeBuffs.push({
            type: buffType,
            value: value,
            expires: Date.now() + (duration * 1000)
        });
    }

    getActiveBuffs() {
        if (!this.activeBuffs) this.activeBuffs = [];
        
        // Remove expired buffs
        this.activeBuffs = this.activeBuffs.filter(buff => buff.expires > Date.now());
        
        return this.activeBuffs;
    }

    // Enhanced item management
    getItemCount(itemId) {
        return this.inventory.items.filter(item => item.id === itemId).length;
    }

    removeItems(itemId, count = 1) {
        let removed = 0;
        this.inventory.items = this.inventory.items.filter(item => {
            if (item.id === itemId && removed < count) {
                removed++;
                return false;
            }
            return true;
        });
        return removed;
    }

    addItems(itemId, count = 1) {
        for (let i = 0; i < count; i++) {
            this.addItem(itemId);
        }
    }

    // Save method for database integration
    toJSON() {
        return {
            id: this.id,
            inventory: this.inventory,
            stats: this.stats,
            equipment: this.equipment,
            progress: this.progress,
            activeBuffs: this.activeBuffs || [],
            created: this.created || Date.now(),
            lastActive: Date.now()
        };
    }
}

module.exports = Player;
