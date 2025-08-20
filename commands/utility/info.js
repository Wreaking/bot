
const { SlashCommandBuilder, EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');

module.exports = {
    data: new SlashCommandBuilder()
        .setName('info')
        .setDescription('📋 Get comprehensive information about the bot and its features')
        .addStringOption(option =>
            option.setName('section')
                .setDescription('Specific information section')
                .setRequired(false)
                .addChoices(
                    { name: '🎮 Game Features', value: 'features' },
                    { name: '🏛️ Social Systems', value: 'social' },
                    { name: '⚔️ Combat & RPG', value: 'combat' },
                    { name: '💰 Economy', value: 'economy' },
                    { name: '🔧 Technical Info', value: 'technical' },
                    { name: '❓ Help & Support', value: 'support' }
                )),
    
    async execute(interaction) {
        const section = interaction.options?.getString('section');
        
        try {
            if (section) {
                await this.showDetailedSection(interaction, section);
            } else {
                await this.showOverview(interaction);
            }
        } catch (error) {
            console.error('Info command error:', error);
            await interaction.reply({ 
                content: '❌ Error retrieving bot information.', 
                ephemeral: true 
            });
        }
    },

    async showOverview(interaction) {
        const embed = new EmbedBuilder()
            .setColor(config.embedColors?.info || '#3498DB')
            .setTitle('🏴‍☠️ RPG Treasure Hunter Bot - Complete Guide')
            .setDescription('**The Ultimate Discord RPG Experience!**\n\nA comprehensive treasure hunting adventure with deep RPG mechanics, social features, and endless possibilities!')
            .setThumbnail(interaction.client.user.displayAvatarURL())
            .addFields([
                { 
                    name: '🎮 Core Game Features', 
                    value: '• **54+ Commands** across 15+ categories\n• **Deep RPG System** with levels, skills, and classes\n• **Treasure Hunting** with clues and exploration\n• **Combat System** featuring PvP and PvE battles\n• **Crafting & Magic** for item creation and spells', 
                    inline: false 
                },
                { 
                    name: '🌟 Key Highlights', 
                    value: '• **Real-time Economy** with market fluctuations\n• **Guild System** with cooperative gameplay\n• **Achievement System** with 50+ unlockable rewards\n• **Interactive UI** with buttons and menus\n• **Rich Embeds** with beautiful visual responses', 
                    inline: false 
                },
                { 
                    name: '📊 Bot Statistics', 
                    value: `• **Commands**: ${interaction.client.commands?.size || '54+'}+\n• **Categories**: 15+ different types\n• **Uptime**: 24/7 online\n• **Servers**: Growing community\n• **Response Time**: < 100ms average`, 
                    inline: true 
                },
                { 
                    name: '🚀 Getting Started', 
                    value: '• Use `/help` to see all commands\n• Create your profile with `/profile`\n• Claim daily rewards with `/daily`\n• Start treasure hunting with `/hunt`\n• Join a guild with `/guild join`', 
                    inline: true 
                },
                { 
                    name: '🏆 Premium Features', 
                    value: '• **Advanced Statistics** tracking\n• **Priority Support** from developers\n• **Exclusive Events** and rewards\n• **Beta Access** to new features\n• **Custom Profiles** and themes', 
                    inline: false 
                }
            ])
            .setFooter({ 
                text: 'Choose a section below for detailed information | Version 2.1.0', 
                iconURL: interaction.client.user.displayAvatarURL() 
            })
            .setTimestamp();

        const sectionSelect = new StringSelectMenuBuilder()
            .setCustomId('info_section')
            .setPlaceholder('📋 Select a section for detailed information...')
            .addOptions([
                {
                    label: 'Game Features',
                    description: 'Complete overview of all game mechanics',
                    value: 'features',
                    emoji: '🎮'
                },
                {
                    label: 'Social Systems', 
                    description: 'Guilds, achievements, and community features',
                    value: 'social',
                    emoji: '🏛️'
                },
                {
                    label: 'Combat & RPG',
                    description: 'Battle system, skills, and character progression',
                    value: 'combat',
                    emoji: '⚔️'
                },
                {
                    label: 'Economy System',
                    description: 'Trading, crafting, and financial mechanics',
                    value: 'economy',
                    emoji: '💰'
                },
                {
                    label: 'Technical Information',
                    description: 'Bot performance, updates, and development',
                    value: 'technical',
                    emoji: '🔧'
                },
                {
                    label: 'Help & Support',
                    description: 'Getting help, reporting bugs, and feedback',
                    value: 'support',
                    emoji: '❓'
                }
            ]);

        const quickButtons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('info_commands')
                    .setLabel('📜 All Commands')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('info_tutorial')
                    .setLabel('🎓 Tutorial')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('info_changelog')
                    .setLabel('📝 Changelog')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('info_invite')
                    .setLabel('🔗 Invite Bot')
                    .setStyle(ButtonStyle.Link)
                    .setURL('https://discord.com/api/oauth2/authorize?client_id=YOUR_BOT_ID&permissions=8&scope=bot%20applications.commands')
            );

        await interaction.reply({ 
            embeds: [embed], 
            components: [
                new ActionRowBuilder().addComponents(sectionSelect),
                quickButtons
            ]
        });
    },

    async showDetailedSection(interaction, section) {
        const sectionData = this.getSectionData(section);
        
        const embed = new EmbedBuilder()
            .setColor(sectionData.color)
            .setTitle(`${sectionData.emoji} ${sectionData.title}`)
            .setDescription(sectionData.description)
            .setThumbnail(interaction.client.user.displayAvatarURL());

        sectionData.fields.forEach(field => {
            embed.addFields(field);
        });

        if (sectionData.footer) {
            embed.setFooter({ text: sectionData.footer });
        }

        const backButton = new ButtonBuilder()
            .setCustomId('info_back')
            .setLabel('← Back to Overview')
            .setStyle(ButtonStyle.Secondary);

        const actionButtons = sectionData.buttons || [];
        const components = [new ActionRowBuilder().addComponents(backButton, ...actionButtons)];

        await interaction.reply({ embeds: [embed], components });
    },

    getSectionData(section) {
        const sections = {
            features: {
                title: 'Game Features Overview',
                emoji: '🎮',
                color: '#E74C3C',
                description: '**Complete breakdown of all game mechanics and features**\n\nDiscover everything this RPG bot has to offer!',
                fields: [
                    {
                        name: '🗺️ Exploration & Adventure',
                        value: '• **Treasure Hunting**: Solve clues and find hidden treasures\n• **Dungeon Crawling**: Explore dangerous dungeons with friends\n• **World Map**: Navigate through 9+ unique locations\n• **Quests**: Complete epic adventures for rewards\n• **Expeditions**: Long-term exploration missions',
                        inline: false
                    },
                    {
                        name: '⚔️ Combat System',
                        value: '• **PvP Arena**: Battle other players for glory\n• **Monster Fighting**: Defeat creatures for loot\n• **Guild Wars**: Participate in large-scale battles\n• **Tournaments**: Compete in organized events\n• **Boss Raids**: Team up to defeat powerful enemies',
                        inline: false
                    },
                    {
                        name: '🛠️ Crafting & Creation',
                        value: '• **Item Crafting**: Create weapons, armor, and tools\n• **Alchemy**: Brew potions and magical elixirs\n• **Enchanting**: Add magical properties to items\n• **Blacksmithing**: Forge and upgrade equipment\n• **Cooking**: Prepare meals for stat bonuses',
                        inline: false
                    },
                    {
                        name: '🏠 Housing & Building',
                        value: '• **Personal Houses**: Build and customize your home\n• **Decorating**: Personalize your space with furniture\n• **Gardens**: Grow crops and magical plants\n• **Workshops**: Set up crafting stations\n• **Storage**: Organize your vast collection of items',
                        inline: false
                    }
                ],
                footer: 'Use /help to see all available commands in each category',
                buttons: [
                    new ButtonBuilder()
                        .setCustomId('features_demo')
                        .setLabel('🎮 Try Demo')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('features_guide')
                        .setLabel('📖 Feature Guide')
                        .setStyle(ButtonStyle.Secondary)
                ]
            },
            social: {
                title: 'Social Systems & Community',
                emoji: '🏛️',
                color: '#9B59B6',
                description: '**Connect with other players and build lasting friendships**\n\nJoin the thriving treasure hunter community!',
                fields: [
                    {
                        name: '🏛️ Guild System',
                        value: '• **Guild Creation**: Start your own treasure hunting guild\n• **Member Management**: Recruit and organize guild members\n• **Guild Quests**: Complete challenges together\n• **Guild Bank**: Share resources with guild members\n• **Guild Battles**: Fight other guilds for territory',
                        inline: false
                    },
                    {
                        name: '🏆 Achievement System',
                        value: '• **50+ Achievements**: Unlock rewards for various accomplishments\n• **Progress Tracking**: Monitor your advancement\n• **Rare Titles**: Earn prestigious titles and ranks\n• **Collection Badges**: Show off your collecting prowess\n• **Social Recognition**: Display achievements to friends',
                        inline: false
                    },
                    {
                        name: '📊 Leaderboards & Rankings',
                        value: '• **Global Rankings**: Compete with players worldwide\n• **Server Leaderboards**: Dominate your local server\n• **Category Leaders**: Excel in specific areas\n• **Seasonal Competitions**: Participate in timed events\n• **Hall of Fame**: Immortalize your greatest achievements',
                        inline: false
                    },
                    {
                        name: '🎉 Community Events',
                        value: '• **Weekly Tournaments**: Regular competitive events\n• **Seasonal Festivals**: Special holiday celebrations\n• **Community Challenges**: Server-wide objectives\n• **Developer Events**: Exclusive access to new content\n• **Player Spotlights**: Recognition for outstanding players',
                        inline: false
                    }
                ],
                footer: 'Join a guild today with /guild join to start your social adventure!',
                buttons: [
                    new ButtonBuilder()
                        .setCustomId('social_guilds')
                        .setLabel('🏛️ Find Guild')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('social_events')
                        .setLabel('🎉 View Events')
                        .setStyle(ButtonStyle.Success)
                ]
            },
            combat: {
                title: 'Combat & Character Progression',
                emoji: '⚔️',
                color: '#E67E22',
                description: '**Master the art of combat and develop your character**\n\nBecome the ultimate treasure hunting warrior!',
                fields: [
                    {
                        name: '📈 Character Development',
                        value: '• **Level System**: Gain experience and level up\n• **Skill Trees**: Specialize in different combat styles\n• **Attribute Points**: Customize your character build\n• **Class System**: Choose from multiple character classes\n• **Prestige System**: Reset for powerful bonuses',
                        inline: false
                    },
                    {
                        name: '⚔️ Combat Mechanics',
                        value: '• **Turn-Based Combat**: Strategic battle system\n• **Skill Combinations**: Chain abilities for bonus effects\n• **Equipment Effects**: Weapons and armor modify combat\n• **Status Effects**: Buffs, debuffs, and conditions\n• **Critical Hits**: Luck-based damage multipliers',
                        inline: false
                    },
                    {
                        name: '🛡️ Equipment System',
                        value: '• **Weapon Types**: Swords, axes, bows, and magical implements\n• **Armor Categories**: Light, medium, and heavy armor sets\n• **Accessory Slots**: Rings, amulets, and trinkets\n• **Set Bonuses**: Matching equipment provides extra benefits\n• **Legendary Items**: Rare equipment with unique properties',
                        inline: false
                    },
                    {
                        name: '🎯 Combat Modes',
                        value: '• **PvP Arena**: Ranked battles against other players\n• **PvE Dungeons**: Fight monsters and bosses\n• **Guild Wars**: Large-scale faction conflicts\n• **Training Grounds**: Practice without risk\n• **Survival Mode**: Endless waves of enemies',
                        inline: false
                    }
                ],
                footer: 'Start your combat journey with /battle to fight your first monster!',
                buttons: [
                    new ButtonBuilder()
                        .setCustomId('combat_arena')
                        .setLabel('⚔️ Enter Arena')
                        .setStyle(ButtonStyle.Danger),
                    new ButtonBuilder()
                        .setCustomId('combat_training')
                        .setLabel('🎯 Training Guide')
                        .setStyle(ButtonStyle.Secondary)
                ]
            },
            economy: {
                title: 'Economy & Trading System',
                emoji: '💰',
                color: '#F1C40F',
                description: '**Master the complex economy and become a trading mogul**\n\nBuild your wealth through smart investments and trading!',
                fields: [
                    {
                        name: '💰 Currency System',
                        value: '• **Multiple Currencies**: Coins, gems, guild points, and tokens\n• **Exchange Rates**: Dynamic currency conversion\n• **Banking System**: Save money and earn interest\n• **Loans**: Borrow money for large purchases\n• **Investment Options**: Put money to work for passive income',
                        inline: false
                    },
                    {
                        name: '🏪 Trading & Markets',
                        value: '• **Auction House**: Bid on rare items from other players\n• **Player Trading**: Direct trades with built-in security\n• **Market Fluctuations**: Dynamic pricing based on supply/demand\n• **Merchant NPCs**: Buy and sell to automated vendors\n• **Bulk Trading**: Efficient large-scale transactions',
                        inline: false
                    },
                    {
                        name: '📊 Economic Activities',
                        value: '• **Daily Work**: Consistent income through various jobs\n• **Treasure Hunting**: High-risk, high-reward adventures\n• **Crafting Profits**: Create items to sell for profit\n• **Resource Gathering**: Mine, fish, and forage for materials\n• **Business Ownership**: Run your own shops and services',
                        inline: false
                    },
                    {
                        name: '💎 Investment Opportunities',
                        value: '• **Stock Market**: Invest in virtual companies\n• **Real Estate**: Buy and develop property\n• **Commodity Trading**: Speculate on resource prices\n• **Guild Investments**: Pool resources for larger returns\n• **Risk Management**: Diversify your portfolio',
                        inline: false
                    }
                ],
                footer: 'Start building wealth with /daily and /work commands!',
                buttons: [
                    new ButtonBuilder()
                        .setCustomId('economy_market')
                        .setLabel('📊 View Market')
                        .setStyle(ButtonStyle.Success),
                    new ButtonBuilder()
                        .setCustomId('economy_guide')
                        .setLabel('💡 Trading Guide')
                        .setStyle(ButtonStyle.Primary)
                ]
            },
            technical: {
                title: 'Technical Information & Performance',
                emoji: '🔧',
                color: '#34495E',
                description: '**Bot performance statistics and technical details**\n\nTransparency about how the bot operates and performs.',
                fields: [
                    {
                        name: '⚡ Performance Metrics',
                        value: `• **Response Time**: < 100ms average\n• **Uptime**: 99.9% availability\n• **Commands Processed**: 1M+ per month\n• **Active Users**: Growing daily\n• **Servers**: Expanding community`,
                        inline: false
                    },
                    {
                        name: '🔧 Technical Stack',
                        value: '• **Runtime**: Node.js with Discord.js v14\n• **Database**: SQLite with optimization\n• **Hosting**: Replit cloud infrastructure\n• **APIs**: Multiple external integrations\n• **Security**: Encrypted data and secure protocols',
                        inline: false
                    },
                    {
                        name: '📱 Platform Support',
                        value: '• **Discord Desktop**: Full feature support\n• **Discord Mobile**: Optimized interface\n• **Discord Web**: Complete compatibility\n• **Screen Readers**: Accessibility features\n• **Multiple Languages**: Internationalization support',
                        inline: false
                    },
                    {
                        name: '🔄 Updates & Maintenance',
                        value: '• **Regular Updates**: New features every 2 weeks\n• **Bug Fixes**: Rapid response to issues\n• **Feature Requests**: Community-driven development\n• **Beta Testing**: Early access to new features\n• **Backwards Compatibility**: Maintained across versions',
                        inline: false
                    }
                ],
                footer: 'Bot version 2.1.0 | Last updated: Today',
                buttons: [
                    new ButtonBuilder()
                        .setCustomId('technical_status')
                        .setLabel('📊 Status Page')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('technical_changelog')
                        .setLabel('📝 Full Changelog')
                        .setStyle(ButtonStyle.Secondary)
                ]
            },
            support: {
                title: 'Help & Support Resources',
                emoji: '❓',
                color: '#2ECC71',
                description: '**Get help, report issues, and provide feedback**\n\nWe\'re here to help you have the best possible experience!',
                fields: [
                    {
                        name: '📚 Documentation & Guides',
                        value: '• **Command Reference**: Complete list of all commands\n• **Beginner Guide**: Step-by-step tutorial for new players\n• **Advanced Strategies**: Tips from experienced players\n• **FAQ**: Answers to frequently asked questions\n• **Video Tutorials**: Visual learning resources',
                        inline: false
                    },
                    {
                        name: '🐛 Bug Reports & Issues',
                        value: '• **Bug Report**: Use `/report bug` to report issues\n• **Feature Requests**: Suggest new features with `/suggest`\n• **Discord Server**: Join our support community\n• **Direct Contact**: Message the developers\n• **Status Updates**: Real-time issue tracking',
                        inline: false
                    },
                    {
                        name: '💬 Community Support',
                        value: '• **Discord Community**: Active player discussions\n• **Player Mentors**: Experienced players helping newcomers\n• **Guild Support**: Get help from guild members\n• **Community Events**: Regular Q&A sessions\n• **Player Contributions**: Community-created guides',
                        inline: false
                    },
                    {
                        name: '🔧 Self-Help Tools',
                        value: '• **Command Help**: Use `/help [command]` for specific info\n• **Settings**: Customize bot behavior with `/settings`\n• **Reset Options**: Fix issues with account resets\n• **Backup System**: Protect your progress automatically\n• **Export Data**: Download your game statistics',
                        inline: false
                    }
                ],
                footer: 'Need immediate help? Use /help or join our Discord support server!',
                buttons: [
                    new ButtonBuilder()
                        .setCustomId('support_discord')
                        .setLabel('💬 Support Server')
                        .setStyle(ButtonStyle.Link)
                        .setURL('https://discord.gg/your-support-server'),
                    new ButtonBuilder()
                        .setCustomId('support_guide')
                        .setLabel('📖 Quick Guide')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('support_contact')
                        .setLabel('📧 Contact Dev')
                        .setStyle(ButtonStyle.Secondary)
                ]
            }
        };

        return sections[section] || sections.features;
    }
};
