const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const db = require('../../database.js');

// Store active parties
const activeParties = new Map();

class Party {
    constructor(options) {
        this.id = Math.random().toString(36).substring(2, 8).toUpperCase();
        this.leader = options.leader;
        this.activity = options.activity;
        this.maxSize = options.maxSize || 4;
        this.members = [options.leader];
        this.status = 'recruiting'; // recruiting, full, in-progress
        this.createdAt = Date.now();
    }

    addMember(member) {
        if (this.members.length >= this.maxSize) return false;
        if (this.members.find(m => m.id === member.id)) return false;
        this.members.push(member);
        if (this.members.length === this.maxSize) {
            this.status = 'full';
        }
        return true;
    }

    removeMember(memberId) {
        const index = this.members.findIndex(m => m.id === memberId);
        if (index === -1) return false;
        this.members.splice(index, 1);
        if (this.status === 'full') {
            this.status = 'recruiting';
        }
        return true;
    }
}

module.exports = {
    data: new SlashCommandBuilder()
        .setName('party')
        .setDescription('👥 Create or manage an adventure party')
        .addSubcommand(subcommand =>
            subcommand
                .setName('create')
                .setDescription('Create a new party')
                .addStringOption(option =>
                    option.setName('activity')
                        .setDescription('Party activity')
                        .setRequired(true)
                        .addChoices(
                            { name: '⚔️ Dungeon Raid', value: 'raid' },
                            { name: '🗺️ Group Expedition', value: 'expedition' },
                            { name: '🏰 Castle Siege', value: 'siege' },
                            { name: '🎯 Monster Hunt', value: 'hunt' }
                        ))
                .addIntegerOption(option =>
                    option.setName('size')
                        .setDescription('Maximum party size')
                        .setRequired(true)
                        .addChoices(
                            { name: 'Small (2 players)', value: 2 },
                            { name: 'Medium (4 players)', value: 4 },
                            { name: 'Large (6 players)', value: 6 }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('join')
                .setDescription('Join an existing party')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('Party ID')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leave')
                .setDescription('Leave your current party'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('info')
                .setDescription('View party information')
                .addStringOption(option =>
                    option.setName('id')
                        .setDescription('Party ID')
                        .setRequired(false))),

    async execute(interaction) {
        await interaction.deferReply();

        try {
            const subcommand = interaction.options.getSubcommand();

            if (subcommand === 'create') {
                const activity = interaction.options.getString('activity');
                const maxSize = interaction.options.getInteger('size');

                const party = new Party({
                    leader: interaction.user,
                    activity,
                    maxSize
                });

                activeParties.set(party.id, party);

                const embed = new EmbedBuilder()
                    .setColor('#FFD700')
                    .setTitle(`👥 New Party Created: ${party.id}`)
                    .setDescription(`A new party for ${activity} has been created!`)
                    .addFields(
                        { name: 'Activity', value: activity, inline: true },
                        { name: 'Size', value: `${party.members.length}/${maxSize}`, inline: true },
                        { name: 'Leader', value: interaction.user.tag, inline: true },
                        { name: 'Status', value: 'Recruiting', inline: true }
                    )
                    .setFooter({ text: `Use /party join ${party.id} to join!` });

                const joinButton = new ButtonBuilder()
                    .setCustomId(`party_join_${party.id}`)
                    .setLabel('Join Party')
                    .setStyle(ButtonStyle.Primary);

                const row = new ActionRowBuilder()
                    .addComponents(joinButton);

                await interaction.editReply({ embeds: [embed], components: [row] });

            } else if (subcommand === 'join') {
                const id = interaction.options.getString('id');
                const party = activeParties.get(id);

                if (!party) {
                    await interaction.editReply({ 
                        content: '❌ Party not found.',
                        ephemeral: true 
                    });
                    return;
                }

                if (party.status !== 'recruiting') {
                    await interaction.editReply({ 
                        content: '❌ This party is no longer recruiting.',
                        ephemeral: true 
                    });
                    return;
                }

                if (party.addMember(interaction.user)) {
                    const embed = new EmbedBuilder()
                        .setColor('#32CD32')
                        .setTitle(`✅ Joined Party ${party.id}`)
                        .setDescription(`${interaction.user.tag} has joined the party!`)
                        .addFields(
                            { name: 'Members', value: `${party.members.length}/${party.maxSize}`, inline: true },
                            { name: 'Status', value: party.status, inline: true }
                        );

                    if (party.status === 'full') {
                        embed.addFields({
                            name: '🎮 Party Full!',
                            value: 'All slots filled! The activity can begin.',
                            inline: false
                        });
                    }

                    await interaction.editReply({ embeds: [embed] });
                } else {
                    await interaction.editReply({ 
                        content: '❌ Unable to join party. It might be full or you\'re already a member.',
                        ephemeral: true 
                    });
                }

            } else if (subcommand === 'leave') {
                let userParty = null;
                for (const [id, party] of activeParties) {
                    if (party.members.find(m => m.id === interaction.user.id)) {
                        userParty = party;
                        break;
                    }
                }

                if (!userParty) {
                    await interaction.editReply({ 
                        content: '❌ You\'re not in a party.',
                        ephemeral: true 
                    });
                    return;
                }

                if (userParty.leader.id === interaction.user.id) {
                    activeParties.delete(userParty.id);
                    await interaction.editReply('👋 Party disbanded as the leader has left.');
                } else {
                    userParty.removeMember(interaction.user.id);
                    await interaction.editReply('👋 You\'ve left the party.');
                }

            } else if (subcommand === 'info') {
                const id = interaction.options.getString('id');
                let party;

                if (id) {
                    party = activeParties.get(id);
                } else {
                    // Find party user is in
                    for (const [partyId, p] of activeParties) {
                        if (p.members.find(m => m.id === interaction.user.id)) {
                            party = p;
                            break;
                        }
                    }
                }

                if (!party) {
                    await interaction.editReply({ 
                        content: id ? '❌ Party not found.' : '❌ You\'re not in a party.',
                        ephemeral: true 
                    });
                    return;
                }

                const embed = new EmbedBuilder()
                    .setColor('#4169E1')
                    .setTitle(`Party Information: ${party.id}`)
                    .setDescription(`Activity: ${party.activity}`)
                    .addFields(
                        { name: 'Leader', value: party.leader.tag, inline: true },
                        { name: 'Status', value: party.status, inline: true },
                        { name: 'Size', value: `${party.members.length}/${party.maxSize}`, inline: true },
                        { name: 'Members', value: party.members.map(m => m.tag).join('\n'), inline: false }
                    )
                    .setFooter({ text: `Created ${new Date(party.createdAt).toLocaleString()}` });

                await interaction.editReply({ embeds: [embed] });
            }

        } catch (error) {
            console.error('Error in party command:', error);
            await interaction.editReply({
                content: '❌ An error occurred while processing the party command.',
                ephemeral: true
            });
        }
    },
};
                            { name: '⚔️ Combat', value: 'combat' },
                            { name: '🗺️ Exploration', value: 'exploration' },
                            { name: '🏰 Dungeon', value: 'dungeon' },
                            { name: '🎯 Quest', value: 'quest' }
                        ))
                .addIntegerOption(option =>
                    option.setName('size')
                        .setDescription('Maximum party size')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('invite')
                .setDescription('Invite a player to your party')
                .addUserOption(option =>
                    option.setName('player')
                        .setDescription('Player to invite')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List active parties looking for members'))
        .addSubcommand(subcommand =>
            subcommand
                .setName('leave')
                .setDescription('Leave your current party')),

    async execute(interaction) {
        // Command logic will go here
        await interaction.reply('Party system coming soon!');
    },
};
