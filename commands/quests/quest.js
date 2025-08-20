
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

// Enhanced treasure hunting quest system
const treasureLocations = {
    mystic_forest: {
        name: 'Enchanted Mystic Forest',
        emoji: '🌲',
        difficulty: 'Easy',
        description: 'Ancient woods filled with magical creatures and hidden treasures',
        hazards: ['Wild Animals', 'Magical Traps', 'Lost Paths'],
        treasures: ['Ancient Amulet', 'Elven Coin', 'Magic Herbs', 'Crystal Shard'],
        requiredLevel: 1,
        baseReward: { coins: 200, exp: 100 }
    },
    dragon_hoard: {
        name: 'Abandoned Dragon\'s Hoard',
        emoji: '🐉',
        difficulty: 'Medium',
        description: 'The treasure chamber of a long-departed dragon',
        hazards: ['Dragon Traps', 'Cursed Gold', 'Guardian Spirits'],
        treasures: ['Dragon Scale', 'Golden Chalice', 'Enchanted Weapon', 'Rare Gems'],
        requiredLevel: 5,
        baseReward: { coins: 500, exp: 250 }
    },
    sunken_temple: {
        name: 'Submerged Ancient Temple',
        emoji: '🏛️',
        difficulty: 'Hard',
        description: 'Underwater ruins of a civilization lost to time',
        hazards: ['Drowning', 'Sea Monsters', 'Crumbling Structure'],
        treasures: ['Divine Artifact', 'Waterproof Scrolls', 'Pearl of Wisdom', 'Poseidon\'s Blessing'],
        requiredLevel: 10,
        baseReward: { coins: 1000, exp: 500 }
    },
    phantom_ship: {
        name: 'Ghost Ship\'s Treasury',
        emoji: '👻',
        difficulty: 'Very Hard',
        description: 'The ethereal vessel of a cursed pirate captain',
        hazards: ['Spectral Crew', 'Cursed Weather', 'Dimensional Rifts'],
        treasures: ['Captain\'s Chest', 'Spectral Compass', 'Cursed Doubloons', 'Soul Anchor'],
        requiredLevel: 15,
        baseReward: { coins: 2000, exp: 1000 }
    },
    void_vault: {
        name: 'Interdimensional Void Vault',
        emoji: '🌌',
        difficulty: 'Legendary',
        description: 'A treasury existing between dimensions',
        hazards: ['Reality Distortion', 'Void Creatures', 'Madness Inducement'],
        treasures: ['Cosmic Orb', 'Reality Fragment', 'Void Crystal', 'Infinity Shard'],
        requiredLevel: 20,
        baseReward: { coins: 5000, exp: 2500 }
    }
};

const questTypes = {
    retrieval: {
        name: 'Treasure Retrieval',
        emoji: '💎',
        description: 'Locate and retrieve specific valuable items',
        objectives: ['Find the treasure location', 'Overcome obstacles', 'Secure the treasure', 'Return safely']
    },
    exploration: {
        name: 'Area Exploration',
        emoji: '🗺️',
        description: 'Map and explore unknown territories',
        objectives: ['Scout the area perimeter', 'Document key locations', 'Identify potential threats', 'Create detailed map']
    },
    rescue: {
        name: 'Rescue Mission',
        emoji: '🆘',
        description: 'Save missing persons or creatures',
        objectives: ['Locate missing individual', 'Assess the situation', 'Execute rescue plan', 'Ensure safe return']
    },
    mystery: {
        name: 'Mystery Investigation',
        emoji: '🔍',
        description: 'Solve puzzles and uncover secrets',
        objectives: ['Gather initial clues', 'Interview witnesses', 'Piece together evidence', 'Reveal the truth']
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('quest')
        .setDescription('📜 Accept and manage treasure hunting quests with enhanced mechanics'),
    
    async execute(interaction) {
        await interaction.deferReply();
        
        try {
            const userId = interaction.user.id;
            const userProfile = await db.getPlayer(userId) || {
                coins: 100,
                level: 1,
                experience: 0,
                activeQuests: [],
                completedQuests: [],
                questStats: {
                    totalCompleted: 0,
                    treasuresFound: 0,
                    locationsExplored: [],
                    reputation: 0,
                    titles: []
                }
            };

            // Initialize quest data if missing
            if (!userProfile.activeQuests) userProfile.activeQuests = [];
            if (!userProfile.questStats) {
                userProfile.questStats = {
                    totalCompleted: 0,
                    treasuresFound: 0,
                    locationsExplored: [],
                    reputation: 0,
                    titles: []
                };
            }

            await this.showQuestBoard(interaction, userProfile);

        } catch (error) {
            console.error('Error in quest command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while loading the quest board.',
                ephemeral: true
            });
        }
    },

    async showQuestBoard(interaction, userProfile) {
        const availableQuests = this.generateQuests(userProfile);
        const playerLevel = userProfile.level || 1;
        const reputation = userProfile.questStats.reputation || 0;
        const guildRank = this.calculateGuildRank(reputation);

        const embed = new EmbedBuilder()
            .setColor('#8A2BE2')
            .setTitle('📜 Treasure Hunter\'s Guild Quest Board')
            .setDescription('**Welcome, brave treasure hunter!** The guild has prepared exclusive assignments for skilled adventurers.')
            .setThumbnail('https://cdn.discordapp.com/emojis/742747860554686485.png')
            .addFields([
                { 
                    name: '🎯 Hunter Profile', 
                    value: `**Level:** ${playerLevel} ⭐\n**Reputation:** ${reputation} 🏆\n**Guild Rank:** ${guildRank} 🎖️\n**Title:** ${this.getPlayerTitle(userProfile)} 👑`, 
                    inline: true 
                },
                { 
                    name: '📊 Quest Progress', 
                    value: `**Active Quests:** ${userProfile.activeQuests.length}/3 📋\n**Completed:** ${userProfile.questStats.totalCompleted} ✅\n**Treasures Found:** ${userProfile.questStats.treasuresFound} 💎\n**Locations Mapped:** ${userProfile.questStats.locationsExplored.length} 🗺️`, 
                    inline: true 
                },
                {
                    name: '🎁 Available Rewards',
                    value: `**Coins:** Up to 5,000 💰\n**Experience:** Up to 2,500 XP 🌟\n**Rare Items:** Legendary Artifacts 🎁\n**Reputation:** Guild Standing 🏛️`,
                    inline: true
                }
            ]);

        // Add available quests
        if (availableQuests.length === 0) {
            embed.addFields({
                name: '🌙 No Quests Available',
                value: 'All current assignments are taken or you\'ve completed today\'s limit. Check back later or increase your reputation!',
                inline: false
            });
        } else {
            availableQuests.forEach((quest, index) => {
                const difficultyColor = this.getDifficultyColor(quest.difficulty);
                const typeData = questTypes[quest.type];
                
                embed.addFields({
                    name: `${typeData.emoji} ${quest.title}`,
                    value: `**Type:** ${typeData.name}\n**Location:** ${quest.location.emoji} ${quest.location.name}\n**Difficulty:** ${this.getDifficultyEmoji(quest.difficulty)} ${quest.difficulty}\n**Reward:** ${quest.reward.coins}💰 + ${quest.reward.exp}⭐\n**Duration:** ${quest.estimatedDuration}`,
                    inline: true
                });
            });
        }

        // Add quest type information
        embed.addFields({
            name: '🎮 Quest Types Available',
            value: Object.values(questTypes).map(type => 
                `${type.emoji} **${type.name}** - ${type.description}`
            ).join('\n'),
            inline: false
        });

        // Create quest selection menu
        const questSelect = new StringSelectMenuBuilder()
            .setCustomId('quest_select')
            .setPlaceholder('📋 Choose a quest to view details...')
            .addOptions(
                availableQuests.length > 0 ? availableQuests.map((quest, index) => ({
                    label: quest.title,
                    description: `${quest.difficulty} • ${quest.location.name} • ${quest.reward.coins} coins`,
                    value: `quest_${index}`,
                    emoji: questTypes[quest.type].emoji
                })) : [{ label: 'No quests available', value: 'none', description: 'Check back later' }]
            );

        const row1 = new ActionRowBuilder().addComponents(questSelect);

        const row2 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('quest_active')
                    .setLabel('Active Quests')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📋'),
                new ButtonBuilder()
                    .setCustomId('quest_history')
                    .setLabel('Quest History')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('📚'),
                new ButtonBuilder()
                    .setCustomId('quest_shop')
                    .setLabel('Guild Shop')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🛒'),
                new ButtonBuilder()
                    .setCustomId('quest_leaderboard')
                    .setLabel('Leaderboard')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏆')
            );

        const row3 = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('quest_tips')
                    .setLabel('Hunter Tips')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('💡'),
                new ButtonBuilder()
                    .setCustomId('quest_equipment')
                    .setLabel('Check Equipment')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('⚔️'),
                new ButtonBuilder()
                    .setCustomId('quest_guild_info')
                    .setLabel('Guild Information')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🏛️')
            );

        await interaction.editReply({ 
            embeds: [embed], 
            components: availableQuests.length > 0 ? [row1, row2, row3] : [row2, row3]
        });
    },

    generateQuests(userProfile) {
        const quests = [];
        const playerLevel = userProfile.level || 1;
        const reputation = userProfile.questStats.reputation || 0;
        
        // Generate different types of quests based on player level and reputation
        Object.entries(treasureLocations).forEach(([locationId, location]) => {
            if (playerLevel >= location.requiredLevel) {
                // Generate different quest types for each location
                Object.entries(questTypes).forEach(([typeId, type]) => {
                    const quest = this.createQuest(locationId, location, typeId, type, userProfile);
                    if (quest && this.shouldShowQuest(quest, userProfile)) {
                        quests.push(quest);
                    }
                });
            }
        });

        // Limit quests based on reputation and randomize
        const maxQuests = Math.min(6 + Math.floor(reputation / 100), 12);
        return quests.sort(() => 0.5 - Math.random()).slice(0, maxQuests);
    },

    createQuest(locationId, location, typeId, type, userProfile) {
        const difficulty = location.difficulty;
        const baseReward = location.baseReward;
        const multiplier = this.getDifficultyMultiplier(difficulty);
        
        // Create unique quest based on type and location
        const questTitles = {
            retrieval: [
                `Recover the Lost ${location.treasures[0]}`,
                `Secure the Legendary ${location.treasures[1]}`,
                `Retrieve the Ancient ${location.treasures[2]}`
            ],
            exploration: [
                `Chart the ${location.name}`,
                `Survey the Mysterious ${location.name}`,
                `Map the Uncharted ${location.name}`
            ],
            rescue: [
                `Rescue the Lost Explorer in ${location.name}`,
                `Save the Trapped Merchant at ${location.name}`,
                `Extract the Missing Scholar from ${location.name}`
            ],
            mystery: [
                `Uncover the Secret of ${location.name}`,
                `Solve the ${location.name} Mystery`,
                `Investigate Strange Events at ${location.name}`
            ]
        };

        const title = questTitles[typeId][Math.floor(Math.random() * questTitles[typeId].length)];
        
        return {
            id: `${typeId}_${locationId}_${Date.now()}`,
            title: title,
            type: typeId,
            location: location,
            difficulty: difficulty,
            description: this.generateQuestDescription(typeId, location),
            objectives: type.objectives,
            reward: {
                coins: Math.floor(baseReward.coins * multiplier),
                exp: Math.floor(baseReward.exp * multiplier),
                items: this.generateRewardItems(location, difficulty),
                reputation: Math.floor(50 * multiplier)
            },
            estimatedDuration: this.getEstimatedDuration(difficulty),
            requirements: {
                level: location.requiredLevel,
                equipment: this.getRecommendedEquipment(difficulty)
            }
        };
    },

    generateQuestDescription(type, location) {
        const descriptions = {
            retrieval: `Navigate through the ${location.name} and recover valuable treasures hidden within its depths.`,
            exploration: `Brave the unknown territories of ${location.name} and create a comprehensive map of the area.`,
            rescue: `A fellow adventurer has gone missing in ${location.name}. Find them and bring them home safely.`,
            mystery: `Strange occurrences have been reported at ${location.name}. Investigate and uncover the truth.`
        };
        
        return descriptions[type] + ` Be wary of ${location.hazards.join(', ').toLowerCase()}.`;
    },

    generateRewardItems(location, difficulty) {
        const itemPool = [...location.treasures];
        const numItems = difficulty === 'Legendary' ? 3 : difficulty === 'Very Hard' ? 2 : 1;
        
        return itemPool.sort(() => 0.5 - Math.random()).slice(0, numItems);
    },

    shouldShowQuest(quest, userProfile) {
        // Don't show if player already has similar active quest
        const hasActiveInLocation = userProfile.activeQuests.some(
            active => active.location === quest.location.name
        );
        
        // Don't show if recently completed
        const recentlyCompleted = userProfile.questStats.locationsExplored.includes(quest.location.name) &&
            Date.now() - userProfile.lastQuestTime < 3600000; // 1 hour cooldown
            
        return !hasActiveInLocation && !recentlyCompleted;
    },

    getDifficultyMultiplier(difficulty) {
        const multipliers = {
            'Easy': 1.0,
            'Medium': 1.5,
            'Hard': 2.0,
            'Very Hard': 2.5,
            'Legendary': 3.0
        };
        return multipliers[difficulty] || 1.0;
    },

    getDifficultyEmoji(difficulty) {
        const emojis = {
            'Easy': '🟢',
            'Medium': '🟡',
            'Hard': '🔴',
            'Very Hard': '🟣',
            'Legendary': '⚫'
        };
        return emojis[difficulty] || '⚪';
    },

    getDifficultyColor(difficulty) {
        const colors = {
            'Easy': '#00FF00',
            'Medium': '#FFFF00',
            'Hard': '#FF6600',
            'Very Hard': '#8B0000',
            'Legendary': '#4B0082'
        };
        return colors[difficulty] || '#808080';
    },

    getEstimatedDuration(difficulty) {
        const durations = {
            'Easy': '30-45 minutes',
            'Medium': '1-1.5 hours',
            'Hard': '1.5-2 hours',
            'Very Hard': '2-3 hours',
            'Legendary': '3-4 hours'
        };
        return durations[difficulty] || '1 hour';
    },

    getRecommendedEquipment(difficulty) {
        const equipment = {
            'Easy': ['Basic weapons', 'Leather armor'],
            'Medium': ['Steel weapons', 'Chain mail'],
            'Hard': ['Enchanted gear', 'Magical protection'],
            'Very Hard': ['Legendary equipment', 'Specialized tools'],
            'Legendary': ['Artifact weapons', 'Divine protection']
        };
        return equipment[difficulty] || ['Basic equipment'];
    },

    calculateGuildRank(reputation) {
        if (reputation >= 5000) return 'Grandmaster';
        if (reputation >= 2500) return 'Master Hunter';
        if (reputation >= 1000) return 'Expert Hunter';
        if (reputation >= 500) return 'Veteran Hunter';
        if (reputation >= 100) return 'Skilled Hunter';
        return 'Novice Hunter';
    },

    getPlayerTitle(userProfile) {
        const titles = userProfile.questStats.titles || [];
        if (titles.length === 0) return 'Aspiring Treasure Hunter';
        
        // Return the most prestigious title
        const prestigeTitles = [
            'Legendary Treasure Master',
            'Ancient Relic Seeker',
            'Dungeon Conqueror',
            'Treasure Hunter Supreme',
            'Guild Champion'
        ];
        
        for (const title of prestigeTitles) {
            if (titles.includes(title)) return title;
        }
        
        return titles[titles.length - 1];
    }
};
