const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const config = require('../../config.js');
const db = require('../../database.js');

const spells = {
    fire: [
        { id: 'fireball', name: 'Fireball', cost: 10, damage: 25, description: 'Launch a blazing fireball', emoji: '🔥', level: 1 },
        { id: 'flame_burst', name: 'Flame Burst', cost: 15, damage: 35, description: 'Explosive fire damage', emoji: '💥', level: 3 },
        { id: 'inferno', name: 'Inferno', cost: 25, damage: 60, description: 'Devastating fire storm', emoji: '🌋', level: 8 }
    ],
    ice: [
        { id: 'ice_shard', name: 'Ice Shard', cost: 8, damage: 20, description: 'Sharp ice projectile', emoji: '🧊', level: 1 },
        { id: 'frost_nova', name: 'Frost Nova', cost: 18, damage: 40, description: 'Freezing area attack', emoji: '❄️', level: 5 },
        { id: 'blizzard', name: 'Blizzard', cost: 30, damage: 70, description: 'Massive ice storm', emoji: '🌨️', level: 10 }
    ],
    lightning: [
        { id: 'spark', name: 'Lightning Spark', cost: 6, damage: 18, description: 'Quick electric attack', emoji: '⚡', level: 1 },
        { id: 'thunder_bolt', name: 'Thunder Bolt', cost: 12, damage: 30, description: 'Powerful lightning strike', emoji: '🌩️', level: 4 },
        { id: 'chain_lightning', name: 'Chain Lightning', cost: 20, damage: 50, description: 'Lightning jumps between enemies', emoji: '⛈️', level: 7 }
    ],
    healing: [
        { id: 'heal', name: 'Healing Light', cost: 8, healing: 30, description: 'Restore health points', emoji: '✨', level: 1 },
        { id: 'greater_heal', name: 'Greater Heal', cost: 15, healing: 60, description: 'Major healing spell', emoji: '🌟', level: 5 },
        { id: 'divine_healing', name: 'Divine Healing', cost: 25, healing: 100, description: 'Complete restoration', emoji: '🕊️', level: 9 }
    ],
    utility: [
        { id: 'teleport', name: 'Teleport', cost: 12, description: 'Instantly move to safety', emoji: '🌀', level: 3 },
        { id: 'invisibility', name: 'Invisibility', cost: 18, description: 'Become invisible for 3 turns', emoji: '👻', level: 6 },
        { id: 'time_stop', name: 'Time Stop', cost: 35, description: 'Freeze time for extra actions', emoji: '⏰', level: 12 }
    ]
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('spell')
        .setDescription('🔮 Cast powerful magic spells in combat and exploration!')
        .addStringOption(option =>
            option.setName('action')
                .setDescription('Choose your magical action')
                .setRequired(false)
                .addChoices(
                    { name: '📚 View Spellbook', value: 'spellbook' },
                    { name: '🔮 Cast Spell', value: 'cast' },
                    { name: '⭐ Learn New Spell', value: 'learn' },
                    { name: '📊 Magic Statistics', value: 'stats' }
                ))
        .addStringOption(option =>
            option.setName('spell')
                .setDescription('Specific spell to cast')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('school')
                .setDescription('Magic school to focus on')
                .setRequired(false)
                .addChoices(
                    { name: '🔥 Fire Magic', value: 'fire' },
                    { name: '🧊 Ice Magic', value: 'ice' },
                    { name: '⚡ Lightning Magic', value: 'lightning' },
                    { name: '✨ Healing Magic', value: 'healing' },
                    { name: '🌀 Utility Magic', value: 'utility' }
                )),
    
    async execute(interaction) {
        const action = interaction.options?.getString('action') || 'spellbook';
        const spellName = interaction.options?.getString('spell');
        const school = interaction.options?.getString('school');
        const userId = interaction.user.id;
        
        switch (action) {
            case 'cast':
                await this.castSpell(interaction, spellName);
                break;
            case 'learn':
                await this.learnSpell(interaction, school);
                break;
            case 'stats':
                await this.showStats(interaction);
                break;
            default:
                await this.showSpellbook(interaction, school);
        }
    },
    
    async showSpellbook(interaction, school) {
        const userId = interaction.user.id;
        const userData = await db.getUser(userId) || {
            magic: { level: 1, mana: 50, maxMana: 50, knownSpells: [], experience: 0 },
            stats: { level: 1 }
        };
        
        const magicData = userData.magic || { level: 1, mana: 50, maxMana: 50, knownSpells: [] };
        const userLevel = userData.stats?.level || 1;
        const magicLevel = magicData.level || 1;
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.info)
            .setTitle('📚 Your Personal Spellbook')
            .setDescription(`**Mage Level ${magicLevel}** • Master of the Arcane Arts`)
            .setThumbnail(interaction.user.displayAvatarURL())
            .addFields([
                {
                    name: '🔮 Magical Power',
                    value: `💙 Mana: **${magicData.mana}/${magicData.maxMana}**\n⭐ Magic Level: **${magicLevel}**\n📖 Known Spells: **${magicData.knownSpells?.length || 0}**`,
                    inline: true
                },
                {
                    name: '🎯 Experience & Progress',
                    value: `✨ Magic XP: **${magicData.experience || 0}**\n📈 Next Level: **${magicLevel * 100}** XP\n🏆 Spells Cast: **${magicData.spellsCast || 0}**`,
                    inline: true
                },
                {
                    name: '🏫 Magic Schools Progress',
                    value: `🔥 Fire: **${magicData.fireLevel || 0}**\n🧊 Ice: **${magicData.iceLevel || 0}**\n⚡ Lightning: **${magicData.lightningLevel || 0}**\n✨ Healing: **${magicData.healingLevel || 0}**\n🌀 Utility: **${magicData.utilityLevel || 0}**`,
                    inline: true
                }
            ]);
            
        // Show spells for selected school or all schools
        if (school) {
            const schoolSpells = spells[school] || [];
            const knownSpells = magicData.knownSpells || [];
            
            let spellList = schoolSpells.map(spell => {
                const known = knownSpells.includes(spell.id);
                const canLearn = userLevel >= spell.level;
                const status = known ? '✅' : canLearn ? '📖' : '🔒';
                
                return `${status} ${spell.emoji} **${spell.name}** (Lvl ${spell.level})\n` +
                       `   💙 ${spell.cost} mana • ${spell.description}`;
            }).join('\n\n');
            
            if (!spellList) spellList = 'No spells available in this school.';
            
            embed.addFields([
                { 
                    name: `${this.getSchoolEmoji(school)} ${this.getSchoolName(school)} Spells`, 
                    value: spellList, 
                    inline: false 
                }
            ]);
        } else {
            // Show summary of all schools
            Object.keys(spells).forEach(schoolKey => {
                const schoolSpells = spells[schoolKey];
                const knownInSchool = (magicData.knownSpells || []).filter(spellId => 
                    schoolSpells.some(s => s.id === spellId)
                ).length;
                
                embed.addFields([{
                    name: `${this.getSchoolEmoji(schoolKey)} ${this.getSchoolName(schoolKey)}`,
                    value: `📖 Known: **${knownInSchool}/${schoolSpells.length}**\n🎯 Available Spells: ${schoolSpells.length}`,
                    inline: true
                }]);
            });
        }
        
        // Create school selection menu
        const schoolSelect = new StringSelectMenuBuilder()
            .setCustomId('spell_school_select')
            .setPlaceholder('🏫 Select a magic school to explore...')
            .addOptions([
                {
                    label: 'All Schools Overview',
                    description: 'View summary of all magic schools',
                    value: 'spell_all',
                    emoji: '📚'
                },
                {
                    label: 'Fire Magic',
                    description: 'Destructive flames and burning spells',
                    value: 'spell_fire',
                    emoji: '🔥'
                },
                {
                    label: 'Ice Magic',
                    description: 'Freezing attacks and frost control',
                    value: 'spell_ice',
                    emoji: '🧊'
                },
                {
                    label: 'Lightning Magic',
                    description: 'Electric strikes and storm power',
                    value: 'spell_lightning',
                    emoji: '⚡'
                },
                {
                    label: 'Healing Magic',
                    description: 'Restoration and protective spells',
                    value: 'spell_healing',
                    emoji: '✨'
                },
                {
                    label: 'Utility Magic',
                    description: 'Support and enhancement spells',
                    value: 'spell_utility',
                    emoji: '🌀'
                }
            ]);
            
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('spell_cast_menu')
                    .setLabel('🔮 Cast Spell')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('spell_learn_menu')
                    .setLabel('📖 Learn New Spell')
                    .setStyle(ButtonStyle.Success),
                new ButtonBuilder()
                    .setCustomId('spell_practice')
                    .setLabel('🎯 Practice Magic')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('mana_restore')
                    .setLabel('💙 Restore Mana')
                    .setStyle(ButtonStyle.Secondary)
            );
            
        const components = [
            new ActionRowBuilder().addComponents(schoolSelect),
            buttons
        ];
        
        embed.setFooter({ text: 'Select a school to view detailed spells or use the buttons below!' });
        
        await interaction.reply({ embeds: [embed], components });
    },
    
    async castSpell(interaction, spellName) {
        const userId = interaction.user.id;
        
        if (!spellName) {
            return interaction.reply({
                content: '❌ Please specify which spell to cast! Use `/spell spellbook` to see available spells.',
                ephemeral: true
            });
        }
        
        // Find the spell
        let spell = null;
        let school = null;
        
        for (const [schoolKey, schoolSpells] of Object.entries(spells)) {
            const found = schoolSpells.find(s => 
                s.id === spellName.toLowerCase() || 
                s.name.toLowerCase() === spellName.toLowerCase()
            );
            if (found) {
                spell = found;
                school = schoolKey;
                break;
            }
        }
        
        if (!spell) {
            return interaction.reply({
                content: '❌ Spell not found! Check your spellbook for available spells.',
                ephemeral: true
            });
        }
        
        const userData = await db.getUser(userId) || {
            magic: { level: 1, mana: 50, knownSpells: [] },
            stats: { level: 1, hp: 100 }
        };
        
        const magicData = userData.magic || { level: 1, mana: 50, knownSpells: [] };
        
        // Check if spell is known
        if (!magicData.knownSpells?.includes(spell.id)) {
            return interaction.reply({
                content: `❌ You don't know the spell "${spell.name}"! Use \`/spell learn\` to learn new spells.`,
                ephemeral: true
            });
        }
        
        // Check mana cost
        if (magicData.mana < spell.cost) {
            return interaction.reply({
                content: `❌ Insufficient mana! You need ${spell.cost} mana but only have ${magicData.mana}.`,
                ephemeral: true
            });
        }
        
        // Cast the spell
        magicData.mana -= spell.cost;
        magicData.spellsCast = (magicData.spellsCast || 0) + 1;
        magicData.experience = (magicData.experience || 0) + spell.cost;
        
        // Level up check
        const newLevel = Math.floor(magicData.experience / 100) + 1;
        const leveledUp = newLevel > magicData.level;
        if (leveledUp) {
            magicData.level = newLevel;
            magicData.maxMana = 50 + (newLevel - 1) * 10;
        }
        
        // Apply spell effects
        let effectText = '';
        if (spell.damage) {
            effectText = `💥 Dealt **${spell.damage}** damage!`;
        } else if (spell.healing) {
            const healAmount = Math.min(spell.healing, (userData.stats.maxHp || 100) - (userData.stats.hp || 100));
            userData.stats.hp = Math.min((userData.stats.hp || 100) + spell.healing, userData.stats.maxHp || 100);
            effectText = `💚 Restored **${healAmount}** health!`;
        } else {
            effectText = `✨ ${spell.description}`;
        }
        
        userData.magic = magicData;
        await db.setUser(userId, userData);
        
        const embed = new EmbedBuilder()
            .setColor(this.getSchoolColor(school))
            .setTitle(`${spell.emoji} Spell Cast: ${spell.name}`)
            .setDescription(`**${interaction.user.displayName}** channels magical energy...`)
            .addFields([
                { name: '🔮 Spell Effect', value: effectText, inline: false },
                { name: '💙 Mana Cost', value: `${spell.cost} mana used`, inline: true },
                { name: '💙 Remaining Mana', value: `${magicData.mana}/${magicData.maxMana}`, inline: true },
                { name: '⭐ Magic Level', value: `${magicData.level}`, inline: true }
            ])
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp();
            
        if (leveledUp) {
            embed.addFields([
                { name: '🎉 Level Up!', value: `Your magic level increased to **${magicData.level}**!\nMax mana increased to **${magicData.maxMana}**!`, inline: false }
            ]);
        }
        
        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('spell_cast_again')
                    .setLabel('🔮 Cast Another')
                    .setStyle(ButtonStyle.Primary),
                new ButtonBuilder()
                    .setCustomId('spell_spellbook')
                    .setLabel('📚 Spellbook')
                    .setStyle(ButtonStyle.Secondary),
                new ButtonBuilder()
                    .setCustomId('mana_restore')
                    .setLabel('💙 Restore Mana')
                    .setStyle(ButtonStyle.Success)
            );
            
        await interaction.reply({ embeds: [embed], components: [buttons] });
    },
    
    async learnSpell(interaction, school) {
        const userId = interaction.user.id;
        const userData = await db.getUser(userId) || {
            magic: { level: 1, knownSpells: [] },
            stats: { level: 1 },
            inventory: { coins: 0 }
        };
        
        const magicData = userData.magic || { level: 1, knownSpells: [] };
        const userLevel = userData.stats?.level || 1;
        const coins = userData.inventory?.coins || 0;
        
        if (!school) {
            return interaction.reply({
                content: '❌ Please specify which magic school to learn from!',
                ephemeral: true
            });
        }
        
        const schoolSpells = spells[school];
        if (!schoolSpells) {
            return interaction.reply({
                content: '❌ Invalid magic school!',
                ephemeral: true
            });
        }
        
        // Find spells the user can learn
        const availableSpells = schoolSpells.filter(spell => 
            !magicData.knownSpells?.includes(spell.id) && userLevel >= spell.level
        );
        
        if (availableSpells.length === 0) {
            return interaction.reply({
                content: `❌ No spells available to learn in ${this.getSchoolName(school)}! You may need to level up or already know all spells.`,
                ephemeral: true
            });
        }
        
        const embed = new EmbedBuilder()
            .setColor(this.getSchoolColor(school))
            .setTitle(`📖 Learn ${this.getSchoolName(school)} Spells`)
            .setDescription(`**Available spells to learn** • Cost: 100 coins per spell`)
            .addFields([
                {
                    name: '💰 Your Resources',
                    value: `💰 Coins: **${coins}**\n⭐ Level: **${userLevel}**\n🔮 Magic Level: **${magicData.level}**`,
                    inline: true
                }
            ]);
            
        availableSpells.forEach(spell => {
            const cost = 100;
            const canAfford = coins >= cost;
            
            embed.addFields([{
                name: `${spell.emoji} ${spell.name} ${canAfford ? '✅' : '❌'}`,
                value: `💙 **${spell.cost}** mana cost\n📝 ${spell.description}\n💰 **${cost}** coins to learn`,
                inline: true
            }]);
        });
        
        const spellSelect = new StringSelectMenuBuilder()
            .setCustomId('spell_learn_select')
            .setPlaceholder('📖 Select a spell to learn...')
            .addOptions(
                availableSpells.map(spell => ({
                    label: `${spell.name} - 100 coins`,
                    description: spell.description,
                    value: `learn_${spell.id}`,
                    emoji: spell.emoji
                }))
            );
            
        const components = [
            new ActionRowBuilder().addComponents(spellSelect)
        ];
        
        await interaction.reply({ embeds: [embed], components });
    },
    
    async showStats(interaction) {
        const userId = interaction.user.id;
        const userData = await db.getUser(userId) || { magic: {} };
        const magicData = userData.magic || {};
        
        const embed = new EmbedBuilder()
            .setColor(config.embedColors.profile)
            .setTitle(`🔮 ${interaction.user.displayName}'s Magic Statistics`)
            .setDescription('**Your magical achievements and mastery**')
            .addFields([
                {
                    name: '📊 Overall Magic Stats',
                    value: `⭐ Magic Level: **${magicData.level || 1}**\n🔮 Spells Cast: **${magicData.spellsCast || 0}**\n📖 Spells Known: **${magicData.knownSpells?.length || 0}**`,
                    inline: true
                },
                {
                    name: '💙 Mana Management',
                    value: `💙 Current Mana: **${magicData.mana || 50}/${magicData.maxMana || 50}**\n✨ Total XP: **${magicData.experience || 0}**\n🎯 Efficiency: **${Math.round(((magicData.experience || 0) / Math.max(magicData.spellsCast || 1, 1)) * 100) / 100}** XP/cast`,
                    inline: true
                },
                {
                    name: '🏫 School Mastery',
                    value: `🔥 Fire Spells: **${this.countSchoolSpells(magicData.knownSpells, 'fire')}**\n🧊 Ice Spells: **${this.countSchoolSpells(magicData.knownSpells, 'ice')}**\n⚡ Lightning Spells: **${this.countSchoolSpells(magicData.knownSpells, 'lightning')}**\n✨ Healing Spells: **${this.countSchoolSpells(magicData.knownSpells, 'healing')}**\n🌀 Utility Spells: **${this.countSchoolSpells(magicData.knownSpells, 'utility')}**`,
                    inline: false
                }
            ])
            .setThumbnail(interaction.user.displayAvatarURL())
            .setTimestamp();
            
        await interaction.reply({ embeds: [embed] });
    },
    
    getSchoolName(school) {
        const names = {
            fire: 'Fire Magic',
            ice: 'Ice Magic',
            lightning: 'Lightning Magic',
            healing: 'Healing Magic',
            utility: 'Utility Magic'
        };
        return names[school] || 'Unknown School';
    },
    
    getSchoolEmoji(school) {
        const emojis = {
            fire: '🔥',
            ice: '🧊',
            lightning: '⚡',
            healing: '✨',
            utility: '🌀'
        };
        return emojis[school] || '🔮';
    },
    
    getSchoolColor(school) {
        const colors = {
            fire: 0xFF4500,
            ice: 0x87CEEB,
            lightning: 0xFFD700,
            healing: 0x98FB98,
            utility: 0xDDA0DD
        };
        return colors[school] || 0x9370DB;
    },
    
    countSchoolSpells(knownSpells, school) {
        if (!knownSpells) return 0;
        const schoolSpells = spells[school] || [];
        return knownSpells.filter(spellId => 
            schoolSpells.some(s => s.id === spellId)
        ).length;
    }
};