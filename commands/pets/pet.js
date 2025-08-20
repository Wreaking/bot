const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const availablePets = [
    { id: 'wolf', name: 'Loyal Wolf', emoji: '🐺', rarity: 'common', cost: 1000, abilities: ['Finder: +20% coin drops', 'Guardian: +5 defense'], type: 'companion' },
    { id: 'cat', name: 'Shadow Cat', emoji: '🐱', rarity: 'common', cost: 800, abilities: ['Stealth: +10% crit chance', 'Agile: +3 speed'], type: 'companion' },
    { id: 'owl', name: 'Wise Owl', emoji: '🦉', rarity: 'uncommon', cost: 1500, abilities: ['Wisdom: +25% XP gain', 'Night Vision: Reveals secrets'], type: 'scholar' },
    { id: 'phoenix', name: 'Phoenix Chick', emoji: '🔥', rarity: 'rare', cost: 5000, abilities: ['Rebirth: Revive once per day', 'Fire Aura: +10 fire damage'], type: 'magical' },
    { id: 'dragon', name: 'Baby Dragon', emoji: '🐉', rarity: 'legendary', cost: 10000, abilities: ['Dragon Breath: Powerful attack', 'Treasure Sense: Find rare items'], type: 'dragon' },
    { id: 'unicorn', name: 'Unicorn', emoji: '🦄', rarity: 'mythical', cost: 15000, abilities: ['Healing: Restore HP over time', 'Pure Magic: +50% mana regen'], type: 'magical' },
    { id: 'fairy', name: 'Pocket Fairy', emoji: '🧚', rarity: 'rare', cost: 3000, abilities: ['Lucky Charm: +15% treasure chance', 'Fairy Dust: Random buffs'], type: 'magical' },
    { id: 'golem', name: 'Mini Golem', emoji: '🗿', rarity: 'uncommon', cost: 2000, abilities: ['Rock Solid: +15 defense', 'Mining: Find gems'], type: 'construct' }
];

module.exports = {
    data: new SlashCommandBuilder()
        .setName('pet')
        .setDescription('🐾 Manage your loyal animal companions!')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Choose pet action')
                .setRequired(false)
                .addChoices(
                    { name: '🐾 View My Pets', value: 'view' },
                    { name: '🛒 Adopt New Pet', value: 'adopt' },
                    { name: '🍖 Feed Pet', value: 'feed' },
                    { name: '🎮 Play with Pet', value: 'play' },
                    { name: '🎯 Train Pet', value: 'train' },
                    { name: '💤 Pet Status', value: 'status' }
                ))
        .addStringOption(option =>
            option.setName('pet')
                .setDescription('Select specific pet')
                .setRequired(false)),
    
    async execute(interaction) {
        const action = interaction.options?.getString('action') || 'view';
        const petName = interaction.options?.getString('pet');
        const userId = interaction.user.id;
        
        switch (action) {
            case 'adopt':
                await this.showAdoption(interaction);
                break;
            case 'feed':
                await this.feedPet(interaction, petName);
                break;
            case 'play':
                await this.playWithPet(interaction, petName);
                break;
            case 'train':
                await this.trainPet(interaction, petName);
                break;
            case 'status':
                await this.showPetStatus(interaction, petName);
                break;
            default:
                await this.viewPets(interaction);
        }
    },
    
    async viewPets(interaction) {
        const userId = interaction.user.id;
        const userData = await db.getPlayer(userId) || {
            pets: [],
            inventory: { coins: 0 }
        };
        
        const pets = userData.pets || [];
        const activePet = pets.find(pet => pet.active) || pets[0];
        
        if (pets.length === 0) {
            const embed = new EmbedBuilder()
                .setColor(config.embedColors.info)
                .setTitle('🐾 Your Pet Collection')
                .setDescription('**You don\'t have any pets yet!**\n\nPets are loyal companions that help you in your adventures. They can find extra treasure, assist in battles, and provide various bonuses.')
                .addFields([
                    {
                        name: '🌟 Benefits of Pets',
                        value: '• Find extra coins and items\n• Provide combat assistance\n• Grant special abilities\n• Loyal companionship',
                        inline: true
                    },
                    {
                        name: '💰 Adoption Costs',
                        value: '• Common Pets: 800-1000 coins\n• Rare Pets: 3000-5000 coins\n• Legendary: 10000+ coins',
                        inline: true
                    },
                    {
                        name: '🎮 Pet Care',
                        value: '• Feed regularly to keep happy\n• Play to increase loyalty\n• Train to improve abilities\n• Take on adventures together',
                        inline: true
                    }
                ])
                .setFooter({ text: 'Use the Adopt button below to get your first pet!' });
                
            const buttons = new ActionRowBuilder()
                .addComponents(
                    new ButtonBuilder()
                        .setCustomId('pet_adopt_menu')
                        .setLabel('🛒 Adopt a Pet')
                        .setStyle(ButtonStyle.Primary),
                    new ButtonBuilder()
                        .setCustomId('pet_guide')
                        .setLabel('📖 Pet Care Guide')
                        .setStyle(ButtonStyle.Secondary)
                );
                
            return interaction.reply({ embeds: [embed], components: [buttons] });
        }
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.profile)
            .setTitle(`🐾 ${interaction.user.displayName}'s Pet Collection`)
            .setDescription(`**${pets.length} loyal companion${pets.length > 1 ? 's' : ''}** ready for adventure!`)
            .setThumbnail(interaction.user.displayAvatarURL());
            
        if (activePet) {
            embed.addFields([
                {
                    name: `${activePet.emoji} Active Companion: ${activePet.name}`,
                    value: `🎭 **${activePet.rarity}** ${activePet.type} pet\n` +
                           `❤️ Happiness: **${activePet.happiness || 50}/100**\n` +
                           `🤝 Loyalty: **${activePet.loyalty || 0}/100**\n` +
                           `⭐ Level: **${activePet.level || 1}**`,
                    inline: true
                },
                {
                    name: '🌟 Abilities',
                    value: this.getPetAbilities(activePet).join('\n') || 'No special abilities yet',
                    inline: true
                },
                {
                    name: '📊 Status',
                    value: `🍖 Hunger: **${100 - (activePet.hunger || 0)}/100**\n` +
                           `😊 Mood: **${this.getPetMood(activePet)}**\n` +
                           `🎯 Ready for: **${this.getPetReadiness(activePet)}**`,
                    inline: true
                }
            ]);
        }
        
        // Show all pets
        const petList = pets.map((pet, index) => {
            const activeIcon = pet.active ? '⭐' : '';
            const moodIcon = this.getMoodEmoji(pet);
            return `${activeIcon}${pet.emoji} **${pet.name}** ${moodIcon}\n` +
                   `   Level ${pet.level || 1} • ${pet.rarity} ${pet.type}`;
        }).join('\n\n');
        
        if (pets.length > 1) {
            embed.addFields([
                { name: `🏠 All Pets (${pets.length})`, value: petList, inline: false }
            ]);
        }
        
        const petSelect = new StringSelectMenuBuilder()
            .setCustomId('pet_select')
            .setPlaceholder('🐾 Select a pet to interact with...')
            .addOptions(
                pets.map((pet, index) => ({
                    label: `${pet.name} (Level ${pet.level || 1})`,
                    description: `${pet.rarity} ${pet.type} • ${this.getPetMood(pet)}`,
                    value: `pet_${index}`,
                    emoji: pet.emoji
                }))
            );
            
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('pet_feed_active')
                    .setLabel('🍖 Feed Active Pet')
                    .setStyle(ButtonStyle.Primary)
                    .setDisabled(!activePet),
                new ButtonBuilder()
                    .setCustomId('pet_play_active')
                    .setLabel('🎮 Play Together')
                    .setStyle(ButtonStyle.Success)
                    .setDisabled(!activePet),
                new ButtonBuilder()
                    .setCustomId('pet_train_active')
                    .setLabel('🎯 Train Pet')
                    .setStyle(ButtonStyle.Secondary)
                    .setDisabled(!activePet),
                new ButtonBuilder()
                    .setCustomId('pet_adopt_menu')
                    .setLabel('🛒 Adopt More')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        const components = [
            new ActionRowBuilder().addComponents(petSelect),
            buttons
        ];
        
        await interaction.reply({ embeds: [embed], components });
    },
    
    async showAdoption(interaction) {
        const userId = interaction.user.id;
        const userData = await db.getPlayer(userId) || { inventory: { coins: 0 }, pets: [] };
        const coins = userData.inventory?.coins || 0;
        const ownedPetIds = (userData.pets || []).map(pet => pet.id);
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.shop)
            .setTitle('🏪 Pet Adoption Center')
            .setDescription('**Welcome to the Pet Adoption Center!**\nFind your perfect companion for adventures ahead.')
            .addFields([
                {
                    name: '💰 Your Coins',
                    value: `${coins} coins available`,
                    inline: true
                },
                {
                    name: '🐾 Current Pets',
                    value: `${userData.pets?.length || 0} companions`,
                    inline: true
                },
                {
                    name: '📝 Adoption Info',
                    value: 'Each pet has unique abilities and personalities. Choose wisely!',
                    inline: true
                }
            ]);
            
        // Group pets by rarity
        const rarityGroups = {
            common: availablePets.filter(pet => pet.rarity === 'common'),
            uncommon: availablePets.filter(pet => pet.rarity === 'uncommon'),
            rare: availablePets.filter(pet => pet.rarity === 'rare'),
            legendary: availablePets.filter(pet => pet.rarity === 'legendary'),
            mythical: availablePets.filter(pet => pet.rarity === 'mythical')
        };
        
        Object.entries(rarityGroups).forEach(([rarity, pets]) => {
            if (pets.length === 0) return;
            
            const petList = pets.map(pet => {
                const owned = ownedPetIds.includes(pet.id) ? '✅ Owned' : coins >= pet.cost ? '💰 Available' : '❌ Too Expensive';
                return `${pet.emoji} **${pet.name}** - ${pet.cost} coins ${owned}\n` +
                       `   ${pet.abilities.slice(0, 2).join(' • ')}`;
            }).join('\n\n');
            
            embed.addFields([{
                name: `${this.getRarityEmoji(rarity)} ${rarity.toUpperCase()} PETS`,
                value: petList,
                inline: false
            }]);
        });
        
        const petSelect = new StringSelectMenuBuilder()
            .setCustomId('pet_adopt_select')
            .setPlaceholder('🐾 Select a pet to adopt...')
            .addOptions(
                availablePets.filter(pet => !ownedPetIds.includes(pet.id)).map(pet => ({
                    label: `${pet.name} - ${pet.cost} coins`,
                    description: `${pet.rarity} ${pet.type} • ${pet.abilities[0]}`,
                    value: `adopt_${pet.id}`,
                    emoji: pet.emoji
                }))
            );
            
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('pet_adoption_info')
                    .setLabel('📖 Adoption Guide')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('pet_care_tips')
                    .setLabel('💡 Care Tips')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('daily_claim')
                    .setLabel('💰 Earn Coins')
                    .setStyle(ButtonStyle.Success)
            );
            
        const components = [
            new ActionRowBuilder().addComponents(petSelect),
            buttons
        ];
        
        await interaction.reply({ embeds: [embed], components });
    },
    
    async feedPet(interaction, petName) {
        const userId = interaction.user.id;
        const userData = await db.getPlayer(userId) || { pets: [], inventory: { coins: 0 } };
        
        if (!userData.pets || userData.pets.length === 0) {
            return interaction.reply({
                content: '❌ You don\'t have any pets to feed! Adopt one first.',
                ephemeral: true
            });
        }
        
        let pet = userData.pets.find(p => p.active) || userData.pets[0];
        
        if (petName) {
            const namedPet = userData.pets.find(p => p.name.toLowerCase() === petName.toLowerCase());
            if (namedPet) pet = namedPet;
        }
        
        const feedCost = 25;
        if ((userData.inventory.coins || 0) < feedCost) {
            return interaction.reply({
                content: `❌ You need ${feedCost} coins to buy pet food!`,
                ephemeral: true
            });
        }
        
        // Feed the pet
        userData.inventory.coins -= feedCost;
        pet.hunger = Math.max(0, (pet.hunger || 50) - 30);
        pet.happiness = Math.min(100, (pet.happiness || 50) + 20);
        pet.lastFed = Date.now();
        
        // Check for happiness milestone
        let bonusText = '';
        if (pet.happiness >= 80 && !pet.happyBonus) {
            pet.happyBonus = true;
            bonusText = '\n🎉 Your pet is very happy and will find extra treasures!';
        }
        
        await db.setUser(userId, userData);
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.success)
            .setTitle(`🍖 Fed ${pet.name}!`)
            .setDescription(`**${pet.name}** eagerly devours the delicious food!${bonusText}`)
            .addFields([
                { name: '🍖 Hunger', value: `${100 - pet.hunger}/100`, inline: true },
                { name: '😊 Happiness', value: `${pet.happiness}/100`, inline: true },
                { name: '💰 Cost', value: `${feedCost} coins`, inline: true }
            ])
            .setThumbnail('https://cdn.discordapp.com/emojis/742747860554686485.png')
            .setTimestamp();
            
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('pet_play_active')
                    .setLabel('🎮 Play Together')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('pet_view')
                    .setLabel('🐾 View Pets')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        await interaction.reply({ embeds: [embed], components: [buttons] });
    },
    
    async playWithPet(interaction, petName) {
        const userId = interaction.user.id;
        const userData = await db.getPlayer(userId) || { pets: [] };
        
        if (!userData.pets || userData.pets.length === 0) {
            return interaction.reply({
                content: '❌ You don\'t have any pets to play with! Adopt one first.',
                ephemeral: true
            });
        }
        
        let pet = userData.pets.find(p => p.active) || userData.pets[0];
        
        if (petName) {
            const namedPet = userData.pets.find(p => p.name.toLowerCase() === petName.toLowerCase());
            if (namedPet) pet = namedPet;
        }
        
        // Check if recently played
        const lastPlayed = pet.lastPlayed || 0;
        const timeSincePlay = Date.now() - lastPlayed;
        const playooldown = 300000; // 5 minutes
        
        if (timeSincePlay < playCooldown) {
            const timeLeft = Math.ceil((playCooldown - timeSincePlay) / 60000);
            return interaction.reply({
                content: `⏰ ${pet.name} is tired from playing! Wait ${timeLeft} more minutes.`,
                ephemeral: true
            });
        }
        
        // Play with pet
        pet.loyalty = Math.min(100, (pet.loyalty || 0) + 15);
        pet.happiness = Math.min(100, (pet.happiness || 50) + 10);
        pet.lastPlayed = Date.now();
        
        // Random play outcomes
        const playOutcomes = [
            { text: 'You play fetch and your pet brings back a shiny coin!', reward: 'coins', amount: 50 },
            { text: 'Your pet shows you a hidden treasure spot!', reward: 'coins', amount: 100 },
            { text: 'Playing together strengthens your bond!', reward: 'loyalty', amount: 5 },
            { text: 'Your pet learns a new trick!', reward: 'happiness', amount: 10 },
            { text: 'You discover your pet\'s hidden talent!', reward: 'experience', amount: 25 }
        ];
        
        const outcome = playOutcomes[Math.floor(Math.random() * playOutcomes.length)];
        
        // Apply outcome
        if (outcome.reward === 'coins') {
            userData.inventory.coins = (userData.inventory.coins || 0) + outcome.amount;
        } else if (outcome.reward === 'loyalty') {
            pet.loyalty = Math.min(100, pet.loyalty + outcome.amount);
        }
        
        await db.setUser(userId, userData);
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.success)
            .setTitle(`🎮 Playing with ${pet.name}!`)
            .setDescription(`**${outcome.text}**`)
            .addFields([
                { name: '🤝 Loyalty', value: `${pet.loyalty}/100`, inline: true },
                { name: '😊 Happiness', value: `${pet.happiness}/100`, inline: true },
                { name: '🎁 Play Bonus', value: outcome.reward === 'coins' ? `+${outcome.amount} coins` : `+${outcome.amount} ${outcome.reward}`, inline: true }
            ])
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp();
            
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('pet_train_active')
                    .setLabel('🎯 Train Pet')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('pet_feed_active')
                    .setLabel('🍖 Feed Pet')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('pet_view')
                    .setLabel('🐾 View All Pets')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        await interaction.reply({ embeds: [embed], components: [buttons] });
    },
    
    getPetAbilities(pet) {
        const basePet = availablePets.find(p => p.id === pet.id);
        if (!basePet) return ['No abilities'];
        
        return basePet.abilities.map(ability => `• ${ability}`);
    },
    
    getPetMood(pet) {
        const happiness = pet.happiness || 50;
        if (happiness >= 80) return 'Ecstatic';
        if (happiness >= 60) return 'Happy';
        if (happiness >= 40) return 'Content';
        if (happiness >= 20) return 'Sad';
        return 'Depressed';
    },
    
    getMoodEmoji(pet) {
        const happiness = pet.happiness || 50;
        if (happiness >= 80) return '😍';
        if (happiness >= 60) return '😊';
        if (happiness >= 40) return '😐';
        if (happiness >= 20) return '😢';
        return '😰';
    },
    
    getPetReadiness(pet) {
        const happiness = pet.happiness || 50;
        const loyalty = pet.loyalty || 0;
        
        if (happiness >= 70 && loyalty >= 50) return 'Adventure';
        if (happiness >= 50) return 'Training';
        if (happiness >= 30) return 'Playing';
        return 'Needs Care';
    },
    
    getRarityEmoji(rarity) {
        const emojis = {
            common: '⚪',
            uncommon: '🟢',
            rare: '🔵',
            legendary: '🟣',
            mythical: '🌟'
        };
        return emojis[rarity] || '⚪';
    }
};