const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guild')
        .setDescription('👥 Create or manage your adventurer guild!')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Choose guild action')
                .setRequired(false)
                .addChoices(
                    { name: '🏠 View My Guild', value: 'view' },
                    { name: '🆕 Create Guild', value: 'create' },
                    { name: '🔍 Search Guilds', value: 'search' },
                    { name: '📨 Join Request', value: 'join' },
                    { name: '👑 Manage Guild', value: 'manage' },
                    { name: '📊 Guild Stats', value: 'stats' }
                ))
        .addStringOption(option =>
            option.setName('guild')
                .setDescription('Guild name for specific actions')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('member')
                .setDescription('Member to manage (for leaders)')
                .setRequired(false)),
    
    async execute(interaction) {
        const action = interaction.options?.getString('action') || 'view';
        const guildName = interaction.options?.getString('guild');
        const memberName = interaction.options?.getString('member');
        const userId = interaction.user.id;
        
        switch (action) {
            case 'create':
                await this.createGuild(interaction, guildName);
                break;
            case 'search':
                await this.searchGuilds(interaction);
                break;
            case 'join':
                await this.joinGuild(interaction, guildName);
                break;
            case 'manage':
                await this.manageGuild(interaction);
                break;
            case 'stats':
                await this.showGuildStats(interaction);
                break;
            default:
                await this.viewGuild(interaction);
        }
    },
    
    async viewGuild(interaction) {
        const userId = interaction.user.id;
        const userData = await db.getUser(userId) || {};
        
        if (!userData.guild) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.info)
                .setTitle('👥 Guild System')
                .setDescription('**You\'re not in a guild yet!**\n\nGuilds are communities of adventurers who work together to achieve great things.')
                .addFields([
                    {
                        name: '🌟 Guild Benefits',
                        value: '• Shared guild treasury and resources\n• Group expeditions and raids\n• Guild chat and communication\n• Exclusive guild quests and rewards\n• Social rankings and competitions',
                        inline: true
                    },
                    {
                        name: '🏗️ Guild Features',
                        value: '• Create your own guild (1000 coins)\n• Join existing guilds\n• Guild leveling system\n• Member roles and permissions\n• Guild vs Guild competitions',
                        inline: true
                    },
                    {
                        name: '👑 Leadership Roles',
                        value: '• **Leader**: Full guild control\n• **Officer**: Moderate permissions\n• **Member**: Basic guild access\n• **Recruit**: Limited access',
                        inline: true
                    }
                ])
                .setFooter({ text: 'Use the buttons below to get started!' });
                
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('guild_search')
                        .setLabel('🔍 Find Guilds')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('guild_create')
                        .setLabel('🆕 Create Guild')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('guild_guide')
                        .setLabel('📖 Guild Guide')
                        .setStyle(ButtonStyle.Secondary)
                );
                
            return interaction.reply({ embeds: [embed], components: [buttons] });
        }
        
        // User is in a guild - show guild info
        const guildData = await this.getGuildData(userData.guild.id);
        
        if (!guildData) {
            return interaction.reply({
                content: '❌ Guild data not found! You may need to leave and rejoin a guild.',
                ephemeral: true
            });
        }
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.info)
            .setTitle(`🏛️ ${guildData.name}`)
            .setDescription(`**${guildData.description || 'A guild of brave adventurers'}**`)
            .setThumbnail(guildData.icon || 'https://cdn.discordapp.com/emojis/742747860554686485.png')
            .addFields([
                {
                    name: '📊 Guild Information',
                    value: `👑 Leader: **${guildData.leader.name}**\n📅 Founded: ${new Date(guildData.founded).toLocaleDateString()}\n⭐ Level: **${guildData.level || 1}**\n🏆 Rank: **#${guildData.rank || 'Unranked'}**`,
                    inline: true
                },
                {
                    name: '👥 Membership',
                    value: `👥 Members: **${guildData.members.length}/${guildData.maxMembers || 20}**\n🆕 Recruits: **${guildData.members.filter(m => m.role === 'recruit').length}**\n⚔️ Officers: **${guildData.members.filter(m => m.role === 'officer').length}**`,
                    inline: true
                },
                {
                    name: '💰 Guild Treasury',
                    value: `💰 Coins: **${guildData.treasury || 0}**\n📦 Items: **${guildData.items?.length || 0}**\n🎁 Weekly Contribution: **${guildData.weeklyContribution || 0}**`,
                    inline: true
                },
                {
                    name: '🎯 Your Role',
                    value: `📋 Position: **${userData.guild.role.toUpperCase()}**\n🤝 Joined: ${new Date(userData.guild.joinDate).toLocaleDateString()}\n🎁 Contributions: **${userData.guild.totalContributions || 0}** coins`,
                    inline: true
                },
                {
                    name: '🏆 Guild Achievements',
                    value: `🗺️ Group Hunts: **${guildData.stats?.groupHunts || 0}**\n⚔️ Raids Completed: **${guildData.stats?.raidsCompleted || 0}**\n🏰 Dungeons Cleared: **${guildData.stats?.dungeonsCleared || 0}**`,
                    inline: true
                },
                {
                    name: '📈 Activity Level',
                    value: `📊 Activity: **${this.getActivityLevel(guildData)}**\n🔥 Weekly Score: **${guildData.weeklyScore || 0}**\n📅 Last Active: ${guildData.lastActivity ? new Date(guildData.lastActivity).toLocaleDateString() : 'Unknown'}`,
                    inline: true
                }
            ]);
            
        // Add recent members list
        const activeMembers = guildData.members
            .filter(member => member.lastActive > Date.now() - 7 * 24 * 60 * 60 * 1000)
            .slice(0, 8)
            .map(member => `${this.getRoleEmoji(member.role)} ${member.name}`)
            .join('\n');
            
        if (activeMembers) {
            embed.addFields([
                { name: '👥 Active Members (Last 7 days)', value: activeMembers, inline: false }
            ]);
        }
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('guild_members')
                    .setLabel('👥 View All Members')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('guild_activities')
                    .setLabel('🎯 Guild Activities')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('guild_contribute')
                    .setLabel('💰 Contribute')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('guild_chat')
                    .setLabel('💬 Guild Chat')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        // Add management button for officers and leaders
        if (['leader', 'officer'].includes(userData.guild.role)) {
            const manageButton = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('guild_manage')
                        .setLabel('⚙️ Manage Guild')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('guild_promote')
                        .setLabel('📈 Promote Members')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('guild_kick')
                        .setLabel('👋 Manage Members')
                        .setStyle(ButtonStyle.Secondary)
                );
            
            await interaction.reply({ embeds: [embed], components: [buttons, manageButton] });
        } else {
            await interaction.reply({ embeds: [embed], components: [buttons] });
        }
    },
    
    async createGuild(interaction, guildName) {
        const userId = interaction.user.id;
        const userData = await db.getUser(userId) || { inventory: { coins: 0 } };
        
        // Check if user is already in a guild
        if (userData.guild) {
            return interaction.reply({
                content: '❌ You\'re already in a guild! Leave your current guild first.',
                ephemeral: true
            });
        }
        
        const creationCost = 1000;
        if ((userData.inventory.coins || 0) < creationCost) {
            return interaction.reply({
                content: `❌ You need ${creationCost} coins to create a guild! You have ${userData.inventory.coins || 0} coins.`,
                ephemeral: true
            });
        }
        
        if (!guildName) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.info)
                .setTitle('🆕 Create Your Guild')
                .setDescription('**Start your own adventuring guild!**')
                .addFields([
                    {
                        name: '💰 Creation Cost',
                        value: `${creationCost} coins`,
                        inline: true
                    },
                    {
                        name: '💳 Your Balance',
                        value: `${userData.inventory.coins || 0} coins`,
                        inline: true
                    },
                    {
                        name: '📋 Requirements',
                        value: '• Unique guild name (3-30 characters)\n• Guild description\n• Initial treasury deposit',
                        inline: false
                    }
                ])
                .setFooter({ text: 'Use /guild create <name> to start!' });
                
            return interaction.reply({ embeds: [embed] });
        }
        
        // Validate guild name
        if (guildName.length < 3 || guildName.length > 30) {
            return interaction.reply({
                content: '❌ Guild name must be between 3 and 30 characters!',
                ephemeral: true
            });
        }
        
        // Check if guild name is taken
        const existingGuild = await this.findGuildByName(guildName);
        if (existingGuild) {
            return interaction.reply({
                content: '❌ A guild with that name already exists! Choose a different name.',
                ephemeral: true
            });
        }
        
        // Create the guild
        const guildId = this.generateGuildId();
        const newGuild = {
            id: guildId,
            name: guildName,
            description: `${guildName} - A guild of brave adventurers`,
            leader: {
                id: userId,
                name: interaction.user.displayName
            },
            members: [{
                id: userId,
                name: interaction.user.displayName,
                role: 'leader',
                joinDate: Date.now(),
                lastActive: Date.now(),
                contributions: 0
            }],
            founded: Date.now(),
            level: 1,
            treasury: 0,
            maxMembers: 10,
            isPublic: true,
            stats: {
                groupHunts: 0,
                raidsCompleted: 0,
                dungeonsCleared: 0
            }
        };
        
        // Deduct creation cost and add guild to user
        userData.inventory.coins -= creationCost;
        userData.guild = {
            id: guildId,
            role: 'leader',
            joinDate: Date.now(),
            totalContributions: 0
        };
        
        await db.setUser(userId, userData);
        await this.saveGuildData(guildId, newGuild);
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.success)
            .setTitle('🎉 Guild Created Successfully!')
            .setDescription(`**${guildName}** has been founded!`)
            .addFields([
                { name: '🏛️ Guild Name', value: guildName, inline: true },
                { name: '👑 Leader', value: interaction.user.displayName, inline: true },
                { name: '💰 Cost', value: `${creationCost} coins`, inline: true },
                { name: '📈 Next Steps', value: '• Invite members to join\n• Set guild description\n• Start group activities\n• Build your treasury', inline: false }
            ])
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp();
            
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('guild_invite')
                    .setLabel('📨 Invite Members')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('guild_settings')
                    .setLabel('⚙️ Guild Settings')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('guild_view')
                    .setLabel('🏠 View Guild')
                    .setStyle(ButtonStyle.Success)
            );
            
        await interaction.reply({ embeds: [embed], components: [buttons] });
    },
    
    async searchGuilds(interaction) {
        const guilds = await this.getAllPublicGuilds();
        
        if (guilds.length === 0) {
            return interaction.reply({
                content: '❌ No public guilds found! Be the first to create one.',
                ephemeral: true
            });
        }
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.info)
            .setTitle('🔍 Available Guilds')
            .setDescription(`**${guilds.length} public guilds recruiting members**`)
            .setThumbnail('https://cdn.discordapp.com/emojis/742747860554686485.png');
            
        guilds.slice(0, 10).forEach((guild, index) => {
            const memberCount = guild.members.length;
            const maxMembers = guild.maxMembers || 20;
            const activityLevel = this.getActivityLevel(guild);
            
            embed.addFields([{
                name: `${index + 1}. 🏛️ ${guild.name}`,
                value: `👑 Leader: **${guild.leader.name}**\n` +
                       `👥 Members: **${memberCount}/${maxMembers}**\n` +
                       `⭐ Level: **${guild.level || 1}**\n` +
                       `📊 Activity: **${activityLevel}**\n` +
                       `📝 ${guild.description || 'No description'}`,
                inline: true
            }]);
        });
        
        const guildSelect = new StringSelectMenuBuilder()
            .setCustomId('guild_join_select')
            .setPlaceholder('🏛️ Select a guild to join...')
            .addOptions(
                guilds.slice(0, 25).map((guild, index) => ({
                    label: guild.name,
                    description: `${guild.members.length}/${guild.maxMembers} members • Level ${guild.level || 1}`,
                    value: `join_${guild.id}`,
                    emoji: '🏛️'
                }))
            );
            
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('guild_create')
                    .setLabel('🆕 Create Own Guild')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('guild_refresh')
                    .setLabel('🔄 Refresh List')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        const components = [
            new ActionRowBuilder().addComponents(guildSelect),
            buttons
        ];
        
        await interaction.reply({ embeds: [embed], components });
    },
    
    // Helper methods
    async getGuildData(guildId) {
        // Simulate guild data retrieval
        const guildData = await db.getGuild(guildId);
        return guildData;
    },
    
    async saveGuildData(guildId, guildData) {
        await db.setGuild(guildId, guildData);
    },
    
    async findGuildByName(name) {
        const guilds = await db.getAllGuilds() || [];
        return guilds.find(guild => guild.name.toLowerCase() === name.toLowerCase());
    },
    
    async getAllPublicGuilds() {
        const guilds = await db.getAllGuilds() || [];
        return guilds.filter(guild => guild.isPublic);
    },
    
    generateGuildId() {
        return Date.now().toString(36) + Math.random().toString(36).substr(2);
    },
    
    getActivityLevel(guild) {
        const activeMembers = guild.members.filter(member => 
            member.lastActive > Date.now() - 7 * 24 * 60 * 60 * 1000
        ).length;
        const totalMembers = guild.members.length;
        const activityRatio = activeMembers / totalMembers;
        
        if (activityRatio >= 0.8) return 'Very High';
        if (activityRatio >= 0.6) return 'High';
        if (activityRatio >= 0.4) return 'Medium';
        if (activityRatio >= 0.2) return 'Low';
        return 'Very Low';
    },
    
    getRoleEmoji(role) {
        const emojis = {
            leader: '👑',
            officer: '⚔️',
            member: '👤',
            recruit: '🆕'
        };
        return emojis[role] || '👤';
    }
};