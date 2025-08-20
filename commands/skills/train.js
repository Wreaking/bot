const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('train')
        .setDescription('💪 Train your skills to become a master treasure hunter'),
    
    async execute(interaction) {
        const userId = interaction.user.id;
        const userProfile = await db.get(`user_${userId}`) || {
            coins: 100,
            level: 1,
            experience: 0,
            skills: {
                strength: 1,
                agility: 1,
                intelligence: 1,
                luck: 1,
                perception: 1
            }
        };

        const skills = [
            { 
                name: 'Strength', 
                emoji: '💪', 
                current: userProfile.skills?.strength || 1, 
                cost: 100,
                benefit: 'Increases combat damage and mining efficiency'
            },
            { 
                name: 'Agility', 
                emoji: '🏃', 
                current: userProfile.skills?.agility || 1, 
                cost: 100,
                benefit: 'Improves dodge chance and treasure hunting speed'
            },
            { 
                name: 'Intelligence', 
                emoji: '🧠', 
                current: userProfile.skills?.intelligence || 1, 
                cost: 120,
                benefit: 'Better magic abilities and puzzle solving'
            },
            { 
                name: 'Luck', 
                emoji: '🍀', 
                current: userProfile.skills?.luck || 1, 
                cost: 150,
                benefit: 'Higher chance for rare treasure discoveries'
            },
            { 
                name: 'Perception', 
                emoji: '👁️', 
                current: userProfile.skills?.perception || 1, 
                cost: 110,
                benefit: 'Spot hidden treasures and secret passages'
            }
        ];

        const embed = new EmbedBuilder()
            .setColor('#FF6347')
            .setTitle('💪 Training Grounds')
            .setDescription('**Master\'s Academy for Adventurers**\n\nImprove your skills to unlock new abilities and find better treasures!')
            .addFields(
                { name: '💰 Available Coins', value: `${userProfile.coins || 0}`, inline: true },
                { name: '⭐ Character Level', value: `${userProfile.level || 1}`, inline: true },
                { name: '🎯 Total Skill Points', value: `${Object.values(userProfile.skills || {}).reduce((a, b) => a + b, 0)}`, inline: true }
            );

        skills.forEach(skill => {
            const nextLevel = skill.current + 1;
            const adjustedCost = Math.floor(skill.cost * Math.pow(1.2, skill.current - 1));
            
            embed.addFields({
                name: `${skill.emoji} ${skill.name} - Level ${skill.current}`,
                value: `**Upgrade Cost:** ${adjustedCost} coins\n**Next Level:** ${nextLevel}\n**Benefit:** ${skill.benefit}`,
                inline: true
            });
        });

        const buttons = skills.map((skill, index) => 
            new ButtonBuilder()
                .setCustomId(`train_${index}`)
                .setLabel(`Train ${skill.name}`)
                .setStyle(ButtonStyle.Primary)
                .setEmoji(skill.emoji)
        );

        const specialButton = new ButtonBuilder()
            .setCustomId('train_special')
            .setLabel('Special Training')
            .setStyle(ButtonStyle.Danger)
            .setEmoji('⚡');

        const row1 = new ActionRowBuilder().addComponents(buttons.slice(0, 3));
        const row2 = new ActionRowBuilder().addComponents(buttons.slice(3, 5));
        const row3 = new ActionRowBuilder().addComponents(specialButton);

        await interaction.reply({ embeds: [embed], components: [row1, row2, row3] });
    }
};