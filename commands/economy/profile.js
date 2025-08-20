const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('profile')
        .setDescription('📊 View your adventurer profile and statistics')
        .addUserOption(option =>
            option.setName('user')
                .setDescription('View another user\'s profile')
                .setRequired(false)),
    
    async execute(interaction) {
        const targetUser = interaction.options?.getUser('user') || interaction.user;
        const userId = targetUser.id;
        const isOwnProfile = userId === interaction.user.id;
        
        // Get user data
        const userData = await db.getUser(userId) || {
            inventory: { coins: 0, items: [] },
            stats: {
                huntsCompleted: 0,
                totalEarned: 0,
                battlesWon: 0,
                dungeonClears: 0,
                level: 1,
                experience: 0,
                joinDate: Date.now()
            },
            equipment: {},
            achievements: [],
            titles: [],
            pets: []
        };
        
        // Calculate level and next level XP
        const currentLevel = userData.stats.level || 1;
        const currentXP = userData.stats.experience || 0;
        const xpForNextLevel = currentLevel * 100;
        const xpProgress = currentXP % 100;
        
        // Calculate user's rank
        const allUsers = await db.getAllUsers() || [];
        const sortedUsers = allUsers.sort((a, b) => (b.stats?.totalEarned || 0) - (a.stats?.totalEarned || 0));
        const userRank = sortedUsers.findIndex(user => user.id === userId) + 1;
        
        // Get active title
        const activeTitle = userData.titles?.find(t => t.active)?.name || 'Novice Adventurer';
        
        // Calculate play time
        const joinDate = userData.stats.joinDate || Date.now();
        const playTime = Math.floor((Date.now() - joinDate) / (1000 * 60 * 60 * 24));
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.profile)
            .setTitle(`${config.emojis.crown} ${targetUser.displayName}'s Adventure Profile`)
            .setDescription(`**${activeTitle}** • Level ${currentLevel} Adventurer`)
            .setThumbnail(targetUser.displayAvatarURL({ dynamic: true }))
            .addFields([
                {
                    name: '💰 Wealth & Resources',
                    value: `${config.emojis.coin} **${userData.inventory.coins || 0}** coins\n${config.emojis.gem} **${userData.inventory.items?.length || 0}** items\n🏆 **#${userRank}** global rank`,
                    inline: true
                },
                {
                    name: '📈 Experience & Level',
                    value: `⭐ Level **${currentLevel}**\n🎯 **${currentXP}** total XP\n📊 **${xpProgress}/100** to next level`,
                    inline: true
                },
                {
                    name: '🎮 Adventure Stats',
                    value: `🗺️ **${userData.stats.huntsCompleted || 0}** hunts completed\n⚔️ **${userData.stats.battlesWon || 0}** battles won\n🏰 **${userData.stats.dungeonClears || 0}** dungeons cleared`,
                    inline: true
                },
                {
                    name: '💎 Total Earnings',
                    value: `${config.emojis.treasure} **${userData.stats.totalEarned || 0}** coins earned\n📅 **${playTime}** days playing\n⏰ Last active: ${userData.stats.lastHunt ? `<t:${Math.floor(userData.stats.lastHunt / 1000)}:R>` : 'Never'}`,
                    inline: true
                },
                {
                    name: '🛡️ Equipment',
                    value: userData.equipment?.weapon ? 
                        `⚔️ ${userData.equipment.weapon}\n🛡️ ${userData.equipment.armor || 'None'}\n💍 ${userData.equipment.accessory || 'None'}` :
                        'No equipment equipped',
                    inline: true
                },
                {
                    name: '🐾 Companions',
                    value: userData.pets?.length > 0 ? 
                        userData.pets.slice(0, 3).map(pet => `${pet.emoji || '🐕'} ${pet.name}`).join('\n') :
                        'No pets acquired',
                    inline: true
                }
            ])
            .setFooter({ 
                text: `Adventure started on ${new Date(joinDate).toLocaleDateString()}` 
            })
            .setTimestamp();
            
        // Add achievements if any
        if (userData.achievements?.length > 0) {
            const achievementDisplay = userData.achievements.slice(0, 5).join(' • ');
            embed.addFields([
                { 
                    name: '🏅 Recent Achievements', 
                    value: achievementDisplay + (userData.achievements.length > 5 ? ` • +${userData.achievements.length - 5} more` : ''),
                    inline: false 
                }
            ]);
        }
        
        // Create action buttons
        const buttons = new ActionRowBuilder();
        
        if (isOwnProfile) {
            buttons.addComponents(
                new ButtonBuilder()
                    .setCustomId('profile_inventory')
                    .setLabel('🎒 Inventory')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('profile_achievements')
                    .setLabel('🏅 Achievements')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('profile_settings')
                    .setLabel('⚙️ Settings')
                    .setStyle(ButtonStyle.Secondary)
            );
        } else {
            buttons.addComponents(
                new ButtonBuilder()
                    .setCustomId(`profile_challenge_${userId}`)
                    .setLabel('⚔️ Challenge')
                    .setStyle(ButtonStyle.Danger),
                new ButtonBuilder()
                    .setCustomId(`profile_trade_${userId}`)
                    .setLabel('🤝 Trade')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId(`profile_compare_${userId}`)
                    .setLabel('📊 Compare')
                    .setStyle(ButtonStyle.Secondary)
            );
        }
        
        await interaction.reply({ embeds: [embed], components: [buttons] });
    }
};