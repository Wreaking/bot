
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

// Mount types with detailed stats and abilities
const MOUNT_TYPES = {
    horse: {
        name: 'Loyal Horse',
        emoji: '🐎',
        baseSpeed: 15,
        baseStamina: 100,
        baseDefense: 5,
        abilities: ['Fast Travel', 'Carry Cargo'],
        cost: 500,
        upkeep: 10,
        description: 'A reliable companion for any adventure'
    },
    pegasus: {
        name: 'Winged Pegasus',
        emoji: '🦄',
        baseSpeed: 25,
        baseStamina: 80,
        baseDefense: 12,
        abilities: ['Flight', 'Fast Travel', 'Sky Combat'],
        cost: 2500,
        upkeep: 25,
        description: 'Soar through the skies with magical wings'
    },
    dragon: {
        name: 'Ancient Dragon',
        emoji: '🐉',
        baseSpeed: 35,
        baseStamina: 150,
        baseDefense: 30,
        abilities: ['Flight', 'Breath Weapon', 'Intimidation', 'Treasure Sense'],
        cost: 10000,
        upkeep: 50,
        description: 'The ultimate mount for legendary adventurers'
    },
    unicorn: {
        name: 'Mystical Unicorn',
        emoji: '🦄',
        baseSpeed: 20,
        baseStamina: 90,
        baseDefense: 15,
        abilities: ['Healing Aura', 'Magic Detection', 'Purify'],
        cost: 3500,
        upkeep: 30,
        description: 'A pure creature with healing powers'
    },
    griffon: {
        name: 'Royal Griffon',
        emoji: '🦅',
        baseSpeed: 28,
        baseStamina: 110,
        baseDefense: 20,
        abilities: ['Flight', 'Aerial Combat', 'Scout'],
        cost: 4000,
        upkeep: 35,
        description: 'Noble creature of sky and earth'
    },
    wolf: {
        name: 'Shadow Wolf',
        emoji: '🐺',
        baseSpeed: 18,
        baseStamina: 120,
        baseDefense: 10,
        abilities: ['Stealth', 'Pack Hunting', 'Night Vision'],
        cost: 800,
        upkeep: 15,
        description: 'Swift and stealthy forest companion'
    }
};

const FOOD_TYPES = {
    hay: { name: '🌾 Hay', cost: 5, happiness: 2, stamina: 10, description: 'Basic feed for herbivores' },
    carrots: { name: '🥕 Carrots', cost: 8, happiness: 5, stamina: 15, description: 'Sweet treats that boost morale' },
    apples: { name: '🍎 Apples', cost: 12, happiness: 8, stamina: 20, description: 'Nutritious fruit for health' },
    magic: { name: '✨ Magic Feed', cost: 50, happiness: 20, stamina: 50, description: 'Enchanted food with special properties' },
    oats: { name: '🌾 Premium Oats', cost: 15, happiness: 6, stamina: 25, description: 'High-quality grain for energy' },
    meat: { name: '🥩 Fresh Meat', cost: 20, happiness: 10, stamina: 30, description: 'For carnivorous companions' }
};

const TRAINING_SKILLS = {
    speed: { name: '🏃 Speed Training', cost: 100, description: 'Improve movement speed and agility' },
    stamina: { name: '💪 Stamina Training', cost: 80, description: 'Increase endurance and staying power' },
    defense: { name: '🛡️ Defense Training', cost: 120, description: 'Enhance protective abilities' },
    agility: { name: '🎯 Agility Training', cost: 90, description: 'Boost reflexes and maneuverability' },
    combat: { name: '⚔️ Combat Training', cost: 150, description: 'Teach battle techniques and tactics' },
    magic: { name: '🔮 Magic Training', cost: 200, description: 'Unlock mystical abilities' }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('mount')
        .setDescription('🐎 Manage and use your mounts for faster travel')
        .addSubcommand(subcommand =>
            subcommand
                .setName('stable')
                .setDescription('View your mount stable and collection'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('summon')
                .setDescription('Summon your mount')
                .addStringOption(option =>
                    option.setName('mount')
                        .setDescription('Which mount to summon')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('feed')
                .setDescription('Feed your mount to maintain its happiness')
                .addStringOption(option =>
                    option.setName('food')
                        .setDescription('Type of food')
                        .setRequired(true)
                        .addChoices(
                            ...Object.entries(FOOD_TYPES).map(([key, food]) => ({
                                name: `${food.name} (${food.cost} coins)`,
                                value: key
                            }))
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('train')
                .setDescription('Train your mount to improve its stats')
                .addStringOption(option =>
                    option.setName('skill')
                        .setDescription('Skill to train')
                        .setRequired(true)
                        .addChoices(
                            ...Object.entries(TRAINING_SKILLS).map(([key, skill]) => ({
                                name: `${skill.name} (${skill.cost} coins)`,
                                value: key
                            }))
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('shop')
                .setDescription('Browse and purchase new mounts'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('race')
                .setDescription('Enter your mount in a race competition')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();
        const userId = interaction.user.id;

        try {
            switch (subcommand) {
                case 'stable':
                    await this.handleStable(interaction, userId);
                    break;
                case 'summon':
                    await this.handleSummon(interaction, userId);
                    break;
                case 'feed':
                    await this.handleFeed(interaction, userId);
                    break;
                case 'train':
                    await this.handleTrain(interaction, userId);
                    break;
                case 'shop':
                    await this.handleShop(interaction, userId);
                    break;
                case 'race':
                    await this.handleRace(interaction, userId);
                    break;
            }
        } catch (error) {
            console.error('Mount command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while managing your mounts.',
                ephemeral: true
            });
        }
    },

    async handleStable(interaction, userId) {
        const userData = await db.getPlayer(userId) || { mounts: [], activeMounts: null };
        const userMounts = userData.mounts || [];

        if (userMounts.length === 0) {
            return await interaction.reply({
                content: '🏚️ Your stable is empty! Use `/mount shop` to purchase your first mount.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('🏰 Your Mount Stable')
            .setDescription(`**${userMounts.length} mount(s) in your collection**`)
            .setThumbnail(interaction.user.displayAvatarURL());

        userMounts.forEach((mount, index) => {
            const mountType = MOUNT_TYPES[mount.type];
            const isActive = userData.activeMount === mount.id;
            const happiness = this.getHappinessEmoji(mount.happiness || 50);
            const condition = this.getConditionStatus(mount);

            embed.addFields({
                name: `${mountType.emoji} **${mount.name || mountType.name}** ${isActive ? '🟢 *Active*' : ''}`,
                value: `**Level:** ${mount.level || 1} | **Happiness:** ${happiness} (${mount.happiness || 50}%)\n` +
                       `**Speed:** ${this.calculateStat(mountType.baseSpeed, mount.level, mount.training?.speed)} | ` +
                       `**Stamina:** ${mount.stamina || mountType.baseStamina}/${this.calculateStat(mountType.baseStamina, mount.level, mount.training?.stamina)}\n` +
                       `**Condition:** ${condition} | **Experience:** ${mount.experience || 0}/100\n` +
                       `**Abilities:** ${mountType.abilities.slice(0, 3).join(', ')}`,
                inline: index % 2 === 0
            });
        });

        const stableButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mount_care_all')
                    .setLabel('🧼 Care for All')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('mount_training_schedule')
                    .setLabel('📅 Training Schedule')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('mount_breeding')
                    .setLabel('💕 Breeding Program')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('mount_competitions')
                    .setLabel('🏆 Competitions')
                    .setStyle(ButtonStyle.Danger)
            );

        const mountSelect = new StringSelectMenuBuilder()
            .setCustomId('mount_select_manage')
            .setPlaceholder('🐎 Select a mount to manage...')
            .addOptions(
                userMounts.map((mount, index) => {
                    const mountType = MOUNT_TYPES[mount.type];
                    return {
                        label: mount.name || mountType.name,
                        description: `Level ${mount.level || 1} ${mountType.name} - Happiness: ${mount.happiness || 50}%`,
                        value: `mount_${mount.id || index}`,
                        emoji: mountType.emoji
                    };
                })
            );

        const components = [
            new ActionRowBuilder().addComponents(mountSelect),
            stableButtons
        ];

        await interaction.reply({ embeds: [embed], components });
    },

    async handleSummon(interaction, userId) {
        const mountName = interaction.options.getString('mount');
        const userData = await db.getPlayer(userId) || { mounts: [] };
        
        const mount = userData.mounts?.find(m => 
            (m.name && m.name.toLowerCase().includes(mountName.toLowerCase())) ||
            MOUNT_TYPES[m.type]?.name.toLowerCase().includes(mountName.toLowerCase())
        );

        if (!mount) {
            return await interaction.reply({
                content: '❌ Mount not found in your stable! Use `/mount stable` to see available mounts.',
                ephemeral: true
            });
        }

        const mountType = MOUNT_TYPES[mount.type];
        
        if (mount.stamina <= 0) {
            return await interaction.reply({
                content: `❌ ${mount.name || mountType.name} is too tired to be summoned! Let it rest or feed it.`,
                ephemeral: true
            });
        }

        if (mount.happiness < 30) {
            return await interaction.reply({
                content: `❌ ${mount.name || mountType.name} is too unhappy to respond! Try feeding or caring for it first.`,
                ephemeral: true
            });
        }

        // Set as active mount
        await db.updatePlayer(userId, { activeMount: mount.id });

        const embed = new EmbedBuilder()
            .setColor('#32CD32')
            .setTitle(`${mountType.emoji} Mount Summoned!`)
            .setDescription(`**${mount.name || mountType.name}** appears beside you, ready for adventure!`)
            .addFields(
                { name: '⚡ Speed Bonus', value: `+${this.calculateStat(mountType.baseSpeed, mount.level, mount.training?.speed)}%`, inline: true },
                { name: '🛡️ Defense Bonus', value: `+${this.calculateStat(mountType.baseDefense, mount.level, mount.training?.defense)}`, inline: true },
                { name: '🔋 Current Stamina', value: `${mount.stamina}/${this.calculateStat(mountType.baseStamina, mount.level, mount.training?.stamina)}`, inline: true },
                { name: '🌟 Special Abilities', value: mountType.abilities.map(ability => `• ${ability}`).join('\n'), inline: false }
            )
            .setThumbnail(interaction.user.displayAvatarURL())
            .setFooter({ text: 'Your mount will assist you in travels and battles!' });

        const actionButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mount_travel_fast')
                    .setLabel('🚀 Fast Travel')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('mount_dismiss')
                    .setLabel('👋 Dismiss')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('mount_abilities')
                    .setLabel('⭐ Use Abilities')
                    .setStyle(ButtonStyle.Success)
            );

        await interaction.reply({ embeds: [embed], components: [actionButtons] });
    },

    async handleFeed(interaction, userId) {
        const foodType = interaction.options.getString('food');
        const userData = await db.getPlayer(userId) || { mounts: [], coins: 0 };
        
        if (!userData.activeMount) {
            return await interaction.reply({
                content: '❌ You need to summon a mount first! Use `/mount summon <mount_name>`.',
                ephemeral: true
            });
        }

        const food = FOOD_TYPES[foodType];
        if (userData.coins < food.cost) {
            return await interaction.reply({
                content: `❌ You need ${food.cost} coins to buy ${food.name}! (You have ${userData.coins})`,
                ephemeral: true
            });
        }

        const mount = userData.mounts.find(m => m.id === userData.activeMount);
        const mountType = MOUNT_TYPES[mount.type];

        // Apply feeding effects
        mount.happiness = Math.min(100, (mount.happiness || 50) + food.happiness);
        mount.stamina = Math.min(
            this.calculateStat(mountType.baseStamina, mount.level, mount.training?.stamina),
            (mount.stamina || mountType.baseStamina) + food.stamina
        );

        userData.coins -= food.cost;
        await db.updatePlayer(userId, userData);

        const embed = new EmbedBuilder()
            .setColor('#90EE90')
            .setTitle(`${food.name} Fed to ${mount.name || mountType.name}!`)
            .setDescription(`${mountType.emoji} *${mount.name || mountType.name} eagerly consumes the ${food.name.toLowerCase()}*`)
            .addFields(
                { name: '😊 Happiness', value: `${mount.happiness}% (+${food.happiness})`, inline: true },
                { name: '🔋 Stamina', value: `${mount.stamina}/${this.calculateStat(mountType.baseStamina, mount.level, mount.training?.stamina)} (+${food.stamina})`, inline: true },
                { name: '💰 Cost', value: `${food.cost} coins`, inline: true },
                { name: '📝 Effect', value: food.description, inline: false }
            )
            .setFooter({ text: `Remaining coins: ${userData.coins}` });

        await interaction.reply({ embeds: [embed] });
    },

    async handleTrain(interaction, userId) {
        const skillType = interaction.options.getString('skill');
        const userData = await db.getPlayer(userId) || { mounts: [], coins: 0 };
        
        if (!userData.activeMount) {
            return await interaction.reply({
                content: '❌ You need to summon a mount first! Use `/mount summon <mount_name>`.',
                ephemeral: true
            });
        }

        const skill = TRAINING_SKILLS[skillType];
        if (userData.coins < skill.cost) {
            return await interaction.reply({
                content: `❌ You need ${skill.cost} coins for ${skill.name}! (You have ${userData.coins})`,
                ephemeral: true
            });
        }

        const mount = userData.mounts.find(m => m.id === userData.activeMount);
        const mountType = MOUNT_TYPES[mount.type];

        // Initialize training if it doesn't exist
        if (!mount.training) mount.training = {};
        
        // Apply training
        mount.training[skillType] = (mount.training[skillType] || 0) + 1;
        mount.experience = (mount.experience || 0) + 25;
        
        // Check for level up
        let leveledUp = false;
        while (mount.experience >= 100) {
            mount.level = (mount.level || 1) + 1;
            mount.experience -= 100;
            leveledUp = true;
        }

        userData.coins -= skill.cost;
        await db.updatePlayer(userId, userData);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle(`${skill.name} Complete!`)
            .setDescription(`${mountType.emoji} **${mount.name || mountType.name}** has completed training!`)
            .addFields(
                { name: '📈 Skill Level', value: `${skillType.charAt(0).toUpperCase() + skillType.slice(1)}: ${mount.training[skillType]}`, inline: true },
                { name: '⭐ Experience', value: `${mount.experience}/100 (+25)`, inline: true },
                { name: '💰 Cost', value: `${skill.cost} coins`, inline: true }
            );

        if (leveledUp) {
            embed.addFields({ 
                name: '🎉 Level Up!', 
                value: `${mount.name || mountType.name} reached level ${mount.level}!`, 
                inline: false 
            });
            embed.setColor('#FF6347');
        }

        embed.setFooter({ text: `${skill.description} | Remaining coins: ${userData.coins}` });

        await interaction.reply({ embeds: [embed] });
    },

    async handleShop(interaction, userId) {
        const userData = await db.getPlayer(userId) || { coins: 0, mounts: [] };
        const userMountTypes = userData.mounts?.map(m => m.type) || [];

        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('🏪 Mount Emporium')
            .setDescription('**Discover incredible companions for your adventures!**')
            .addFields({ 
                name: '💰 Your Balance', 
                value: `${userData.coins.toLocaleString()} coins`, 
                inline: true 
            });

        Object.entries(MOUNT_TYPES).forEach(([key, mount]) => {
            const owned = userMountTypes.includes(key);
            const status = owned ? '✅ **OWNED**' : userData.coins >= mount.cost ? '💰 **Available**' : '❌ *Too Expensive*';
            
            embed.addFields({
                name: `${mount.emoji} **${mount.name}** ${owned ? '(Owned)' : ''}`,
                value: `💰 **Price:** ${mount.cost.toLocaleString()} coins\n` +
                       `📊 **Stats:** Speed ${mount.baseSpeed} | Defense ${mount.baseDefense} | Stamina ${mount.baseStamina}\n` +
                       `⚡ **Abilities:** ${mount.abilities.slice(0, 2).join(', ')}\n` +
                       `💡 **Upkeep:** ${mount.upkeep} coins/day\n` +
                       `${status}\n*${mount.description}*`,
                inline: true
            });
        });

        const purchaseSelect = new StringSelectMenuBuilder()
            .setCustomId('mount_purchase_select')
            .setPlaceholder('🛒 Select a mount to purchase...')
            .addOptions(
                Object.entries(MOUNT_TYPES)
                    .filter(([key, mount]) => !userMountTypes.includes(key) && userData.coins >= mount.cost)
                    .map(([key, mount]) => ({
                        label: `${mount.name} - ${mount.cost.toLocaleString()} coins`,
                        description: mount.description,
                        value: `purchase_${key}`,
                        emoji: mount.emoji
                    }))
            );

        const shopButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('mount_shop_refresh')
                    .setLabel('🔄 Refresh Shop')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('mount_compare')
                    .setLabel('📊 Compare Mounts')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('mount_financing')
                    .setLabel('💳 Financing Options')
                    .setStyle(ButtonStyle.Success)
            );

        const components = [];
        if (purchaseSelect.options.length > 0) {
            components.push(new ActionRowBuilder().addComponents(purchaseSelect));
        }
        components.push(shopButtons);

        await interaction.reply({ embeds: [embed], components });
    },

    async handleRace(interaction, userId) {
        const userData = await db.getPlayer(userId) || { mounts: [], activeMount: null };
        
        if (!userData.activeMount) {
            return await interaction.reply({
                content: '❌ You need an active mount to race! Use `/mount summon <mount_name>` first.',
                ephemeral: true
            });
        }

        const mount = userData.mounts.find(m => m.id === userData.activeMount);
        const mountType = MOUNT_TYPES[mount.type];

        // Simulate race
        const raceEntry = 50; // Entry fee
        if (userData.coins < raceEntry) {
            return await interaction.reply({
                content: `❌ Race entry costs ${raceEntry} coins! (You have ${userData.coins})`,
                ephemeral: true
            });
        }

        const speed = this.calculateStat(mountType.baseSpeed, mount.level, mount.training?.speed);
        const raceResult = Math.random() * 100 + speed;
        const placement = raceResult > 120 ? 1 : raceResult > 100 ? 2 : raceResult > 80 ? 3 : 4;
        
        const prizes = { 1: 500, 2: 200, 3: 100, 4: 25 };
        const prize = prizes[placement];
        
        userData.coins = userData.coins - raceEntry + prize;
        mount.experience = (mount.experience || 0) + (placement === 1 ? 50 : placement === 2 ? 30 : 20);

        await db.updatePlayer(userId, userData);

        const embed = new EmbedBuilder()
            .setColor(placement === 1 ? '#FFD700' : placement === 2 ? '#C0C0C0' : placement === 3 ? '#CD7F32' : '#808080')
            .setTitle(`🏁 Mount Race Results!`)
            .setDescription(`**${mount.name || mountType.name}** participated in the Grand Prix!`)
            .addFields(
                { name: '🏆 Final Position', value: `${placement}${['st', 'nd', 'rd', 'th'][placement - 1]} Place`, inline: true },
                { name: '💰 Prize Money', value: `${prize} coins`, inline: true },
                { name: '⭐ Experience Gained', value: `+${placement === 1 ? 50 : placement === 2 ? 30 : 20} XP`, inline: true },
                { name: '🎯 Race Score', value: `${Math.floor(raceResult)}/200`, inline: false }
            )
            .setFooter({ text: `Entry fee: ${raceEntry} coins | Net result: ${prize - raceEntry > 0 ? '+' : ''}${prize - raceEntry} coins` });

        if (placement === 1) {
            embed.addFields({ name: '🎉 Victory!', value: 'Your mount dominated the track!', inline: false });
        }

        await interaction.reply({ embeds: [embed] });
    },

    // Helper methods
    calculateStat(baseStat, level = 1, training = 0) {
        return Math.floor(baseStat + (level - 1) * (baseStat * 0.1) + (training || 0) * (baseStat * 0.05));
    },

    getHappinessEmoji(happiness) {
        if (happiness >= 90) return '😍';
        if (happiness >= 70) return '😊';
        if (happiness >= 50) return '😐';
        if (happiness >= 30) return '😕';
        return '😢';
    },

    getConditionStatus(mount) {
        const condition = mount.stamina / MOUNT_TYPES[mount.type].baseStamina;
        if (condition >= 0.8) return '💚 Excellent';
        if (condition >= 0.6) return '💛 Good';
        if (condition >= 0.4) return '🧡 Fair';
        if (condition >= 0.2) return '❤️ Poor';
        return '💔 Exhausted';
    }
};
