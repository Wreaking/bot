const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

const ENCHANTMENTS = {
    sharpness: {
        name: '⚔️ Sharpness',
        description: 'Increases weapon damage',
        type: 'weapon',
        levels: 5,
        materials: { magic_dust: 2, gems: 1 },
        effects: { damage: 0.15 }
    },
    protection: {
        name: '🛡️ Protection',
        description: 'Reduces incoming damage',
        type: 'armor',
        levels: 4,
        materials: { magic_dust: 2, iron_ore: 3 },
        effects: { defense: 0.10 }
    },
    fire_aspect: {
        name: '🔥 Fire Aspect',
        description: 'Weapons deal fire damage over time',
        type: 'weapon',
        levels: 3,
        materials: { fire_crystal: 1, magic_dust: 3 },
        effects: { fire_damage: 0.20 }
    },
    fortune: {
        name: '💎 Fortune',
        description: 'Increases resource gathering yields',
        type: 'tool',
        levels: 4,
        materials: { lucky_clover: 1, gems: 2 },
        effects: { yield_bonus: 0.25 }
    },
    unbreaking: {
        name: '🔧 Unbreaking',
        description: 'Reduces durability loss',
        type: 'all',
        levels: 3,
        materials: { reinforced_metal: 2, magic_dust: 1 },
        effects: { durability_bonus: 0.33 }
    },
    mending: {
        name: '✨ Mending',
        description: 'Repairs item using experience',
        type: 'all',
        levels: 1,
        materials: { phoenix_feather: 1, life_essence: 2 },
        effects: { auto_repair: true }
    },
    frost_walker: {
        name: '❄️ Frost Walker',
        description: 'Creates ice bridges over water',
        type: 'boots',
        levels: 2,
        materials: { ice_crystal: 2, water_essence: 1 },
        effects: { ice_walk: true }
    },
    soul_bound: {
        name: '👻 Soul Bound',
        description: 'Item stays with you after death',
        type: 'all',
        levels: 1,
        materials: { soul_gem: 1, dark_essence: 3 },
        effects: { death_protection: true }
    }
};

const ENCHANTING_MATERIALS = {
    magic_dust: { name: '✨ Magic Dust', rarity: 'common' },
    gems: { name: '💎 Gems', rarity: 'uncommon' },
    fire_crystal: { name: '🔥 Fire Crystal', rarity: 'rare' },
    ice_crystal: { name: '❄️ Ice Crystal', rarity: 'rare' },
    lucky_clover: { name: '🍀 Lucky Clover', rarity: 'uncommon' },
    reinforced_metal: { name: '🔩 Reinforced Metal', rarity: 'common' },
    phoenix_feather: { name: '🪶 Phoenix Feather', rarity: 'legendary' },
    life_essence: { name: '💚 Life Essence', rarity: 'rare' },
    water_essence: { name: '💧 Water Essence', rarity: 'uncommon' },
    soul_gem: { name: '💀 Soul Gem', rarity: 'legendary' },
    dark_essence: { name: '🌑 Dark Essence', rarity: 'rare' }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('enchant')
        .setDescription('✨ Enchant your equipment with magical properties')
        .addStringOption(option =>
            option.setName('item')
                .setDescription('Item to enchant')
                .setRequired(false))
        .addStringOption(option =>
            option.setName('enchantment')
                .setDescription('Enchantment to apply')
                .setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const userId = interaction.user.id;
            let userData = await db.getUserData(userId) || {};

            // Initialize enchanting data
            if (!userData.enchanting) {
                userData.enchanting = {
                    level: 1,
                    experience: 0,
                    discovered_enchantments: ['sharpness', 'protection'],
                    successful_enchants: 0,
                    failed_enchants: 0
                };
            }

            const item = interaction.options.getString('item');
            const enchantment = interaction.options.getString('enchantment');

            if (!item && !enchantment) {
                await this.showEnchantingMenu(interaction, userData);
            } else if (item && enchantment) {
                await this.performEnchantment(interaction, userData, item, enchantment);
            } else {
                await this.showItemSelection(interaction, userData, item, enchantment);
            }

        } catch (error) {
            console.error('Enchanting command error:', error);
            await interaction.editReply({
                content: '❌ An error occurred while enchanting. Please try again.',
                ephemeral: true
            });
        }
    },

    async showEnchantingMenu(interaction, userData) {
        const embed = new EmbedBuilder()
            .setColor('#9932CC')
            .setTitle('✨ Enchantment Workshop')
            .setDescription('╔═══════════════════════════════════════╗\n║        **MAGICAL ENCHANTMENTS**        ║\n╚═══════════════════════════════════════╝\n\n*Channel mystical energies to enhance your equipment*')
            .setThumbnail('https://cdn.discordapp.com/emojis/✨.png')
            .addFields(
                {
                    name: '🧙 **Enchanter Stats**',
                    value: `**Level:** ${userData.enchanting.level}\n**Experience:** ${userData.enchanting.experience}\n**Success Rate:** ${this.calculateSuccessRate(userData)}%`,
                    inline: true
                },
                {
                    name: '📊 **Statistics**',
                    value: `**Successful:** ${userData.enchanting.successful_enchants}\n**Failed:** ${userData.enchanting.failed_enchants}\n**Discovered:** ${userData.enchanting.discovered_enchantments.length}/${Object.keys(ENCHANTMENTS).length}`,
                    inline: true
                },
                {
                    name: '🎒 **Materials Available**',
                    value: this.formatMaterialsInventory(userData.inventory || {}),
                    inline: true
                }
            );

        // Show discovered enchantments
        const knownEnchantments = userData.enchanting.discovered_enchantments
            .map(key => {
                const enchant = ENCHANTMENTS[key];
                return `${enchant.name} *(${enchant.type})*`;
            })
            .join('\n');

        embed.addFields({
            name: '📚 **Known Enchantments**',
            value: knownEnchantments || 'No enchantments discovered yet...',
            inline: false
        });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('enchant_item')
                    .setLabel('Enchant Item')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('⚡'),
                new ButtonBuilder()
                    .setCustomId('enchant_research')
                    .setLabel('Research New')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔬'),
                new ButtonBuilder()
                    .setCustomId('enchant_materials')
                    .setLabel('Material Guide')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('📖')
            );

        const enchantmentSelect = new StringSelectMenuBuilder()
            .setCustomId('enchantment_info')
            .setPlaceholder('🔍 View enchantment details')
            .addOptions(
                userData.enchanting.discovered_enchantments.map(key => {
                    const enchant = ENCHANTMENTS[key];
                    return {
                        label: enchant.name,
                        value: key,
                        description: `${enchant.description} (${enchant.type})`,
                        emoji: enchant.name.split(' ')[0]
                    };
                })
            );

        const selectRow = new ActionRowBuilder().addComponents(enchantmentSelect);
        const components = userData.enchanting.discovered_enchantments.length > 0 ? 
            [selectRow, buttons] : [buttons];

        await interaction.editReply({
            embeds: [embed],
            components
        });
    },

    async performEnchantment(interaction, userData, itemName, enchantmentKey) {
        const enchantment = ENCHANTMENTS[enchantmentKey];

        if (!enchantment) {
            await interaction.editReply({
                content: '❌ Invalid enchantment selected.',
                ephemeral: true
            });
            return;
        }

        // Check if user knows this enchantment
        if (!userData.enchanting.discovered_enchantments.includes(enchantmentKey)) {
            await interaction.editReply({
                content: '❌ You haven\'t discovered this enchantment yet! Use research to unlock it.',
                ephemeral: true
            });
            return;
        }

        // Check if user has the item
        if (!userData.inventory || !userData.inventory[itemName]) {
            await interaction.editReply({
                content: `❌ You don't have ${itemName} in your inventory.`,
                ephemeral: true
            });
            return;
        }

        // Check materials
        const hasAllMaterials = Object.entries(enchantment.materials).every(([material, amount]) => {
            return (userData.inventory[material] || 0) >= amount;
        });

        if (!hasAllMaterials) {
            const missingMaterials = Object.entries(enchantment.materials)
                .filter(([material, amount]) => (userData.inventory[material] || 0) < amount)
                .map(([material, amount]) => `${ENCHANTING_MATERIALS[material].name} (${amount})`)
                .join(', ');

            await interaction.editReply({
                content: `❌ Missing materials: ${missingMaterials}`,
                ephemeral: true
            });
            return;
        }

        // Calculate success rate
        const successRate = this.calculateSuccessRate(userData);
        const success = Math.random() * 100 < successRate;

        // Create suspenseful embed
        const enchantingEmbed = new EmbedBuilder()
            .setColor('#9932CC')
            .setTitle('⚡ Enchantment in Progress...')
            .setDescription('*Mystical energies swirl around your item...*\n\n🌟 Channeling magical forces...\n⚡ Binding enchantment to equipment...\n✨ Finalizing magical properties...')
            .addFields({
                name: '🎯 **Enchantment Details**',
                value: `**Item:** ${itemName}\n**Enchantment:** ${enchantment.name}\n**Success Rate:** ${successRate}%`,
                inline: false
            });

        await interaction.editReply({ embeds: [enchantingEmbed] });

        // Wait for dramatic effect
        await new Promise(resolve => setTimeout(resolve, 3000));

        // Process result
        if (success) {
            // Success - consume materials and apply enchantment
            Object.entries(enchantment.materials).forEach(([material, amount]) => {
                userData.inventory[material] -= amount;
            });

            // Add enchanted item
            const enchantedItemName = `${itemName}_${enchantmentKey}`;
            userData.inventory[enchantedItemName] = (userData.inventory[enchantedItemName] || 0) + 1;
            userData.inventory[itemName] -= 1;

            userData.enchanting.successful_enchants++;
            userData.enchanting.experience += 50;

            const successEmbed = new EmbedBuilder()
                .setColor('#00FF00')
                .setTitle('🎉 Enchantment Successful!')
                .setDescription(`✨ **${enchantment.name}** has been successfully applied to your **${itemName}**!`)
                .addFields(
                    {
                        name: '🆕 **Enhanced Item**',
                        value: `**${enchantedItemName.replace(/_/g, ' ')}**\n${enchantment.description}`,
                        inline: true
                    },
                    {
                        name: '📈 **Bonuses Applied**',
                        value: this.formatEnchantmentEffects(enchantment),
                        inline: true
                    },
                    {
                        name: '💫 **Experience Gained**',
                        value: `+50 XP\nTotal: ${userData.enchanting.experience}`,
                        inline: true
                    }
                );

            await interaction.editReply({ embeds: [successEmbed] });

        } else {
            // Failure - consume some materials
            Object.entries(enchantment.materials).forEach(([material, amount]) => {
                const consumed = Math.ceil(amount * 0.3); // Consume 30% on failure
                userData.inventory[material] -= consumed;
            });

            userData.enchanting.failed_enchants++;
            userData.enchanting.experience += 10; // Small consolation XP

            const failureEmbed = new EmbedBuilder()
                .setColor('#FF0000')
                .setTitle('💥 Enchantment Failed!')
                .setDescription('💔 The magical energies were too unstable and the enchantment failed!')
                .addFields(
                    {
                        name: '📉 **Consequence**',
                        value: `Some materials were consumed in the process.\nYour **${itemName}** remains unchanged.`,
                        inline: false
                    },
                    {
                        name: '📚 **Learning Experience**',
                        value: `+10 XP (Failure teaches lessons too!)\nTotal: ${userData.enchanting.experience}`,
                        inline: false
                    }
                );

            await interaction.editReply({ embeds: [failureEmbed] });
        }

        // Check for level up
        const newLevel = Math.floor(userData.enchanting.experience / 100) + 1;
        if (newLevel > userData.enchanting.level) {
            userData.enchanting.level = newLevel;
            // Potentially unlock new enchantments
            this.unlockEnchantments(userData);
        }

        await db.updateUser(interaction.user.id, userData);
    },

    async showItemSelection(interaction, userData, item, enchantment) {
        // This function would handle displaying items or enchantments if only one was provided
        // For now, if both are missing or one is missing but the other isn't meant to be used alone,
        // we default to the main menu.
        if (!item && enchantment) {
            await interaction.editReply({ content: 'Please specify an item to enchant.', ephemeral: true });
        } else if (item && !enchantment) {
            await interaction.editReply({ content: 'Please specify an enchantment to apply.', ephemeral: true });
        } else {
             await this.showEnchantingMenu(interaction, userData);
        }
    },

    calculateSuccessRate(userData) {
        const baseRate = 60;
        const levelBonus = userData.enchanting.level * 3;
        const experienceBonus = Math.floor(userData.enchanting.experience / 50);
        return Math.min(95, baseRate + levelBonus + experienceBonus);
    },

    formatMaterialsInventory(inventory) {
        const materials = Object.entries(ENCHANTING_MATERIALS)
            .map(([key, material]) => {
                const amount = inventory[key] || 0;
                const emoji = material.name.split(' ')[0];
                return `${emoji} ${amount}`;
            })
            .join('\n');

        return materials || 'No materials found';
    },

    formatEnchantmentEffects(enchantment) {
        return Object.entries(enchantment.effects)
            .map(([effect, value]) => {
                if (typeof value === 'boolean') {
                    return `**${effect.replace(/_/g, ' ')}:** ${value ? 'Yes' : 'No'}`;
                } else {
                    return `**${effect.replace(/_/g, ' ')}:** +${Math.round(value * 100)}%`;
                }
            })
            .join('\n');
    },

    unlockEnchantments(userData) {
        const allEnchantments = Object.keys(ENCHANTMENTS);
        const currentLevel = userData.enchanting.level;

        // Unlock enchantments based on level
        const toUnlock = allEnchantments.filter(key => {
            if (userData.enchanting.discovered_enchantments.includes(key)) return false;

            // Simple level-based unlocking system
            const requiredLevel = Math.floor(Math.random() * 10) + 1;
            return currentLevel >= requiredLevel;
        });

        // Limit the number of enchantments unlocked per level-up to avoid overwhelming the player
        const newlyUnlocked = toUnlock.slice(0, Math.min(toUnlock.length, 2)); 
        userData.enchanting.discovered_enchantments.push(...newlyUnlocked);
    }
};