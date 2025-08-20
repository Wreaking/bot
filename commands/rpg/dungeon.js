
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const dungeons = {
    goblin_cave: {
        id: 'goblin_cave',
        name: 'Shadowfang Goblin Cave',
        difficulty: 'Beginner',
        requiredLevel: 1,
        floors: 5,
        maxPartySize: 4,
        monsters: ['Goblin Scout', 'Cave Rat', 'Goblin Warrior', 'Goblin Shaman', 'Goblin King'],
        rewards: { 
            coins: [150, 400], 
            experience: [100, 300], 
            items: ['Iron Dagger', 'Leather Boots', 'Goblin Tooth', 'Cave Crystal'],
            rareItems: ['Shadowfang Blade', 'Goblin Crown']
        },
        emoji: '🕳️',
        description: 'A network of dark caves infested with hostile goblins and their king.',
        hazards: ['Cave-ins', 'Poison Gas', 'Hidden Traps'],
        specialRooms: ['Treasury', 'Altar Room', 'Underground Lake']
    },
    haunted_forest: {
        id: 'haunted_forest',
        name: 'Whispering Haunted Forest',
        difficulty: 'Intermediate',
        requiredLevel: 5,
        floors: 7,
        maxPartySize: 5,
        monsters: ['Shadow Beast', 'Cursed Tree', 'Forest Wraith', 'Dark Elf', 'Ancient Treant'],
        rewards: { 
            coins: [300, 800], 
            experience: [250, 600], 
            items: ['Shadow Cloak', 'Mystic Staff', 'Cursed Wood', 'Spirit Essence'],
            rareItems: ['Wraithbane Sword', 'Cloak of Shadows']
        },
        emoji: '🌲',
        description: 'A cursed woodland where spirits roam and dark magic flows.',
        hazards: ['Cursed Fog', 'Spirit Attacks', 'Magical Illusions'],
        specialRooms: ['Druid Circle', 'Haunted Clearing', 'Spirit Portal']
    },
    crystal_caverns: {
        id: 'crystal_caverns',
        name: 'Luminous Crystal Caverns',
        difficulty: 'Advanced',
        requiredLevel: 10,
        floors: 10,
        maxPartySize: 6,
        monsters: ['Crystal Golem', 'Gem Spider', 'Cave Troll', 'Crystal Guardian', 'Prismatic Dragon'],
        rewards: { 
            coins: [700, 1500], 
            experience: [500, 1200], 
            items: ['Crystal Sword', 'Diamond Shield', 'Prismatic Gem', 'Golem Core'],
            rareItems: ['Crystalline Armor', 'Staff of Prisms']
        },
        emoji: '💎',
        description: 'Magnificent caverns filled with magical crystals and their guardians.',
        hazards: ['Crystal Explosions', 'Light Blindness', 'Maze Passages'],
        specialRooms: ['Crystal Heart Chamber', 'Gem Garden', 'Mirror Hall']
    },
    dragon_lair: {
        id: 'dragon_lair',
        name: 'Infernal Dragon Lair',
        difficulty: 'Expert',
        requiredLevel: 20,
        floors: 15,
        maxPartySize: 8,
        monsters: ['Dragon Hatchling', 'Fire Elemental', 'Dragon Knight', 'Elder Wyrm', 'Ancient Dragon Lord'],
        rewards: { 
            coins: [1500, 3500], 
            experience: [1000, 2500], 
            items: ['Dragon Scale Armor', 'Dragonslayer Sword', 'Dragon Heart', 'Flame Crystal'],
            rareItems: ['Legendary Dragon Equipment Set', 'Dragon Lord\'s Crown']
        },
        emoji: '🐉',
        description: 'The legendary lair of ancient dragons, filled with unimaginable treasures.',
        hazards: ['Lava Flows', 'Dragon Fire', 'Collapsing Chambers'],
        specialRooms: ['Treasure Hoard', 'Dragon Throne', 'Flame Sanctuary']
    },
    void_citadel: {
        id: 'void_citadel',
        name: 'Nightmare Void Citadel',
        difficulty: 'Legendary',
        requiredLevel: 30,
        floors: 25,
        maxPartySize: 10,
        monsters: ['Void Wraith', 'Shadow Demon', 'Void Knight', 'Nightmare Lord', 'Void Emperor'],
        rewards: { 
            coins: [3000, 7500], 
            experience: [2500, 6000], 
            items: ['Void Blade', 'Shadow Armor', 'Nightmare Essence', 'Void Crystal'],
            rareItems: ['Void Lord Equipment Set', 'Crown of Nightmares']
        },
        emoji: '🌑',
        description: 'A citadel existing between dimensions, home to the most powerful void entities.',
        hazards: ['Reality Tears', 'Void Magic', 'Dimensional Instability'],
        specialRooms: ['Void Throne', 'Reality Anchor', 'Nightmare Chamber']
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('dungeon')
        .setDescription('🏰 Explore dangerous dungeons with enhanced mechanics!')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Choose your dungeon action')
                .setRequired(false)
                .addChoices(
                    { name: '🗺️ Explore Dungeon', value: 'explore' },
                    { name: '📋 View Available Dungeons', value: 'list' },
                    { name: '🏆 Dungeon Statistics', value: 'stats' },
                    { name: '🎒 Prepare Expedition', value: 'prepare' },
                    { name: '👥 Form Party', value: 'party' }
                ))
        .addStringOption(option =>
            option.setName('dungeon')
                .setDescription('Select specific dungeon to explore')
                .setRequired(false)
                .addChoices(
                    { name: '🕳️ Shadowfang Goblin Cave', value: 'goblin_cave' },
                    { name: '🌲 Whispering Haunted Forest', value: 'haunted_forest' },
                    { name: '💎 Luminous Crystal Caverns', value: 'crystal_caverns' },
                    { name: '🐉 Infernal Dragon Lair', value: 'dragon_lair' },
                    { name: '🌑 Nightmare Void Citadel', value: 'void_citadel' }
                )),
    
    async execute(interaction) {
        const action = interaction.options?.getString('action') || 'list';
        const dungeonId = interaction.options?.getString('dungeon');
        
        switch (action) {
            case 'explore':
                await this.exploreDungeon(interaction, dungeonId);
                break;
            case 'stats':
                await this.showStats(interaction);
                break;
            case 'prepare':
                await this.prepareDungeon(interaction);
                break;
            case 'party':
                await this.manageParty(interaction);
                break;
            default:
                await this.listDungeons(interaction);
        }
    },
    
    async listDungeons(interaction) {
        const userId = interaction.user.id;
        const userData = await db.getPlayer(userId) || { level: 1, dungeonStats: {} };
        const userLevel = userData.level || 1;
        
        const embed = new EmbedBuilder()
            .setColor('#4B0082')
            .setTitle('🏰 Dungeon Explorer\'s Guild')
            .setDescription('**Welcome, brave adventurer!** Choose your next expedition into the depths of danger and mystery.')
            .setThumbnail('https://cdn.discordapp.com/emojis/742747860554686485.png')
            .addFields([
                {
                    name: '🎯 Explorer Profile',
                    value: `⭐ **Level:** ${userLevel}\n🏆 **Dungeons Cleared:** ${userData.dungeonStats?.totalCleared || 0}\n💰 **Coins:** ${userData.coins || 0}\n🎁 **Rare Items Found:** ${userData.dungeonStats?.rareItemsFound || 0}`,
                    inline: true
                },
                {
                    name: '🗺️ Expedition Tips',
                    value: '• Bring healing potions for survival\n• Form parties for better rewards\n• Watch for environmental hazards\n• Explore special rooms for bonuses\n• Save before boss fights',
                    inline: true
                },
                {
                    name: '🏅 Mastery Progress',
                    value: `🥉 **Novice Explorer:** ${userData.dungeonStats?.totalCleared >= 5 ? '✅' : `${userData.dungeonStats?.totalCleared || 0}/5`}\n🥈 **Veteran Delver:** ${userData.dungeonStats?.totalCleared >= 15 ? '✅' : `${userData.dungeonStats?.totalCleared || 0}/15`}\n🥇 **Master Explorer:** ${userData.dungeonStats?.totalCleared >= 50 ? '✅' : `${userData.dungeonStats?.totalCleared || 0}/50`}`,
                    inline: true
                }
            ]);
            
        // Add dungeon details with enhanced information
        Object.values(dungeons).forEach(dungeon => {
            const canEnter = userLevel >= dungeon.requiredLevel;
            const statusIcon = canEnter ? '✅' : '🔒';
            const completions = userData.dungeonStats?.[dungeon.id] || 0;
            
            embed.addFields([{
                name: `${dungeon.emoji} ${dungeon.name} ${statusIcon}`,
                value: `**${dungeon.difficulty}** • Level ${dungeon.requiredLevel}+ Required\n` +
                       `🏢 ${dungeon.floors} floors • 👥 Max party: ${dungeon.maxPartySize}\n` +
                       `💰 ${dungeon.rewards.coins[0]}-${dungeon.rewards.coins[1]} coins • 🎯 ${dungeon.rewards.experience[0]}-${dungeon.rewards.experience[1]} XP\n` +
                       `✅ Completed: ${completions} times\n` +
                       `⚠️ Hazards: ${dungeon.hazards.slice(0, 2).join(', ')}`,
                inline: true
            }]);
        });
        
        const dungeonSelect = new StringSelectMenuBuilder()
            .setCustomId('dungeon_explore_select')
            .setPlaceholder('🗺️ Select a dungeon to explore...')
            .addOptions(
                Object.values(dungeons).map(dungeon => {
                    const canEnter = userLevel >= dungeon.requiredLevel;
                    return {
                        label: `${dungeon.name}`,
                        description: `${dungeon.difficulty} • ${dungeon.floors} floors • Level ${dungeon.requiredLevel}+`,
                        value: `explore_${dungeon.id}`,
                        emoji: dungeon.emoji,
                        disabled: !canEnter
                    };
                })
            );
            
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dungeon_prepare')
                    .setLabel('🎒 Prepare Expedition')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('dungeon_party_form')
                    .setLabel('👥 Form Party')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('dungeon_stats_view')
                    .setLabel('📊 My Statistics')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('dungeon_shop')
                    .setLabel('🛒 Expedition Shop')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        const components = [
            new ActionRowBuilder().addComponents(dungeonSelect),
            buttons
        ];
        
        await interaction.reply({ embeds: [embed], components });
    },
    
    async exploreDungeon(interaction, dungeonId) {
        const userId = interaction.user.id;
        
        // Check if user is already in a dungeon
        if (interaction.client.activeDungeons?.has(userId)) {
            return interaction.reply({
                content: '🏰 You are already exploring a dungeon! Complete or abandon it first.',
                ephemeral: true
            });
        }
        
        if (!dungeonId) {
            return interaction.reply({
                content: '❌ Please select a dungeon to explore!',
                ephemeral: true
            });
        }
        
        const dungeon = dungeons[dungeonId];
        if (!dungeon) {
            return interaction.reply({
                content: '❌ Dungeon not found!',
                ephemeral: true
            });
        }
        
        const userData = await db.getPlayer(userId) || { level: 1, health: 100, maxHealth: 100 };
        const userLevel = userData.level || 1;
        
        if (userLevel < dungeon.requiredLevel) {
            const embed = new EmbedBuilder()
                .setColor('#FF6B6B')
                .setTitle('⚠️ Level Requirement Not Met')
                .setDescription(`You need to be at least **level ${dungeon.requiredLevel}** to enter ${dungeon.name}!\nYour current level: **${userLevel}**`)
                .addFields([
                    { name: '💡 Suggestion', value: 'Try easier dungeons first or train your character!', inline: false }
                ])
                .setTimestamp();
                
            return interaction.reply({ embeds: [embed], ephemeral: true });
        }
        
        // Initialize dungeon exploration
        if (!interaction.client.activeDungeons) {
            interaction.client.activeDungeons = new Map();
        }
        
        const dungeonState = {
            dungeon: dungeon,
            currentFloor: 1,
            hp: userData.health || 100,
            maxHp: userData.maxHealth || 100,
            mp: userData.mana || 50,
            maxMp: userData.maxMana || 50,
            inventoryUsed: [],
            startTime: Date.now(),
            rewards: { coins: 0, experience: 0, items: [] },
            roomsExplored: 0,
            secretsFound: 0,
            monstersDefeated: 0,
            hazardsEncountered: 0
        };
        
        interaction.client.activeDungeons.set(userId, dungeonState);
        
        const embed = new EmbedBuilder()
            .setColor(this.getDifficultyColor(dungeon.difficulty))
            .setTitle(`${dungeon.emoji} Entering ${dungeon.name}`)
            .setDescription(`**${dungeon.description}**\n\nYou stand at the entrance, feeling the ominous energy emanating from within...`)
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .addFields([
                { 
                    name: '🎯 Expedition Details', 
                    value: `**Difficulty:** ${dungeon.difficulty}\n**Floors:** ${dungeon.floors}\n**Current Floor:** 1/${dungeon.floors}\n**Party Size:** Solo`, 
                    inline: true 
                },
                { 
                    name: '❤️ Your Condition', 
                    value: `**HP:** ${dungeonState.hp}/${dungeonState.maxHp}\n**MP:** ${dungeonState.mp}/${dungeonState.maxMp}\n**Level:** ${userLevel}\n**Potions:** ${userData.inventory?.potions?.length || 0}`, 
                    inline: true 
                },
                { 
                    name: '🎁 Expected Rewards', 
                    value: `💰 **${dungeon.rewards.coins[0]}-${dungeon.rewards.coins[1]}** coins\n🎯 **${dungeon.rewards.experience[0]}-${dungeon.rewards.experience[1]}** XP\n🎁 **Rare items** and equipment\n🏆 **Dungeon completion** bonus`, 
                    inline: true 
                },
                {
                    name: '⚠️ Dungeon Hazards',
                    value: dungeon.hazards.map(h => `• ${h}`).join('\n'),
                    inline: true
                },
                {
                    name: '🏛️ Special Locations',
                    value: dungeon.specialRooms.map(r => `• ${r}`).join('\n'),
                    inline: true
                },
                {
                    name: '👹 Monster Types',
                    value: dungeon.monsters.slice(0, 3).map(m => `• ${m}`).join('\n'),
                    inline: true
                }
            ])
            .setFooter({ text: 'Choose your actions carefully! Death means losing progress.' })
            .setTimestamp();
            
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('dungeon_proceed')
                    .setLabel('🚶 Proceed Forward')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('dungeon_search')
                    .setLabel('🔍 Search for Secrets')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('dungeon_rest')
                    .setLabel('😴 Rest & Recover')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('dungeon_status')
                    .setLabel('📊 Check Status')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('dungeon_retreat')
                    .setLabel('🏃 Retreat Safely')
                    .setStyle(ButtonStyle.Danger)
            );
            
        await interaction.reply({ embeds: [embed], components: [buttons] });
        
        // Set timeout for dungeon exploration
        setTimeout(() => {
            if (interaction.client.activeDungeons?.has(userId)) {
                interaction.client.activeDungeons.delete(userId);
                interaction.followUp({
                    content: '⏰ Your dungeon expedition has timed out! You safely retreat to the entrance.',
                    ephemeral: true
                });
            }
        }, 1800000); // 30 minutes
    },
    
    async showStats(interaction) {
        const userId = interaction.user.id;
        const userData = await db.getPlayer(userId) || {};
        
        const stats = userData.dungeonStats || {
            totalEntered: 0,
            totalCleared: 0,
            totalDeaths: 0,
            deepestFloor: 1,
            longestExpedition: 0,
            rareItemsFound: 0,
            secretsDiscovered: 0,
            bossesDefeated: 0
        };
        
        const embed = new EmbedBuilder()
            .setColor('#8A2BE2')
            .setTitle(`🏰 ${interaction.user.displayName}'s Dungeon Chronicles`)
            .setDescription('**Your legendary exploration achievements and records**')
            .setThumbnail(interaction.user.displayAvatarURL({ dynamic: true }))
            .addFields([
                {
                    name: '📊 Exploration Records',
                    value: `🏰 **Dungeons Entered:** ${stats.totalEntered}\n✅ **Successfully Cleared:** ${stats.totalCleared}\n💀 **Deaths:** ${stats.totalDeaths}\n📈 **Success Rate:** ${stats.totalEntered ? Math.round((stats.totalCleared / stats.totalEntered) * 100) : 0}%`,
                    inline: true
                },
                {
                    name: '🏆 Epic Achievements',
                    value: `🏢 **Deepest Floor Reached:** ${stats.deepestFloor}\n⏰ **Longest Expedition:** ${stats.longestExpedition} min\n🎁 **Rare Items Found:** ${stats.rareItemsFound}\n🔍 **Secrets Discovered:** ${stats.secretsDiscovered}`,
                    inline: true
                },
                {
                    name: '👹 Combat Statistics',
                    value: `👑 **Bosses Defeated:** ${stats.bossesDefeated}\n⚔️ **Monsters Slain:** ${stats.monstersKilled || 0}\n🛡️ **Hazards Survived:** ${stats.hazardsSurvived || 0}\n🏆 **Perfect Runs:** ${stats.perfectRuns || 0}`,
                    inline: true
                }
            ]);

        // Add individual dungeon statistics
        const dungeonCompletions = Object.entries(dungeons).map(([id, dungeon]) => {
            const completions = stats[id] || 0;
            return `${dungeon.emoji} **${dungeon.name}:** ${completions} ${completions === 1 ? 'completion' : 'completions'}`;
        }).join('\n');

        embed.addFields([
            {
                name: '🗺️ Dungeon Mastery Progress',
                value: dungeonCompletions || 'No dungeons completed yet',
                inline: false
            }
        ]);
        
        // Add mastery badges
        const badges = [];
        if (stats.totalCleared >= 5) badges.push('🥉 **Novice Explorer**');
        if (stats.totalCleared >= 15) badges.push('🥈 **Veteran Delver**');
        if (stats.totalCleared >= 50) badges.push('🥇 **Master Explorer**');
        if (stats.rareItemsFound >= 10) badges.push('💎 **Treasure Hunter**');
        if (stats.secretsDiscovered >= 20) badges.push('🔍 **Secret Finder**');
        
        if (badges.length > 0) {
            embed.addFields([
                {
                    name: '🏅 Earned Badges',
                    value: badges.join('\n'),
                    inline: false
                }
            ]);
        }
            
        embed.setFooter({ text: 'Keep exploring to unlock more achievements!' })
             .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    },
    
    async prepareDungeon(interaction) {
        const userId = interaction.user.id;
        const userData = await db.getPlayer(userId) || { inventory: { items: [], potions: [] } };
        
        const potions = userData.inventory.potions || [];
        const weapons = userData.inventory.items?.filter(item => item.category === 'weapons') || [];
        const armor = userData.inventory.items?.filter(item => item.category === 'armor') || [];
        
        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('🎒 Dungeon Expedition Preparation Center')
            .setDescription('**Prepare yourself for the perils ahead!** Proper preparation can mean the difference between triumph and tragedy.')
            .setThumbnail('https://cdn.discordapp.com/emojis/742747860554686485.png')
            .addFields([
                {
                    name: '⚔️ Combat Readiness Assessment',
                    value: `🗡️ **Weapons:** ${weapons.length} equipped\n🛡️ **Armor:** ${armor.length} pieces\n⚡ **Equipment Power:** ${this.calculatePower(userData)}\n🎯 **Combat Level:** ${userData.skills?.combat?.level || 1}`,
                    inline: true
                },
                {
                    name: '🧪 Supplies & Consumables',
                    value: `❤️ **Health Potions:** ${potions.filter(p => p.type === 'health').length}\n💙 **Mana Potions:** ${potions.filter(p => p.type === 'mana').length}\n🍀 **Buff Potions:** ${potions.filter(p => p.type === 'buff').length}\n🧳 **Total Items:** ${userData.inventory.items?.length || 0}`,
                    inline: true
                },
                {
                    name: '💡 Expert Preparation Tips',
                    value: '• **Bring 5+ health potions** for survival\n• **Equip your best gear** before entering\n• **Form a party** for challenging dungeons\n• **Study monster weaknesses** beforehand\n• **Save escape items** for emergencies',
                    inline: false
                },
                {
                    name: '🎯 Recommended Gear by Difficulty',
                    value: '**Beginner:** Basic weapons, leather armor\n**Intermediate:** Steel weapons, chainmail\n**Advanced:** Enchanted gear, magical items\n**Expert:** Legendary equipment sets\n**Legendary:** Artifact-level equipment',
                    inline: false
                }
            ])
            .setFooter({ text: 'Well-prepared adventurers have higher survival rates!' })
            .setTimestamp();
            
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('inventory_manage')
                    .setLabel('⚡ Manage Equipment')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('shop_potions_buy')
                    .setLabel('🧪 Buy Potions')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('dungeon_guide')
                    .setLabel('📖 Dungeon Guide')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('party_recruitment')
                    .setLabel('👥 Find Party')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('dungeon_list_return')
                    .setLabel('🗺️ Select Dungeon')
                    .setStyle(ButtonStyle.Primary)
            );
            
        await interaction.reply({ embeds: [embed], components: [buttons] });
    },

    async manageParty(interaction) {
        const embed = new EmbedBuilder()
            .setColor('#32CD32')
            .setTitle('👥 Dungeon Party Management')
            .setDescription('**Form or join a party for enhanced dungeon exploration!** Parties provide better rewards and survival chances.')
            .addFields([
                {
                    name: '🎯 Party Benefits',
                    value: '• **Shared Health Pool** - Support each other\n• **Combined Skills** - Use different abilities\n• **Bonus Rewards** - Extra loot and XP\n• **Revive Fallen Members** - Second chances\n• **Strategy Coordination** - Plan your approach',
                    inline: false
                },
                {
                    name: '📋 Party Roles',
                    value: '⚔️ **Tank** - High defense, protects party\n🏹 **DPS** - High damage, eliminates threats\n❤️ **Healer** - Supports and heals party\n🎯 **Scout** - Finds secrets and disarms traps',
                    inline: false
                }
            ])
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('party_create')
                    .setLabel('Create Party')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('➕'),
                new ButtonBuilder()
                    .setCustomId('party_join')
                    .setLabel('Join Party')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('👥'),
                new ButtonBuilder()
                    .setCustomId('party_search')
                    .setLabel('Find Parties')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔍')
            );

        await interaction.reply({ embeds: [embed], components: [buttons] });
    },
    
    getDifficultyColor(difficulty) {
        const colors = {
            'Beginner': '#00FF00',
            'Intermediate': '#FFFF00',
            'Advanced': '#FF6600',
            'Expert': '#FF0000',
            'Legendary': '#800080'
        };
        return colors[difficulty] || '#808080';
    },
    
    calculatePower(userData) {
        let power = (userData.level || 1) * 15;
        if (userData.equipment?.weapon) power += 30;
        if (userData.equipment?.armor) power += 25;
        if (userData.equipment?.accessory) power += 15;
        return power;
    }
};
