const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const ores = [
    { id: 'coal', name: 'Coal', rarity: 'common', value: 5, chance: 35, emoji: '⚫' },
    { id: 'copper', name: 'Copper Ore', rarity: 'common', value: 10, chance: 25, emoji: '🟤' },
    { id: 'iron', name: 'Iron Ore', rarity: 'common', value: 20, chance: 20, emoji: '⚪' },
    { id: 'silver', name: 'Silver Ore', rarity: 'uncommon', value: 50, chance: 10, emoji: '⚪' },
    { id: 'gold', name: 'Gold Ore', rarity: 'rare', value: 100, chance: 5, emoji: '🟡' },
    { id: 'crystal', name: 'Magic Crystal', rarity: 'rare', value: 150, chance: 3, emoji: '💎' },
    { id: 'mythril', name: 'Mythril Ore', rarity: 'legendary', value: 500, chance: 1.5, emoji: '✨' },
    { id: 'dragon_ore', name: 'Dragon Stone', rarity: 'mythical', value: 1000, chance: 0.5, emoji: '🐉' }
];

const gems = [
    { id: 'ruby', name: 'Ruby', rarity: 'rare', value: 200, chance: 2, emoji: '🔴' },
    { id: 'emerald', name: 'Emerald', rarity: 'rare', value: 250, chance: 1.5, emoji: '🟢' },
    { id: 'sapphire', name: 'Sapphire', rarity: 'rare', value: 300, chance: 1, emoji: '🔵' },
    { id: 'diamond', name: 'Diamond', rarity: 'legendary', value: 800, chance: 0.5, emoji: '💎' },
    { id: 'star_gem', name: 'Star Gem', rarity: 'mythical', value: 2000, chance: 0.1, emoji: '⭐' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mine')
        .setDescription('⛏️ Mine for precious ores, gems, and crafting materials!')
        .addStringOption(option =>
            option.setName('location')
                .setDescription('Choose mining location')
                .setRequired(false)
                .addChoices(
                    { name: '🏔️ Surface Mine (Easy)', value: 'surface' },
                    { name: '🕳️ Deep Cavern (Medium)', value: 'deep' },
                    { name: '🌋 Volcanic Cave (Hard)', value: 'volcanic' },
                    { name: '🐉 Dragon\'s Lair (Extreme)', value: 'dragon' }
                ))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('How long to mine (in minutes)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(60)),
    
    async execute(interaction) {
        const location = interaction.options?.getString('location') || 'surface';
        const duration = interaction.options?.getInteger('duration') || 5;
        const userId = interaction.user.id;
        
        // Check cooldown
        const userData = await db.getUser(userId) || {
            inventory: { coins: 0, items: [] },
            stats: { mining: 1, miningExp: 0 },
            cooldowns: {}
        };
        
        const lastMine = userData.cooldowns?.mining || 0;
        const cooldownTime = 60000; // 1 minute base cooldown
        const timeSinceLastMine = Date.now() - lastMine;
        
        if (timeSinceLastMine < cooldownTime) {
            const timeLeft = Math.ceil((cooldownTime - timeSinceLastMine) / 1000);
            return interaction.reply({
                content: `⏰ Your pickaxe needs to cool down! Wait ${timeLeft} more seconds.`,
                ephemeral: true
            });
        }
        
        // Check mining requirements
        const locationData = this.getLocationData(location);
        const miningLevel = userData.stats?.mining || 1;
        
        if (miningLevel < locationData.requiredLevel) {
            return interaction.reply({
                content: `❌ You need mining level ${locationData.requiredLevel} to access ${locationData.name}! Your current level is ${miningLevel}.`,
                ephemeral: true
            });
        }
        
        await interaction.deferReply();
        
        // Simulate mining process
        const results = this.simulateMining(location, duration, miningLevel);
        
        // Update user data
        userData.stats.mining = miningLevel;
        userData.stats.miningExp = (userData.stats.miningExp || 0) + results.experience;
        userData.inventory.coins = (userData.inventory.coins || 0) + results.totalValue;
        userData.cooldowns.mining = Date.now();
        
        // Add found items to inventory
        if (!userData.inventory.items) userData.inventory.items = [];
        results.items.forEach(item => {
            userData.inventory.items.push({
                id: item.id,
                name: item.name,
                category: 'materials',
                material: item.id,
                value: item.value,
                rarity: item.rarity,
                emoji: item.emoji,
                minedAt: Date.now(),
                minedLocation: location
            });
        });
        
        // Check for level up
        const newLevel = Math.floor(userData.stats.miningExp / 100) + 1;
        const leveledUp = newLevel > miningLevel;
        if (leveledUp) {
            userData.stats.mining = newLevel;
        }
        
        // Update statistics
        userData.stats.totalMined = (userData.stats.totalMined || 0) + results.items.length;
        userData.stats.miningTime = (userData.stats.miningTime || 0) + duration;
        
        await db.setUser(userId, userData);
        
        // Create result embed
        const embed = new EmbedBuilder()
            .setColor(this.getLocationColor(location))
            .setTitle(`⛏️ Mining Complete: ${locationData.name}`)
            .setDescription(`**${duration} minutes of hard work pays off!**`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields([
                {
                    name: '📊 Mining Session',
                    value: `⛏️ Location: **${locationData.name}**\n⏰ Duration: **${duration} minutes**\n⭐ Your Level: **${userData.stats.mining}**`,
                    inline: true
                },
                {
                    name: '💰 Earnings Summary',
                    value: `💎 Items Found: **${results.items.length}**\n💰 Total Value: **${results.totalValue} coins**\n🎯 Experience: **+${results.experience} XP**`,
                    inline: true
                },
                {
                    name: '📈 Progress',
                    value: `🏆 Mining Level: **${userData.stats.mining}**\n📊 Total XP: **${userData.stats.miningExp}**\n⛏️ Total Mined: **${userData.stats.totalMined}**`,
                    inline: true
                }
            ]);
            
        // Add found items
        if (results.items.length > 0) {
            const itemsByRarity = this.groupItemsByRarity(results.items);
            let itemText = '';
            
            Object.entries(itemsByRarity).forEach(([rarity, items]) => {
                if (items.length > 0) {
                    const rarityEmoji = this.getRarityEmoji(rarity);
                    itemText += `${rarityEmoji} **${rarity.toUpperCase()}**\n`;
                    items.forEach(item => {
                        itemText += `   ${item.emoji} ${item.name} (${item.value} coins)\n`;
                    });
                    itemText += '\n';
                }
            });
            
            embed.addFields([
                { name: '🎁 Items Discovered', value: itemText || 'No items found this time', inline: false }
            ]);
        } else {
            embed.addFields([
                { name: '😔 No Luck This Time', value: 'The mine was empty, but you gained valuable experience!', inline: false }
            ]);
        }
        
        // Add level up message
        if (leveledUp) {
            embed.addFields([
                { name: '🎉 Level Up!', value: `Your mining level increased to **${newLevel}**!\nYou can now access more challenging locations!`, inline: false }
            ]);
        }
        
        // Add special discoveries
        if (results.specialFind) {
            embed.addFields([
                { name: '✨ Special Discovery!', value: results.specialFind, inline: false }
            ]);
        }
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mine_again')
                    .setLabel('⛏️ Mine Again')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('mining_stats')
                    .setLabel('📊 Mining Stats')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('sell_ores')
                    .setLabel('💰 Sell Items')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('craft_materials')
                    .setLabel('🔨 Craft with Materials')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },
    
    simulateMining(location, duration, miningLevel) {
        const locationData = this.getLocationData(location);
        const results = {
            items: [],
            totalValue: 0,
            experience: duration * 5 // Base 5 XP per minute
        };
        
        // Calculate number of attempts based on duration and level
        const attempts = duration * (2 + Math.floor(miningLevel / 5));
        
        for (let i = 0; i < attempts; i++) {
            // Check for ore
            const oreChance = Math.random() * 100;
            let cumulativeChance = 0;
            
            for (const ore of ores) {
                const adjustedChance = ore.chance * locationData.multiplier;
                cumulativeChance += adjustedChance;
                
                if (oreChance <= cumulativeChance) {
                    results.items.push(ore);
                    results.totalValue += ore.value;
                    break;
                }
            }
            
            // Separate chance for gems
            if (location !== 'surface') {
                const gemChance = Math.random() * 100;
                let gemCumulativeChance = 0;
                
                for (const gem of gems) {
                    const adjustedGemChance = gem.chance * locationData.gemMultiplier;
                    gemCumulativeChance += adjustedGemChance;
                    
                    if (gemChance <= gemCumulativeChance) {
                        results.items.push(gem);
                        results.totalValue += gem.value;
                        break;
                    }
                }
            }
        }
        
        // Bonus experience for rare finds
        results.items.forEach(item => {
            if (item.rarity === 'legendary') results.experience += 50;
            else if (item.rarity === 'mythical') results.experience += 100;
            else if (item.rarity === 'rare') results.experience += 20;
        });
        
        // Special discoveries based on location and luck
        if (Math.random() < 0.05) { // 5% chance
            const specialFinds = [
                'You discovered an ancient mining tunnel!',
                'Your pickaxe uncovered a hidden treasure chest!',
                'You found mysterious cave paintings!',
                'A rare mineral vein was revealed!',
                'You stumbled upon an underground lake!'
            ];
            results.specialFind = specialFinds[Math.floor(Math.random() * specialFinds.length)];
            results.experience += 100;
        }
        
        return results;
    },
    
    getLocationData(location) {
        const locations = {
            surface: {
                name: 'Surface Mine',
                requiredLevel: 1,
                multiplier: 1.0,
                gemMultiplier: 0.5,
                danger: 'low',
                emoji: '🏔️'
            },
            deep: {
                name: 'Deep Cavern',
                requiredLevel: 5,
                multiplier: 1.5,
                gemMultiplier: 1.0,
                danger: 'medium',
                emoji: '🕳️'
            },
            volcanic: {
                name: 'Volcanic Cave',
                requiredLevel: 10,
                multiplier: 2.0,
                gemMultiplier: 1.5,
                danger: 'high',
                emoji: '🌋'
            },
            dragon: {
                name: 'Dragon\'s Lair',
                requiredLevel: 20,
                multiplier: 3.0,
                gemMultiplier: 2.5,
                danger: 'extreme',
                emoji: '🐉'
            }
        };
        
        return locations[location] || locations.surface;
    },
    
    getLocationColor(location) {
        const colors = {
            surface: 0x8B4513,
            deep: 0x2F4F4F,
            volcanic: 0xFF4500,
            dragon: 0x8B0000
        };
        return colors[location] || 0x808080;
    },
    
    groupItemsByRarity(items) {
        const grouped = {};
        items.forEach(item => {
            if (!grouped[item.rarity]) grouped[item.rarity] = [];
            grouped[item.rarity].push(item);
        });
        return grouped;
    },
    
    getRarityEmoji(rarity) {
        const emojis = {
            common: '⚪',
            uncommon: '🟢',
            rare: '🔵',
            legendary: '🟣',
            mythical: '🌟'
        };
        return emojis[rarity] || '⚪';
    }
};