
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const os = require('os');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('status')
        .setDescription('🔍 Check bot status and system information'),

    async execute(interaction) {
        try {
            const client = interaction.client;
            const uptime = process.uptime();
            const memUsage = process.memoryUsage();
            
            // Format uptime
            const days = Math.floor(uptime / 86400);
            const hours = Math.floor((uptime % 86400) / 3600);
            const minutes = Math.floor((uptime % 3600) / 60);
            const seconds = Math.floor(uptime % 60);
            const uptimeString = `${days}d ${hours}h ${minutes}m ${seconds}s`;

            // System info
            const totalMem = os.totalmem();
            const freeMem = os.freemem();
            const usedMem = totalMem - freeMem;
            const memPercent = ((usedMem / totalMem) * 100).toFixed(1);

            const embed = new EmbedBuilder()
                .setTitle('🤖 Bot Status')
                .setColor(0x00FF00)
                .setThumbnail(client.user.displayAvatarURL())
                .addFields([
                    {
                        name: '📊 General Stats',
                        value: `**Uptime:** ${uptimeString}\n**Servers:** ${client.guilds.cache.size}\n**Users:** ${client.users.cache.size}\n**Commands:** ${client.commands.size}`,
                        inline: true
                    },
                    {
                        name: '💾 Memory Usage',
                        value: `**Heap Used:** ${(memUsage.heapUsed / 1024 / 1024).toFixed(2)} MB\n**Heap Total:** ${(memUsage.heapTotal / 1024 / 1024).toFixed(2)} MB\n**RSS:** ${(memUsage.rss / 1024 / 1024).toFixed(2)} MB`,
                        inline: true
                    },
                    {
                        name: '🖥️ System Info',
                        value: `**Platform:** ${os.platform()}\n**CPU Cores:** ${os.cpus().length}\n**System Memory:** ${memPercent}% used\n**Load Average:** ${os.loadavg()[0].toFixed(2)}`,
                        inline: true
                    },
                    {
                        name: '🌐 Network',
                        value: `**Ping:** ${client.ws.ping}ms\n**Status:** ${client.ws.status === 0 ? '🟢 Connected' : '🔴 Disconnected'}`,
                        inline: true
                    },
                    {
                        name: '📈 Performance',
                        value: `**Node.js:** ${process.version}\n**Discord.js:** ${require('discord.js').version}`,
                        inline: true
                    }
                ])
                .setFooter({ 
                    text: `Requested by ${interaction.user.username}`, 
                    iconURL: interaction.user.displayAvatarURL() 
                })
                .setTimestamp();

            const row = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('status_refresh')
                        .setLabel('🔄 Refresh')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('status_detailed')
                        .setLabel('📋 Detailed Info')
                        .setStyle(ButtonStyle.Secondary)
                );

            await interaction.reply({
                embeds: [embed],
                components: [row]
            });

        } catch (error) {
            console.error('Error in status command:', error);
            await interaction.reply({
                content: '❌ An error occurred while retrieving bot status.',
                ephemeral: true
            });
        }
    },

    // Button handlers
    buttonHandlers: {
        refresh: async function(interaction) {
            await interaction.deferUpdate();
            await this.execute(interaction);
        },
        
        detailed: async function(interaction) {
            try {
                const client = interaction.client;
                const process_info = process;
                
                const detailedEmbed = new EmbedBuilder()
                    .setTitle('🔍 Detailed Bot Information')
                    .setColor(0x0099FF)
                    .addFields([
                        {
                            name: '🔧 Process Info',
                            value: `**PID:** ${process_info.pid}\n**Node Version:** ${process_info.version}\n**Platform:** ${process_info.platform}\n**Architecture:** ${process_info.arch}`,
                            inline: true
                        },
                        {
                            name: '📊 Cache Stats',
                            value: `**Guilds:** ${client.guilds.cache.size}\n**Users:** ${client.users.cache.size}\n**Channels:** ${client.channels.cache.size}`,
                            inline: true
                        },
                        {
                            name: '⚙️ Environment',
                            value: `**Working Directory:** ${process_info.cwd()}\n**Executable Path:** ${process_info.execPath}`,
                            inline: false
                        }
                    ])
                    .setTimestamp();

                await interaction.reply({
                    embeds: [detailedEmbed],
                    ephemeral: true
                });

            } catch (error) {
                console.error('Error in detailed status:', error);
                await interaction.reply({
                    content: '❌ Failed to get detailed information.',
                    ephemeral: true
                });
            }
        }
    }
};
