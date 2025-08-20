const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const jobs = [
    { id: 'miner', name: 'Mine Supervisor', pay: { min: 150, max: 250 }, emoji: '⛏️', requirements: { mining: 5 } },
    { id: 'fisherman', name: 'Professional Fisher', pay: { min: 120, max: 200 }, emoji: '🎣', requirements: { fishing: 3 } },
    { id: 'guard', name: 'City Guard', pay: { min: 100, max: 180 }, emoji: '🛡️', requirements: { level: 5 } },
    { id: 'merchant', name: 'Traveling Merchant', pay: { min: 80, max: 160 }, emoji: '🛒', requirements: { level: 3 } },
    { id: 'scribe', name: 'Guild Scribe', pay: { min: 90, max: 140 }, emoji: '📜', requirements: {} },
    { id: 'blacksmith', name: 'Blacksmith Assistant', pay: { min: 110, max: 190 }, emoji: '🔨', requirements: { crafting: 3 } },
    { id: 'explorer', name: 'Map Maker', pay: { min: 130, max: 220 }, emoji: '🗺️', requirements: { level: 8 } },
    { id: 'tavern', name: 'Tavern Keeper', pay: { min: 70, max: 130 }, emoji: '🍺', requirements: {} },
    { id: 'hunter', name: 'Monster Hunter', pay: { min: 200, max: 350 }, emoji: '⚔️', requirements: { level: 10, battles: 5 } },
    { id: 'mage', name: 'Court Mage', pay: { min: 180, max: 300 }, emoji: '🔮', requirements: { magic: 5 } }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('work')
        .setDescription('💼 Work various jobs to earn coins!')
        .addStringOption(option =>
            option.setName('job')
                .setDescription('Choose specific job to work')
                .setRequired(false)
                .addChoices(
                    { name: '⛏️ Mine Supervisor', value: 'miner' },
                    { name: '🎣 Professional Fisher', value: 'fisherman' },
                    { name: '🛡️ City Guard', value: 'guard' },
                    { name: '🛒 Traveling Merchant', value: 'merchant' },
                    { name: '📜 Guild Scribe', value: 'scribe' },
                    { name: '🔨 Blacksmith Assistant', value: 'blacksmith' },
                    { name: '🗺️ Map Maker', value: 'explorer' },
                    { name: '🍺 Tavern Keeper', value: 'tavern' },
                    { name: '⚔️ Monster Hunter', value: 'hunter' },
                    { name: '🔮 Court Mage', value: 'mage' }
                )),
    
    async execute(interaction) {
        const requestedJob = interaction.options?.getString('job');
        const userId = interaction.user.id;
        
        const userData = await db.getUser(userId) || {
            inventory: { coins: 0 },
            stats: { level: 1 },
            cooldowns: {}
        };
        
        // Check cooldown
        const lastWork = userData.cooldowns?.work || 0;
        const cooldownTime = 3600000; // 1 hour
        const timeSinceLastWork = Date.now() - lastWork;
        
        if (timeSinceLastWork < cooldownTime) {
            const timeLeft = cooldownTime - timeSinceLastWork;
            const hoursLeft = Math.floor(timeLeft / 3600000);
            const minutesLeft = Math.floor((timeLeft % 3600000) / 60000);
            
            return interaction.reply({
                content: `⏰ You're still tired from your last job! Rest for ${hoursLeft}h ${minutesLeft}m more.`,
                ephemeral: true
            });
        }
        
        if (!requestedJob) {
            await this.showJobBoard(interaction, userData);
        } else {
            await this.workJob(interaction, requestedJob, userData);
        }
    },
    
    async showJobBoard(interaction, userData) {
        const availableJobs = this.getAvailableJobs(userData);
        const lockedJobs = jobs.filter(job => !this.meetsRequirements(userData, job));
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.info)
            .setTitle('💼 Adventurer Job Board')
            .setDescription('**Choose from available work opportunities!**\nEarn coins by putting your skills to good use.')
            .setThumbnail('https://cdn.discordapp.com/emojis/742747860554686485.png')
            .addFields([
                {
                    name: '👤 Your Qualifications',
                    value: `⭐ Level: **${userData.stats?.level || 1}**\n⛏️ Mining: **${userData.stats?.mining || 1}**\n🎣 Fishing: **${userData.stats?.fishing || 1}**\n🔨 Crafting: **${userData.stats?.crafting || 1}**\n🔮 Magic: **${userData.magic?.level || 1}**`,
                    inline: true
                },
                {
                    name: '💰 Work Info',
                    value: `⏰ Cooldown: **1 hour**\n💳 Current Balance: **${userData.inventory?.coins || 0}** coins\n🎯 Total Jobs Done: **${userData.stats?.jobsDone || 0}**`,
                    inline: true
                },
                {
                    name: '🎁 Work Benefits',
                    value: '• Steady income every hour\n• Experience for relevant skills\n• Special job perks and bonuses\n• Career advancement opportunities',
                    inline: true
                }
            ]);
            
        // Add available jobs
        if (availableJobs.length > 0) {
            const jobList = availableJobs.map(job => {
                const bonus = this.getJobBonus(userData, job);
                const basePay = `${job.pay.min}-${job.pay.max}`;
                const totalPay = bonus > 0 ? `${job.pay.min + bonus}-${job.pay.max + bonus}` : basePay;
                return `${job.emoji} **${job.name}**\n   💰 ${totalPay} coins${bonus > 0 ? ` (+${bonus} bonus)` : ''}`;
            }).join('\n\n');
            
            embed.addFields([
                { name: '✅ Available Jobs', value: jobList, inline: false }
            ]);
        }
        
        // Add locked jobs
        if (lockedJobs.length > 0) {
            const lockedList = lockedJobs.slice(0, 5).map(job => {
                const reqs = Object.entries(job.requirements).map(([skill, level]) => 
                    `${skill} ${level}`
                ).join(', ');
                return `${job.emoji} **${job.name}** 🔒\n   Requirements: ${reqs || 'None'}`;
            }).join('\n\n');
            
            embed.addFields([
                { name: '🔒 Locked Jobs (Level Up to Unlock)', value: lockedList, inline: false }
            ]);
        }
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('work_quick')
                    .setLabel('⚡ Quick Work')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(availableJobs.length === 0),
                new ButtonBuilder()
                    .setCustomId('work_best_pay')
                    .setLabel('💰 Best Paying Job')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(availableJobs.length === 0),
                new ButtonBuilder()
                    .setCustomId('work_history')
                    .setLabel('📊 Work History')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('skill_training')
                    .setLabel('📚 Skill Training')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        await interaction.reply({ embeds: [embed], components: [buttons] });
    },
    
    async workJob(interaction, jobId, userData) {
        const job = jobs.find(j => j.id === jobId);
        
        if (!job) {
            return interaction.reply({
                content: '❌ Job not found!',
                ephemeral: true
            });
        }
        
        if (!this.meetsRequirements(userData, job)) {
            const reqs = Object.entries(job.requirements).map(([skill, level]) => 
                `${skill} level ${level}`
            ).join(', ');
            return interaction.reply({
                content: `❌ You don't meet the requirements for ${job.name}! Need: ${reqs}`,
                ephemeral: true
            });
        }
        
        // Calculate earnings
        const basePay = Math.floor(Math.random() * (job.pay.max - job.pay.min + 1)) + job.pay.min;
        const bonus = this.getJobBonus(userData, job);
        const totalPay = basePay + bonus;
        
        // Work event simulation
        const workEvents = this.generateWorkEvent(job, userData);
        const eventBonus = workEvents.bonus || 0;
        const finalPay = totalPay + eventBonus;
        
        // Update user data
        userData.inventory.coins = (userData.inventory.coins || 0) + finalPay;
        userData.cooldowns.work = Date.now();
        userData.stats.jobsDone = (userData.stats.jobsDone || 0) + 1;
        userData.stats.totalEarned = (userData.stats.totalEarned || 0) + finalPay;
        userData.stats.workTime = (userData.stats.workTime || 0) + 1;
        
        // Job-specific skill experience
        if (job.id === 'miner') {
            userData.stats.miningExp = (userData.stats.miningExp || 0) + 10;
        } else if (job.id === 'fisherman') {
            userData.stats.fishingExp = (userData.stats.fishingExp || 0) + 10;
        } else if (job.id === 'blacksmith') {
            userData.stats.craftingExp = (userData.stats.craftingExp || 0) + 10;
        } else if (job.id === 'mage') {
            if (!userData.magic) userData.magic = { level: 1, experience: 0 };
            userData.magic.experience += 15;
        }
        
        // General experience
        userData.stats.experience = (userData.stats.experience || 0) + 5;
        
        await db.setUser(interaction.user.id, userData);
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.success)
            .setTitle(`${job.emoji} Work Complete: ${job.name}`)
            .setDescription(`**You successfully completed your shift!**\n\n${workEvents.description}`)
            .addFields([
                { name: '💰 Base Pay', value: `${basePay} coins`, inline: true },
                { name: '🎯 Skill Bonus', value: `+${bonus} coins`, inline: true },
                { name: '✨ Event Bonus', value: `+${eventBonus} coins`, inline: true },
                { name: '🎉 Total Earned', value: `**${finalPay} coins**`, inline: true },
                { name: '💳 New Balance', value: `${userData.inventory.coins} coins`, inline: true },
                { name: '📊 Jobs Completed', value: `${userData.stats.jobsDone}`, inline: true }
            ])
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp();
            
        // Add experience gains
        let expText = '+5 general XP';
        if (job.id === 'miner') expText += '\n+10 mining XP';
        else if (job.id === 'fisherman') expText += '\n+10 fishing XP';
        else if (job.id === 'blacksmith') expText += '\n+10 crafting XP';
        else if (job.id === 'mage') expText += '\n+15 magic XP';
        
        embed.addFields([
            { name: '🎯 Experience Gained', value: expText, inline: false }
        ]);
        
        // Check for promotions/achievements
        if (userData.stats.jobsDone === 10) {
            embed.addFields([
                { name: '🏆 Achievement Unlocked!', value: '**Hard Worker** - Completed 10 jobs', inline: false }
            ]);
        }
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('work_board')
                    .setLabel('💼 Job Board')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('work_stats')
                    .setLabel('📊 Work Statistics')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('shop_visit')
                    .setLabel('🛒 Spend Earnings')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('profile_view')
                    .setLabel('📋 View Profile')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        await interaction.reply({ embeds: [embed], components: [buttons] });
    },
    
    getAvailableJobs(userData) {
        return jobs.filter(job => this.meetsRequirements(userData, job));
    },
    
    meetsRequirements(userData, job) {
        for (const [skill, required] of Object.entries(job.requirements)) {
            let userLevel = 1;
            
            if (skill === 'level') {
                userLevel = userData.stats?.level || 1;
            } else if (skill === 'mining') {
                userLevel = userData.stats?.mining || 1;
            } else if (skill === 'fishing') {
                userLevel = userData.stats?.fishing || 1;
            } else if (skill === 'crafting') {
                userLevel = userData.stats?.crafting || 1;
            } else if (skill === 'magic') {
                userLevel = userData.magic?.level || 1;
            } else if (skill === 'battles') {
                userLevel = userData.stats?.battlesWon || 0;
            }
            
            if (userLevel < required) return false;
        }
        return true;
    },
    
    getJobBonus(userData, job) {
        let bonus = 0;
        
        // Experience-based bonuses
        const jobsDone = userData.stats?.jobsDone || 0;
        if (jobsDone >= 50) bonus += 30;
        else if (jobsDone >= 20) bonus += 20;
        else if (jobsDone >= 10) bonus += 10;
        
        // Job-specific bonuses
        if (job.id === 'miner' && (userData.stats?.mining || 1) > 5) bonus += 20;
        if (job.id === 'fisherman' && (userData.stats?.fishing || 1) > 5) bonus += 20;
        if (job.id === 'blacksmith' && (userData.stats?.crafting || 1) > 5) bonus += 20;
        if (job.id === 'mage' && (userData.magic?.level || 1) > 5) bonus += 25;
        
        // Guild bonus
        if (userData.guild) bonus += 15;
        
        return bonus;
    },
    
    generateWorkEvent(job, userData) {
        const events = [
            {
                description: 'A routine day at work. You completed all your tasks efficiently.',
                bonus: 0
            },
            {
                description: 'You impressed your supervisor with excellent work and earned a bonus!',
                bonus: 25
            },
            {
                description: 'You helped a coworker with a difficult task and were rewarded.',
                bonus: 15
            },
            {
                description: 'You discovered a more efficient way to do your job.',
                bonus: 20
            },
            {
                description: 'A wealthy customer was pleased with your service and tipped generously.',
                bonus: 35
            },
            {
                description: 'You worked overtime to complete an urgent project.',
                bonus: 30
            }
        ];
        
        // Higher chance of good events for experienced workers
        const jobsDone = userData.stats?.jobsDone || 0;
        const goodEventChance = Math.min(0.3 + (jobsDone * 0.01), 0.7);
        
        if (Math.random() < goodEventChance) {
            return events[Math.floor(Math.random() * events.length)];
        } else {
            return events[0]; // Default routine event
        }
    }
};