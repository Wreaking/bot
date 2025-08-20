const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const fish = [
    { id: 'minnow', name: 'Tiny Minnow', rarity: 'common', value: 5, chance: 30, emoji: '🐟', size: 'tiny' },
    { id: 'trout', name: 'Rainbow Trout', rarity: 'common', value: 15, chance: 25, emoji: '🐟', size: 'small' },
    { id: 'bass', name: 'Large Bass', rarity: 'uncommon', value: 35, chance: 15, emoji: '🐠', size: 'medium' },
    { id: 'salmon', name: 'Wild Salmon', rarity: 'uncommon', value: 50, chance: 12, emoji: '🐟', size: 'medium' },
    { id: 'tuna', name: 'Bluefin Tuna', rarity: 'rare', value: 100, chance: 8, emoji: '🐟', size: 'large' },
    { id: 'shark', name: 'Tiger Shark', rarity: 'rare', value: 200, chance: 5, emoji: '🦈', size: 'huge' },
    { id: 'kraken', name: 'Baby Kraken', rarity: 'legendary', value: 500, chance: 2, emoji: '🐙', size: 'massive' },
    { id: 'sea_dragon', name: 'Sea Dragon', rarity: 'mythical', value: 1000, chance: 0.5, emoji: '🐉', size: 'legendary' }
];

const treasures = [
    { id: 'bottle', name: 'Message in a Bottle', value: 25, chance: 5, emoji: '🍼' },
    { id: 'chest', name: 'Sunken Treasure Chest', value: 100, chance: 2, emoji: '📦' },
    { id: 'pearl', name: 'Giant Pearl', value: 200, chance: 1, emoji: '🔮' },
    { id: 'crown', name: 'Lost Crown', value: 500, chance: 0.5, emoji: '👑' }
];

const locations = {
    pond: { name: 'Village Pond', level: 1, multiplier: 1.0, special: 0.05, emoji: '🏞️' },
    river: { name: 'Mountain River', level: 3, multiplier: 1.3, special: 0.08, emoji: '🏔️' },
    lake: { name: 'Crystal Lake', level: 5, multiplier: 1.6, special: 0.12, emoji: '💎' },
    ocean: { name: 'Deep Ocean', level: 8, multiplier: 2.0, special: 0.15, emoji: '🌊' },
    abyss: { name: 'Abyssal Depths', level: 15, multiplier: 3.0, special: 0.25, emoji: '🕳️' }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('fish')
        .setDescription('🎣 Cast your line and catch fish in various waters!')
        .addStringOption(option =>
            option.setName('location')
                .setDescription('Choose fishing location')
                .setRequired(false)
                .addChoices(
                    { name: '🏞️ Village Pond (Easy)', value: 'pond' },
                    { name: '🏔️ Mountain River (Medium)', value: 'river' },
                    { name: '💎 Crystal Lake (Hard)', value: 'lake' },
                    { name: '🌊 Deep Ocean (Expert)', value: 'ocean' },
                    { name: '🕳️ Abyssal Depths (Legendary)', value: 'abyss' }
                ))
        .addIntegerOption(option =>
            option.setName('duration')
                .setDescription('How long to fish (in minutes)')
                .setRequired(false)
                .setMinValue(1)
                .setMaxValue(30)),
    
    async execute(interaction) {
        const location = interaction.options?.getString('location') || 'pond';
        const duration = interaction.options?.getInteger('duration') || 10;
        const userId = interaction.user.id;
        
        const userData = await db.getPlayer(userId) || {
            inventory: { coins: 0, items: [] },
            stats: { fishing: 1, fishingExp: 0 },
            cooldowns: {}
        };
        
        // Check cooldown
        const lastFish = userData.cooldowns?.fishing || 0;
        const cooldownTime = 30000; // 30 seconds
        const timeSinceLastFish = Date.now() - lastFish;
        
        if (timeSinceLastFish < cooldownTime) {
            const timeLeft = Math.ceil((cooldownTime - timeSinceLastFish) / 1000);
            return interaction.reply({
                content: `🎣 You need to wait ${timeLeft} seconds before fishing again!`,
                ephemeral: true
            });
        }
        
        // Check location requirements
        const locationData = locations[location];
        const fishingLevel = userData.stats?.fishing || 1;
        
        if (fishingLevel < locationData.level) {
            return interaction.reply({
                content: `❌ You need fishing level ${locationData.level} to fish at ${locationData.name}! Your current level is ${fishingLevel}.`,
                ephemeral: true
            });
        }
        
        await interaction.deferReply();
        
        // Simulate fishing
        const results = this.simulateFishing(location, duration, fishingLevel);
        
        // Update user data
        userData.stats.fishingExp = (userData.stats.fishingExp || 0) + results.experience;
        userData.inventory.coins = (userData.inventory.coins || 0) + results.totalValue;
        userData.cooldowns.fishing = Date.now();
        
        // Add caught items to inventory
        if (!userData.inventory.items) userData.inventory.items = [];
        results.items.forEach(item => {
            userData.inventory.items.push({
                id: item.id,
                name: item.name,
                category: item.category || 'fish',
                value: item.value,
                rarity: item.rarity || 'common',
                emoji: item.emoji,
                caughtAt: Date.now(),
                caughtLocation: location,
                size: item.size
            });
        });
        
        // Check for level up
        const newLevel = Math.floor(userData.stats.fishingExp / 100) + 1;
        const leveledUp = newLevel > fishingLevel;
        if (leveledUp) {
            userData.stats.fishing = newLevel;
        }
        
        // Update fishing statistics
        userData.stats.totalFish = (userData.stats.totalFish || 0) + results.fish.length;
        userData.stats.fishingTime = (userData.stats.fishingTime || 0) + duration;
        userData.stats.biggestCatch = Math.max(userData.stats.biggestCatch || 0, results.biggestValue || 0);
        
        await db.setUser(userId, userData);
        
        // Create results embed
        const embed = new EmbedBuilder()
            .setColor(this.getLocationColor(location))
            .setTitle(`🎣 Fishing Results: ${locationData.name}`)
            .setDescription(`**${duration} minutes of peaceful fishing**`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields([
                {
                    name: '🎣 Fishing Session',
                    value: `📍 Location: **${locationData.name}**\n⏰ Duration: **${duration} minutes**\n🎯 Your Level: **${userData.stats.fishing}**`,
                    inline: true
                },
                {
                    name: '🐟 Catch Summary',
                    value: `🐠 Fish Caught: **${results.fish.length}**\n🎁 Treasures Found: **${results.treasures.length}**\n💰 Total Value: **${results.totalValue} coins**`,
                    inline: true
                },
                {
                    name: '📈 Experience',
                    value: `🎯 XP Gained: **+${results.experience}**\n📊 Total XP: **${userData.stats.fishingExp}**\n🏆 Fish Caught: **${userData.stats.totalFish}**`,
                    inline: true
                }
            ]);
            
        // Add caught fish details
        if (results.fish.length > 0) {
            const fishByRarity = this.groupByRarity(results.fish);
            let fishText = '';
            
            Object.entries(fishByRarity).forEach(([rarity, fishList]) => {
                if (fishList.length > 0) {
                    const rarityEmoji = this.getRarityEmoji(rarity);
                    fishText += `${rarityEmoji} **${rarity.toUpperCase()}**\n`;
                    fishList.forEach(fishItem => {
                        fishText += `   ${fishItem.emoji} ${fishItem.name} (${fishItem.value} coins)\n`;
                    });
                    fishText += '\n';
                }
            });
            
            embed.addFields([
                { name: '🐠 Fish Caught', value: fishText || 'No fish this time!', inline: false }
            ]);
        }
        
        // Add treasures found
        if (results.treasures.length > 0) {
            const treasureText = results.treasures.map(treasure => 
                `${treasure.emoji} ${treasure.name} (${treasure.value} coins)`
            ).join('\n');
            
            embed.addFields([
                { name: '🏴‍☠️ Treasures Discovered', value: treasureText, inline: false }
            ]);
        }
        
        // Add level up notification
        if (leveledUp) {
            embed.addFields([
                { name: '🎉 Level Up!', value: `Your fishing level increased to **${newLevel}**!\nNew fishing locations unlocked!`, inline: false }
            ]);
        }
        
        // Add special events
        if (results.specialEvent) {
            embed.addFields([
                { name: '✨ Special Event!', value: results.specialEvent, inline: false }
            ]);
        }
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('fish_again')
                    .setLabel('🎣 Fish Again')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('fishing_records')
                    .setLabel('📊 Fishing Records')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('sell_catch')
                    .setLabel('💰 Sell Catch')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('cook_fish')
                    .setLabel('🍳 Cook Fish')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        await interaction.editReply({ embeds: [embed], components: [buttons] });
    },
    
    simulateFishing(location, duration, fishingLevel) {
        const locationData = locations[location];
        const results = {
            fish: [],
            treasures: [],
            items: [],
            totalValue: 0,
            experience: duration * 3, // Base 3 XP per minute
            biggestValue: 0
        };
        
        // Calculate fishing attempts based on duration and skill
        const attempts = duration * (1 + Math.floor(fishingLevel / 3));
        
        for (let i = 0; i < attempts; i++) {
            // Try to catch fish
            const fishChance = Math.random() * 100;
            let cumulativeChance = 0;
            
            for (const fishItem of fish) {
                const adjustedChance = fishItem.chance * locationData.multiplier;
                cumulativeChance += adjustedChance;
                
                if (fishChance <= cumulativeChance) {
                    results.fish.push(fishItem);
                    results.items.push(fishItem);
                    results.totalValue += fishItem.value;
                    results.biggestValue = Math.max(results.biggestValue, fishItem.value);
                    
                    // Bonus XP for rare fish
                    if (fishItem.rarity === 'rare') results.experience += 15;
                    else if (fishItem.rarity === 'legendary') results.experience += 30;
                    else if (fishItem.rarity === 'mythical') results.experience += 50;
                    
                    break;
                }
            }
            
            // Chance to find treasure (separate from fish)
            const treasureChance = Math.random() * 100;
            if (treasureChance <= locationData.special * 100) {
                let treasureCumulativeChance = 0;
                for (const treasure of treasures) {
                    treasureCumulativeChance += treasure.chance;
                    if (Math.random() * 100 <= treasureCumulativeChance) {
                        results.treasures.push(treasure);
                        results.items.push({ ...treasure, category: 'treasure' });
                        results.totalValue += treasure.value;
                        results.experience += 25;
                        break;
                    }
                }
            }
        }
        
        // Special events based on location and luck
        if (Math.random() < 0.1) { // 10% chance
            const events = [
                'A school of fish swims by, increasing your catch!',
                'You spot a rare fishing spot and cast your line!',
                'The weather is perfect for fishing today!',
                'A friendly dolphin helps guide fish to your hook!',
                'You find an ancient fishing technique carved in stone!'
            ];
            results.specialEvent = events[Math.floor(Math.random() * events.length)];
            results.experience += 20;
            
            // Special event might add extra catch
            if (Math.random() < 0.5) {
                const bonusFish = fish[Math.floor(Math.random() * fish.length)];
                results.fish.push(bonusFish);
                results.items.push(bonusFish);
                results.totalValue += bonusFish.value;
            }
        }
        
        return results;
    },
    
    groupByRarity(items) {
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
    },
    
    getLocationColor(location) {
        const colors = {
            pond: 0x7CFC00,
            river: 0x4169E1,
            lake: 0x20B2AA,
            ocean: 0x006994,
            abyss: 0x000080
        };
        return colors[location] || 0x4682B4;
    }
};