
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('guild')
        .setDescription('🏰 Manage your treasure hunter guild!')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new guild')
                .addStringOption(option =>
                    option.setName('name')
                        .setDescription('Guild name')
                        .setRequired(true)
                        .setMaxLength(50))
                .addStringOption(option =>
                    option.setName('description')
                        .setDescription('Guild description')
                        .setRequired(false)
                        .setMaxLength(200)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('View guild information')
                .addStringOption(option =>
                    option.setName('guild')
                        .setDescription('Guild to view (leave empty for your guild)')
                        .setRequired(false)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('join')
                .setDescription('Join a guild')
                .addStringOption(option =>
                    option.setName('guild')
                        .setDescription('Guild name or ID')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leave')
                .setDescription('Leave your current guild'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('manage')
                .setDescription('Manage guild settings (officers only)'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List all guilds on this server')),

    async execute(interaction) {
        const subcommand = interaction.options.getSubcommand();

        try {
            switch (subcommand) {
                case 'create':
                    await this.handleCreate(interaction);
                    break;
                case 'info':
                    await this.handleInfo(interaction);
                    break;
                case 'join':
                    await this.handleJoin(interaction);
                    break;
                case 'leave':
                    await this.handleLeave(interaction);
                    break;
                case 'manage':
                    await this.handleManage(interaction);
                    break;
                case 'list':
                    await this.handleList(interaction);
                    break;
            }
        } catch (error) {
            console.error('Guild command error:', error);
            await interaction.reply({
                content: '❌ An error occurred while processing your guild request.',
                ephemeral: true
            });
        }
    },

    async handleCreate(interaction) {
        const guildName = interaction.options.getString('name');
        const description = interaction.options.getString('description') || 'A new treasure hunting guild';
        
        const userData = await db.getPlayer(interaction.user.id);
        if (userData?.guild) {
            return await interaction.reply({
                content: '❌ You\'re already in a guild! Leave your current guild first.',
                ephemeral: true
            });
        }

        const creationCost = 10000;
        if ((userData?.coins || 0) < creationCost) {
            return await interaction.reply({
                content: `❌ You need ${creationCost.toLocaleString()} coins to create a guild! (You have ${(userData?.coins || 0).toLocaleString()})`,
                ephemeral: true
            });
        }

        // Check if guild name already exists
        const existingGuild = await db.getGuildByName(guildName);
        if (existingGuild) {
            return await interaction.reply({
                content: `❌ A guild with the name "${guildName}" already exists! Choose a different name.`,
                ephemeral: true
            });
        }

        // Create guild
        const guild = {
            id: `guild_${Date.now()}_${interaction.user.id}`,
            name: guildName,
            description,
            owner: interaction.user.id,
            members: [interaction.user.id],
            officers: [interaction.user.id],
            level: 1,
            experience: 0,
            treasury: 0,
            created: Date.now(),
            settings: {
                joinRequests: true,
                publicProfile: true,
                autoAccept: false
            },
            perks: [],
            activities: [{
                type: 'creation',
                description: `Guild created by ${interaction.user.displayName}`,
                timestamp: Date.now()
            }]
        };

        // Save guild and update user
        try {
            await db.createGuild(guild);
            await db.updatePlayer(interaction.user.id, {
                coins: userData.coins - creationCost,
                guild: guild.id,
                guildRole: 'owner'
            });
        } catch (error) {
            console.error('Error creating guild:', error);
            return await interaction.reply({
                content: '❌ Failed to create guild. Please try again later.',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.success || '#00FF00')
            .setTitle('🏰 Guild Created Successfully!')
            .setDescription(`**${guildName}** has been established!`)
            .addFields([
                { name: '👑 Guild Master', value: `<@${interaction.user.id}>`, inline: true },
                { name: '📝 Description', value: description, inline: true },
                { name: '💰 Treasury', value: '0 coins', inline: true },
                { name: '👥 Members', value: '1/50', inline: true },
                { name: '⭐ Level', value: '1', inline: true },
                { name: '🎯 Next Goal', value: 'Recruit 5 members', inline: true }
            ])
            .setFooter({ text: 'Use /guild manage to configure your guild settings' })
            .setTimestamp();

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('guild_manage')
                    .setLabel('⚙️ Manage Guild')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('guild_invite')
                    .setLabel('📨 Invite Members')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('guild_info')
                    .setLabel('ℹ️ Guild Info')
                    .setStyle(ButtonStyle.Secondary)
            );

        await interaction.reply({
            embeds: [embed],
            components: [buttons]
        });
    },

    async handleInfo(interaction) {
        const guildName = interaction.options.getString('guild');
        
        let guildData;
        if (guildName) {
            guildData = await db.getGuildByName(guildName);
        } else {
            const userData = await db.getPlayer(interaction.user.id);
            if (!userData?.guild) {
                return await interaction.reply({
                    content: '❌ You\'re not in a guild! Use `/guild list` to find guilds to join.',
                    ephemeral: true
                });
            }
            guildData = await db.getGuild(userData.guild);
        }

        if (!guildData) {
            return await interaction.reply({
                content: '❌ Guild not found!',
                ephemeral: true
            });
        }

        const members = await Promise.all(
            guildData.members.slice(0, 10).map(async id => {
                try {
                    const user = await interaction.client.users.fetch(id);
                    const memberData = await db.getPlayer(id);
                    return {
                        user,
                        role: guildData.officers.includes(id) ? (id === guildData.owner ? 'Owner' : 'Officer') : 'Member',
                        level: memberData?.level || 1
                    };
                } catch {
                    return null;
                }
            })
        );

        const validMembers = members.filter(m => m !== null);

        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.guild || '#8B008B')
            .setTitle(`🏰 ${guildData.name}`)
            .setDescription(guildData.description)
            .addFields([
                {
                    name: '📊 Guild Statistics',
                    value: `**Level:** ${guildData.level}\n**Experience:** ${guildData.experience}\n**Members:** ${guildData.members.length}/50\n**Treasury:** ${guildData.treasury.toLocaleString()} coins`,
                    inline: true
                },
                {
                    name: '👑 Leadership',
                    value: `**Owner:** <@${guildData.owner}>\n**Officers:** ${guildData.officers.length}\n**Created:** ${new Date(guildData.created).toLocaleDateString()}`,
                    inline: true
                },
                {
                    name: '🎯 Guild Perks',
                    value: guildData.perks.length > 0 ? 
                        guildData.perks.slice(0, 3).map(perk => `• ${perk.name}`).join('\n') :
                        'No perks unlocked yet',
                    inline: true
                }
            ]);

        if (validMembers.length > 0) {
            embed.addFields([{
                name: '👥 Recent Members',
                value: validMembers.slice(0, 8).map(m => 
                    `${m.user.displayName} (Lv.${m.level}) - *${m.role}*`
                ).join('\n'),
                inline: false
            }]);
        }

        const buttons = new ActionRowBuilder();
        const userData = await db.getPlayer(interaction.user.id);
        
        if (userData?.guild === guildData.id) {
            // User is in this guild
            buttons.addComponents(
                new ButtonBuilder()
                    .setCustomId('guild_manage')
                    .setLabel('⚙️ Manage')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!guildData.officers.includes(interaction.user.id)),
                new ButtonBuilder()
                    .setCustomId('guild_members')
                    .setLabel('👥 Members')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('guild_activities')
                    .setLabel('📜 Activities')
                    .setStyle(ButtonStyle.Secondary)
            );
        } else if (!userData?.guild) {
            // User can join
            buttons.addComponents(
                new ButtonBuilder()
                    .setCustomId(`guild_join_${guildData.id}`)
                    .setLabel('📥 Request to Join')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(!guildData.settings.joinRequests)
            );
        }

        buttons.addComponents(
            new ButtonBuilder()
                .setCustomId('guild_refresh')
                .setLabel('🔄 Refresh')
                .setStyle(ButtonStyle.Secondary)
        );

        await interaction.reply({
            embeds: [embed],
            components: [buttons]
        });
    },

    async handleManage(interaction) {
        const userData = await db.getPlayer(interaction.user.id);
        if (!userData?.guild) {
            return await interaction.reply({
                content: '❌ You\'re not in a guild!',
                ephemeral: true
            });
        }

        const guildData = await db.getGuild(userData.guild);
        if (!guildData.officers.includes(interaction.user.id)) {
            return await interaction.reply({
                content: '❌ Only guild officers can manage guild settings!',
                ephemeral: true
            });
        }

        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.guild || '#8B008B')
            .setTitle(`⚙️ Managing ${guildData.name}`)
            .setDescription('Select a management option:')
            .addFields([
                {
                    name: '👥 Member Management',
                    value: 'Invite, promote, or kick members',
                    inline: true
                },
                {
                    name: '🏛️ Treasury',
                    value: `Current: ${guildData.treasury.toLocaleString()} coins`,
                    inline: true
                },
                {
                    name: '⚙️ Settings',
                    value: 'Configure guild preferences',
                    inline: true
                }
            ]);

        const managementSelect = new StringSelectMenuBuilder()
            .setCustomId('guild_manage_select')
            .setPlaceholder('Choose a management option...')
            .addOptions([
                {
                    label: '👥 Member Management',
                    value: 'members',
                    description: 'Manage guild members and roles',
                    emoji: '👥'
                },
                {
                    label: '💰 Treasury Management',
                    value: 'treasury',
                    description: 'Manage guild funds and donations',
                    emoji: '💰'
                },
                {
                    label: '⚙️ Guild Settings',
                    value: 'settings',
                    description: 'Configure guild preferences',
                    emoji: '⚙️'
                },
                {
                    label: '📜 Activity Log',
                    value: 'activities',
                    description: 'View recent guild activities',
                    emoji: '📜'
                },
                {
                    label: '🎯 Guild Perks',
                    value: 'perks',
                    description: 'Manage guild perks and upgrades',
                    emoji: '🎯'
                }
            ]);

        await interaction.reply({
            embeds: [embed],
            components: [new ActionRowBuilder().addComponents(managementSelect)],
            ephemeral: true
        });
    },

    // Button handlers
    buttonHandlers: {
        async manage(interaction) {
            await module.exports.handleManage(interaction);
        },

        async invite(interaction) {
            await interaction.reply({
                content: '📨 **Guild Invitation System**\n\nTo invite someone to your guild:\n1. Ask them to use `/guild join [guild_name]`\n2. Or use the member management system in `/guild manage`\n\n*Direct invitation system coming soon!*',
                ephemeral: true
            });
        },

        async info(interaction) {
            const userData = await db.getPlayer(interaction.user.id);
            if (userData?.guild) {
                const newInteraction = {
                    ...interaction,
                    options: { getString: () => null }
                };
                await module.exports.handleInfo(newInteraction);
            } else {
                await interaction.reply({
                    content: '❌ You\'re not in a guild!',
                    ephemeral: true
                });
            }
        },

        async members(interaction) {
            const userData = await db.getPlayer(interaction.user.id);
            const guildData = await db.getGuild(userData.guild);
            
            if (!guildData) {
                return await interaction.reply({
                    content: '❌ Guild not found!',
                    ephemeral: true
                });
            }

            const members = await Promise.all(
                guildData.members.map(async id => {
                    try {
                        const user = await interaction.client.users.fetch(id);
                        const memberData = await db.getPlayer(id);
                        return {
                            user,
                            role: guildData.officers.includes(id) ? (id === guildData.owner ? 'Owner 👑' : 'Officer ⭐') : 'Member 👤',
                            level: memberData?.level || 1,
                            lastActive: memberData?.lastActive || 0
                        };
                    } catch {
                        return null;
                    }
                })
            );

            const validMembers = members.filter(m => m !== null);

            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.guild || '#8B008B')
                .setTitle(`👥 ${guildData.name} Members (${validMembers.length}/50)`)
                .setDescription(validMembers.map(m => 
                    `${m.role} ${m.user.displayName} (Lv.${m.level})`
                ).join('\n') || 'No members found')
                .setFooter({ text: 'Officers can manage members through /guild manage' });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        },

        async activities(interaction) {
            const userData = await db.getPlayer(interaction.user.id);
            const guildData = await db.getGuild(userData.guild);

            const embed = new EmbedBuilder()
                .setColor(config.embedColors?.guild || '#8B008B')
                .setTitle(`📜 ${guildData.name} Activity Log`)
                .setDescription(guildData.activities?.slice(-10).map(activity => 
                    `${new Date(activity.timestamp).toLocaleString()} - ${activity.description}`
                ).join('\n') || 'No recent activities')
                .setFooter({ text: 'Last 10 activities shown' });

            await interaction.reply({ embeds: [embed], ephemeral: true });
        },

        async refresh(interaction) {
            await module.exports.handleInfo(interaction);
        }
    },

    // Select menu handlers
    selectMenuHandlers: {
        async manage_select(interaction) {
            const option = interaction.values[0];
            
            switch (option) {
                case 'members':
                    await this.handleMemberManagement(interaction);
                    break;
                case 'treasury':
                    await this.handleTreasuryManagement(interaction);
                    break;
                case 'settings':
                    await this.handleSettingsManagement(interaction);
                    break;
                case 'activities':
                    await this.buttonHandlers.activities(interaction);
                    break;
                case 'perks':
                    await this.handlePerksManagement(interaction);
                    break;
            }
        }
    },

    async handleMemberManagement(interaction) {
        await interaction.reply({
            content: '👥 **Member Management Panel**\n\n• Use `/guild info` to view current members\n• Member promotion/demotion system in development\n• Kick functionality coming soon\n\n*Advanced member management tools will be available in the next update!*',
            ephemeral: true
        });
    },

    async handleTreasuryManagement(interaction) {
        const userData = await db.getPlayer(interaction.user.id);
        const guildData = await db.getGuild(userData.guild);

        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.guild || '#8B008B')
            .setTitle('💰 Guild Treasury Management')
            .addFields([
                { name: 'Current Treasury', value: `${guildData.treasury.toLocaleString()} coins`, inline: true },
                { name: 'Your Contribution', value: '0 coins', inline: true }, // Would track individual contributions
                { name: 'Total Donations', value: 'Coming soon', inline: true }
            ])
            .setDescription('Treasury management features in development');

        await interaction.reply({ embeds: [embed], ephemeral: true });
    },

    async handleSettingsManagement(interaction) {
        await interaction.reply({
            content: '⚙️ **Guild Settings Panel**\n\n• Join request settings\n• Public profile visibility\n• Auto-accept new members\n• Guild announcements\n\n*Settings management interface coming soon!*',
            ephemeral: true
        });
    },

    async handlePerksManagement(interaction) {
        await interaction.reply({
            content: '🎯 **Guild Perks System**\n\n• XP bonuses for members\n• Shared treasury benefits\n• Special guild-only events\n• Enhanced drop rates\n\n*Perk system in development!*',
            ephemeral: true
        });
    },

    async handleJoin(interaction) {
        const guildName = interaction.options.getString('guild');
        const userData = await db.getPlayer(interaction.user.id);
        
        if (userData?.guild) {
            return await interaction.reply({
                content: '❌ You\'re already in a guild! Leave your current guild first.',
                ephemeral: true
            });
        }

        const guildData = await db.getGuildByName(guildName);
        if (!guildData) {
            return await interaction.reply({
                content: '❌ Guild not found! Use `/guild list` to see available guilds.',
                ephemeral: true
            });
        }

        if (guildData.members.length >= 50) {
            return await interaction.reply({
                content: '❌ This guild is full (50/50 members)!',
                ephemeral: true
            });
        }

        // Add user to guild
        guildData.members.push(interaction.user.id);
        await db.updateGuild(guildData.id, { members: guildData.members });
        await db.updatePlayer(interaction.user.id, { 
            guild: guildData.id,
            guildRole: 'member'
        });

        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.success || '#00FF00')
            .setTitle('🎉 Welcome to the Guild!')
            .setDescription(`You've successfully joined **${guildData.name}**!`)
            .addFields([
                { name: '👥 Members', value: `${guildData.members.length}/50`, inline: true },
                { name: '⭐ Guild Level', value: `${guildData.level}`, inline: true },
                { name: '💰 Treasury', value: `${guildData.treasury.toLocaleString()} coins`, inline: true }
            ])
            .setFooter({ text: 'Use /guild info to learn more about your new guild!' });

        await interaction.reply({ embeds: [embed] });
    },

    async handleLeave(interaction) {
        const userData = await db.getPlayer(interaction.user.id);
        if (!userData?.guild) {
            return await interaction.reply({
                content: '❌ You\'re not in a guild!',
                ephemeral: true
            });
        }

        const guildData = await db.getGuild(userData.guild);
        if (guildData.owner === interaction.user.id) {
            return await interaction.reply({
                content: '❌ Guild owners cannot leave their guild! Transfer ownership or disband the guild first.',
                ephemeral: true
            });
        }

        // Remove user from guild
        guildData.members = guildData.members.filter(id => id !== interaction.user.id);
        guildData.officers = guildData.officers.filter(id => id !== interaction.user.id);
        
        await db.updateGuild(guildData.id, { 
            members: guildData.members,
            officers: guildData.officers
        });
        
        await db.updatePlayer(interaction.user.id, { 
            guild: null,
            guildRole: null
        });

        await interaction.reply({
            content: `✅ You've left **${guildData.name}**. You can join another guild anytime!`,
            ephemeral: true
        });
    },

    async handleList(interaction) {
        // This would show all guilds on the server
        await interaction.reply({
            content: '🏰 **Guild Directory**\n\nGuild listing system in development!\nFor now, ask other players about their guilds or create your own with `/guild create`.',
            ephemeral: true
        });
    }
};
