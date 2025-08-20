
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

const BUILDING_TYPES = {
    house: {
        name: '🏠 Basic House',
        description: 'A simple dwelling for adventurers',
        cost: { wood: 50, stone: 30, nails: 20, coins: 1000 },
        build_time: 300000, // 5 minutes
        capacity: { storage: 100, residents: 2 },
        unlocks: ['bedroom', 'kitchen']
    },
    mansion: {
        name: '🏰 Grand Mansion',
        description: 'A luxurious estate for wealthy adventurers',
        cost: { wood: 200, marble: 100, gold_ingot: 50, coins: 10000 },
        build_time: 1200000, // 20 minutes
        capacity: { storage: 500, residents: 10 },
        unlocks: ['library', 'treasury', 'servant_quarters'],
        requires: 'house'
    },
    workshop: {
        name: '🔨 Workshop',
        description: 'A crafting facility for creating items',
        cost: { wood: 75, iron_ingot: 40, tools: 10, coins: 2500 },
        build_time: 600000, // 10 minutes
        capacity: { crafting_bonus: 0.25 },
        unlocks: ['forge', 'enchanting_table']
    },
    warehouse: {
        name: '📦 Warehouse',
        description: 'Massive storage facility for items',
        cost: { wood: 100, stone: 150, steel_beams: 25, coins: 5000 },
        build_time: 900000, // 15 minutes
        capacity: { storage: 1000 },
        unlocks: ['sorting_system', 'security_vault']
    },
    garden: {
        name: '🌺 Garden',
        description: 'A peaceful area for growing plants',
        cost: { seeds: 50, soil: 100, water: 25, coins: 1500 },
        build_time: 480000, // 8 minutes
        capacity: { plant_slots: 20, growth_bonus: 0.30 },
        unlocks: ['greenhouse', 'herb_garden']
    },
    stable: {
        name: '🐎 Stable',
        description: 'Housing for mounts and companions',
        cost: { wood: 80, hay: 60, horseshoes: 15, coins: 3000 },
        build_time: 720000, // 12 minutes
        capacity: { mount_slots: 5, care_bonus: 0.20 },
        unlocks: ['training_ground', 'breeding_pen']
    }
};

const ROOM_UPGRADES = {
    bedroom: {
        name: '🛏️ Master Bedroom',
        description: 'Increases rest quality and health regeneration',
        cost: { wood: 25, fabric: 15, coins: 500 },
        effects: { health_regen: 0.15, comfort: 10 }
    },
    kitchen: {
        name: '👨‍🍳 Kitchen',
        description: 'Allows cooking and food preparation',
        cost: { iron_ingot: 20, wood: 15, coins: 750 },
        effects: { cooking_bonus: 0.20, food_storage: 50 }
    },
    library: {
        name: '📚 Library',
        description: 'Increases experience gain from studying',
        cost: { paper: 100, ink: 25, wood: 50, coins: 2000 },
        effects: { exp_bonus: 0.10, research_speed: 0.25 }
    },
    forge: {
        name: '⚒️ Personal Forge',
        description: 'Advanced crafting capabilities for weapons and armor',
        cost: { steel_ingot: 30, coal: 50, coins: 3000 },
        effects: { crafting_quality: 0.30, weapon_bonus: 0.15 }
    },
    treasury: {
        name: '💰 Treasury',
        description: 'Secure storage for valuable items and coins',
        cost: { steel_ingot: 40, gems: 20, coins: 5000 },
        effects: { security: 0.95, coin_generation: 100 }
    }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('build')
        .setDescription('🏗️ Construct buildings and upgrade your property')
        .addStringOption(option =>
            option.setName('type')
                .setDescription('Type of building to construct')
                .setRequired(false)
                .addChoices(
                    { name: '🏠 Basic House', value: 'house' },
                    { name: '🏰 Grand Mansion', value: 'mansion' },
                    { name: '🔨 Workshop', value: 'workshop' },
                    { name: '📦 Warehouse', value: 'warehouse' },
                    { name: '🌺 Garden', value: 'garden' },
                    { name: '🐎 Stable', value: 'stable' }
                ))
        .addStringOption(option =>
            option.setName('room')
                .setDescription('Room or upgrade to add')
                .setRequired(false)),

    async execute(interaction) {
        try {
            await interaction.deferReply();
            
            const userId = interaction.user.id;
            let userData = await db.getUserData(userId) || {};
            
            // Initialize building data
            if (!userData.buildings) {
                userData.buildings = {
                    owned: {},
                    under_construction: {},
                    rooms: {},
                    total_built: 0,
                    construction_level: 1
                };
            }

            const buildingType = interaction.options.getString('type');
            const roomType = interaction.options.getString('room');
            
            if (!buildingType && !roomType) {
                await this.showBuildingMenu(interaction, userData);
            } else if (buildingType) {
                await this.startConstruction(interaction, userData, buildingType);
            } else if (roomType) {
                await this.buildRoom(interaction, userData, roomType);
            }
            
        } catch (error) {
            console.error('Building command error:', error);
            await interaction.editReply({
                content: '❌ An error occurred while building. Please try again.',
                ephemeral: true
            });
        }
    },

    async showBuildingMenu(interaction, userData) {
        // Check for completed constructions
        await this.checkConstructionProgress(userData);
        
        const embed = new EmbedBuilder()
            .setColor('#8B4513')
            .setTitle('🏗️ Construction Management')
            .setDescription('╔═══════════════════════════════════════╗\n║        **BUILDING HEADQUARTERS**        ║\n╚═══════════════════════════════════════╝\n\n*Design and construct your dream property*')
            .addFields(
                {
                    name: '🏠 **Your Property**',
                    value: this.formatOwnedBuildings(userData.buildings.owned),
                    inline: true
                },
                {
                    name: '⚒️ **Construction Stats**',
                    value: `**Level:** ${userData.buildings.construction_level}\n**Total Built:** ${userData.buildings.total_built}\n**Active Projects:** ${Object.keys(userData.buildings.under_construction).length}`,
                    inline: true
                },
                {
                    name: '💰 **Resources**',
                    value: this.formatBuildingResources(userData.inventory || {}),
                    inline: true
                }
            );

        // Show construction progress if any
        if (Object.keys(userData.buildings.under_construction).length > 0) {
            const constructionStatus = Object.entries(userData.buildings.under_construction)
                .map(([building, data]) => {
                    const remaining = Math.max(0, data.completion_time - Date.now());
                    const remainingMinutes = Math.ceil(remaining / 60000);
                    return `🏗️ ${BUILDING_TYPES[building].name}: ${remainingMinutes}m remaining`;
                })
                .join('\n');

            embed.addFields({
                name: '🚧 **Under Construction**',
                value: constructionStatus,
                inline: false
            });
        }

        const buildingSelect = new StringSelectMenuBuilder()
            .setCustomId('building_select')
            .setPlaceholder('🏗️ Choose a building to construct')
            .addOptions(
                Object.entries(BUILDING_TYPES).map(([key, building]) => {
                    const canBuild = this.canBuild(userData, key);
                    return {
                        label: building.name,
                        value: key,
                        description: `Cost: ${this.formatCost(building.cost)} | ${canBuild ? 'Available' : 'Requirements not met'}`,
                        emoji: building.name.split(' ')[0]
                    };
                })
            );

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('building_rooms')
                    .setLabel('Manage Rooms')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🚪'),
                new ButtonBuilder()
                    .setCustomId('building_status')
                    .setLabel('Property Status')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('📊'),
                new ButtonBuilder()
                    .setCustomId('building_market')
                    .setLabel('Building Market')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('🏪')
            );

        const selectRow = new ActionRowBuilder().addComponents(buildingSelect);

        await interaction.editReply({
            embeds: [embed],
            components: [selectRow, buttons]
        });
    },

    async startConstruction(interaction, userData, buildingType) {
        const building = BUILDING_TYPES[buildingType];
        
        if (!building) {
            await interaction.editReply({
                content: '❌ Invalid building type selected.',
                ephemeral: true
            });
            return;
        }

        // Check if already owned
        if (userData.buildings.owned[buildingType]) {
            await interaction.editReply({
                content: `❌ You already own a ${building.name}!`,
                ephemeral: true
            });
            return;
        }

        // Check if already under construction
        if (userData.buildings.under_construction[buildingType]) {
            const remaining = Math.max(0, userData.buildings.under_construction[buildingType].completion_time - Date.now());
            const remainingMinutes = Math.ceil(remaining / 60000);
            
            await interaction.editReply({
                content: `⏳ ${building.name} is already under construction! ${remainingMinutes} minutes remaining.`,
                ephemeral: true
            });
            return;
        }

        // Check requirements
        if (building.requires && !userData.buildings.owned[building.requires]) {
            await interaction.editReply({
                content: `❌ You need to own a ${BUILDING_TYPES[building.requires].name} first!`,
                ephemeral: true
            });
            return;
        }

        // Check if user has required materials
        const canAfford = Object.entries(building.cost).every(([material, amount]) => {
            if (material === 'coins') {
                return (userData.coins || 0) >= amount;
            }
            return (userData.inventory[material] || 0) >= amount;
        });

        if (!canAfford) {
            const missingItems = Object.entries(building.cost)
                .filter(([material, amount]) => {
                    if (material === 'coins') {
                        return (userData.coins || 0) < amount;
                    }
                    return (userData.inventory[material] || 0) < amount;
                })
                .map(([material, amount]) => `${material}: ${amount}`)
                .join(', ');

            await interaction.editReply({
                content: `❌ Insufficient materials: ${missingItems}`,
                ephemeral: true
            });
            return;
        }

        // Consume materials
        Object.entries(building.cost).forEach(([material, amount]) => {
            if (material === 'coins') {
                userData.coins = (userData.coins || 0) - amount;
            } else {
                userData.inventory[material] = (userData.inventory[material] || 0) - amount;
            }
        });

        // Start construction
        userData.buildings.under_construction[buildingType] = {
            started_at: Date.now(),
            completion_time: Date.now() + building.build_time
        };

        await db.updateUser(interaction.user.id, userData);

        const embed = new EmbedBuilder()
            .setColor('#FF8C00')
            .setTitle('🏗️ Construction Started!')
            .setDescription(`Construction of your **${building.name}** has begun!`)
            .addFields(
                {
                    name: '⏱️ **Construction Time**',
                    value: `${Math.ceil(building.build_time / 60000)} minutes`,
                    inline: true
                },
                {
                    name: '📋 **Materials Used**',
                    value: Object.entries(building.cost)
                        .map(([material, amount]) => `${material}: ${amount}`)
                        .join('\n'),
                    inline: true
                },
                {
                    name: '🎯 **Upon Completion**',
                    value: `**Storage:** +${building.capacity.storage || 0}\n**Unlocks:** ${building.unlocks?.join(', ') || 'None'}`,
                    inline: true
                }
            )
            .setFooter({ text: 'Use /build again to check construction progress' });

        await interaction.editReply({ embeds: [embed] });
    },

    async checkConstructionProgress(userData) {
        const now = Date.now();
        const completed = [];

        Object.entries(userData.buildings.under_construction).forEach(([buildingType, data]) => {
            if (now >= data.completion_time) {
                completed.push(buildingType);
            }
        });

        // Move completed buildings to owned
        completed.forEach(buildingType => {
            userData.buildings.owned[buildingType] = {
                built_at: Date.now(),
                level: 1,
                condition: 100
            };
            delete userData.buildings.under_construction[buildingType];
            userData.buildings.total_built++;
        });

        return completed;
    },

    formatOwnedBuildings(owned) {
        if (Object.keys(owned).length === 0) {
            return 'No buildings owned yet';
        }

        return Object.entries(owned)
            .map(([type, data]) => {
                const building = BUILDING_TYPES[type];
                return `${building.name} (Level ${data.level})`;
            })
            .join('\n');
    },

    formatBuildingResources(inventory) {
        const resources = ['wood', 'stone', 'iron_ingot', 'steel_ingot', 'nails', 'tools'];
        return resources
            .map(resource => `${resource}: ${inventory[resource] || 0}`)
            .join('\n') || 'No building resources';
    },

    formatCost(cost) {
        return Object.entries(cost)
            .map(([material, amount]) => `${material}: ${amount}`)
            .join(', ');
    },

    canBuild(userData, buildingType) {
        const building = BUILDING_TYPES[buildingType];
        
        // Check if already owned
        if (userData.buildings.owned[buildingType]) return false;
        
        // Check requirements
        if (building.requires && !userData.buildings.owned[building.requires]) return false;
        
        return true;
    }
};
