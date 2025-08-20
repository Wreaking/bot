
const { SlashCommandBuilder, EmbedBuilder, ActionRowBuilder, ButtonBuilder, ButtonStyle, StringSelectMenuBuilder } = require('discord.js');
const db = require('../../database.js');

const MARKET_CATEGORIES = {
    weapons: { name: '⚔️ Weapons', emoji: '⚔️' },
    armor: { name: '🛡️ Armor', emoji: '🛡️' },
    potions: { name: '🧪 Potions', emoji: '🧪' },
    scrolls: { name: '📜 Scrolls', emoji: '📜' },
    gems: { name: '💎 Gems', emoji: '💎' },
    materials: { name: '🧱 Materials', emoji: '🧱' },
    pets: { name: '🐾 Pet Items', emoji: '🐾' },
    misc: { name: '📦 Miscellaneous', emoji: '📦' }
};

module.exports = {
    data: new SlashCommandBuilder()
        .setName('market')
        .setDescription('🏪 Access the player-driven marketplace')
        .addSubcommand(subcommand =>
            subcommand
                .setName('list')
                .setDescription('List an item for sale')
                .addStringOption(option =>
                    option.setName('item')
                        .setDescription('Item to sell')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('price')
                        .setDescription('Price in gold')
                        .setRequired(true)
                        .setMinValue(1))
                .addIntegerOption(option =>
                    option.setName('quantity')
                        .setDescription('Amount to sell')
                        .setRequired(true)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('buy')
                .setDescription('Buy items from the market')
                .addStringOption(option =>
                    option.setName('listing_id')
                        .setDescription('ID of the listing to buy')
                        .setRequired(true))
                .addIntegerOption(option =>
                    option.setName('quantity')
                        .setDescription('Amount to buy')
                        .setRequired(false)
                        .setMinValue(1)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('browse')
                .setDescription('Browse available items')
                .addStringOption(option =>
                    option.setName('category')
                        .setDescription('Item category to browse')
                        .setRequired(false)
                        .addChoices(
                            { name: '⚔️ Weapons', value: 'weapons' },
                            { name: '🛡️ Armor', value: 'armor' },
                            { name: '🧪 Potions', value: 'potions' },
                            { name: '📜 Scrolls', value: 'scrolls' },
                            { name: '💎 Gems', value: 'gems' },
                            { name: '🧱 Materials', value: 'materials' },
                            { name: '🐾 Pet Items', value: 'pets' },
                            { name: '📦 Miscellaneous', value: 'misc' }
                        )))
        .addSubcommand(subcommand =>
            subcommand
                .setName('remove')
                .setDescription('Remove your listing from market')
                .addStringOption(option =>
                    option.setName('listing_id')
                        .setDescription('ID of the listing to remove')
                        .setRequired(true)))
        .addSubcommand(subcommand =>
            subcommand
                .setName('mylistings')
                .setDescription('View your active listings')),

    async execute(interaction) {
        try {
            await interaction.deferReply();

            const subcommand = interaction.options.getSubcommand();
            const userId = interaction.user.id;

            const player = await db.getPlayer(userId);
            if (!player) {
                await interaction.editReply({
                    content: '❌ You need to create a profile first!',
                    ephemeral: true
                });
                return;
            }

            // Initialize market data
            let marketData = await db.getGlobalData('market') || { listings: {}, nextId: 1 };

            switch (subcommand) {
                case 'browse':
                    await this.browseMarket(interaction, marketData, interaction.options.getString('category'));
                    break;
                case 'list':
                    await this.listItem(interaction, player, marketData);
                    break;
                case 'buy':
                    await this.buyItem(interaction, player, marketData);
                    break;
                case 'remove':
                    await this.removeListing(interaction, player, marketData);
                    break;
                case 'mylistings':
                    await this.showMyListings(interaction, player, marketData);
                    break;
            }

        } catch (error) {
            console.error('Market command error:', error);
            await interaction.editReply({
                content: '❌ An error occurred in the marketplace.',
                ephemeral: true
            });
        }
    },

    async browseMarket(interaction, marketData, category) {
        // Clean expired listings
        this.cleanExpiredListings(marketData);

        const listings = Object.values(marketData.listings);
        const filteredListings = category 
            ? listings.filter(listing => listing.category === category)
            : listings;

        if (filteredListings.length === 0) {
            await interaction.editReply({
                content: category 
                    ? `❌ No items found in ${MARKET_CATEGORIES[category].name} category!`
                    : '❌ The marketplace is empty!',
                ephemeral: true
            });
            return;
        }

        // Sort by price and limit to 10 items per page
        const sortedListings = filteredListings
            .sort((a, b) => a.pricePerUnit - b.pricePerUnit)
            .slice(0, 10);

        const embed = new EmbedBuilder()
            .setColor('#FFD700')
            .setTitle('🏪 Player Marketplace')
            .setDescription(category 
                ? `**${MARKET_CATEGORIES[category].name} Items**` 
                : '**All Categories**')
            .addFields(
                {
                    name: '📊 **Market Statistics**',
                    value: `**Total Listings:** ${listings.length}\n**Active Categories:** ${new Set(listings.map(l => l.category)).size}\n**Avg Price:** ${Math.floor(listings.reduce((sum, l) => sum + l.pricePerUnit, 0) / listings.length)} gold`,
                    inline: true
                }
            );

        // Add listings
        sortedListings.forEach((listing, index) => {
            const categoryEmoji = MARKET_CATEGORIES[listing.category]?.emoji || '📦';
            const timeLeft = Math.ceil((listing.expiresAt - Date.now()) / (24 * 60 * 60 * 1000));
            
            embed.addFields({
                name: `${categoryEmoji} ${listing.itemName} (ID: ${listing.id})`,
                value: `**Price:** ${listing.pricePerUnit} gold each\n**Quantity:** ${listing.quantity}\n**Total:** ${listing.pricePerUnit * listing.quantity} gold\n**Seller:** ${listing.sellerName}\n**Expires:** ${timeLeft}d`,
                inline: true
            });
        });

        // Category selection menu
        const categorySelect = new StringSelectMenuBuilder()
            .setCustomId('market_category_browse')
            .setPlaceholder('🏪 Browse by category...')
            .addOptions([
                {
                    label: 'All Categories',
                    value: 'market_all',
                    description: 'Show all marketplace items',
                    emoji: '📦'
                },
                ...Object.entries(MARKET_CATEGORIES).map(([key, cat]) => ({
                    label: cat.name,
                    value: `market_${key}`,
                    description: `Browse ${cat.name.toLowerCase()}`,
                    emoji: cat.emoji
                }))
            ]);

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('market_refresh')
                    .setLabel('Refresh')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🔄'),
                new ButtonBuilder()
                    .setCustomId('market_search')
                    .setLabel('Search Items')
                    .setStyle(ButtonStyle.Secondary)
                    .setEmoji('🔍'),
                new ButtonBuilder()
                    .setCustomId('market_list_item')
                    .setLabel('List Item')
                    .setStyle(ButtonStyle.Success)
                    .setEmoji('💰')
            );

        await interaction.editReply({
            embeds: [embed],
            components: [
                new ActionRowBuilder().addComponents(categorySelect),
                buttons
            ]
        });
    },

    async listItem(interaction, player, marketData) {
        const itemName = interaction.options.getString('item');
        const price = interaction.options.getInteger('price');
        const quantity = interaction.options.getInteger('quantity');

        // Check if player has the item
        if (!player.inventory?.items || !player.inventory.items[itemName] || player.inventory.items[itemName] < quantity) {
            await interaction.editReply({
                content: `❌ You don't have ${quantity} ${itemName}(s) to sell!`,
                ephemeral: true
            });
            return;
        }

        // Check market fees (5% listing fee)
        const listingFee = Math.max(1, Math.floor(price * quantity * 0.05));
        if ((player.gold || 0) < listingFee) {
            await interaction.editReply({
                content: `❌ You need ${listingFee} gold to list this item (5% listing fee)!`,
                ephemeral: true
            });
            return;
        }

        // Determine item category
        const category = this.categorizeItem(itemName);

        // Create listing
        const listingId = marketData.nextId++;
        const listing = {
            id: listingId,
            sellerId: interaction.user.id,
            sellerName: interaction.user.displayName,
            itemName: itemName,
            quantity: quantity,
            pricePerUnit: price,
            category: category,
            listedAt: Date.now(),
            expiresAt: Date.now() + (7 * 24 * 60 * 60 * 1000) // 7 days
        };

        // Remove items from player inventory and deduct fee
        player.inventory.items[itemName] -= quantity;
        player.gold -= listingFee;

        // Add listing to market
        marketData.listings[listingId] = listing;

        await db.updatePlayer(interaction.user.id, player);
        await db.setGlobalData('market', marketData);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('📋 Item Listed Successfully!')
            .setDescription(`Your **${itemName}** is now available in the marketplace!`)
            .addFields(
                {
                    name: '📦 **Listing Details**',
                    value: `**Item:** ${itemName}\n**Quantity:** ${quantity}\n**Price:** ${price} gold each\n**Total Value:** ${price * quantity} gold`,
                    inline: true
                },
                {
                    name: '💰 **Financial Info**',
                    value: `**Listing Fee:** ${listingFee} gold\n**Your Balance:** ${player.gold} gold\n**Listing ID:** ${listingId}`,
                    inline: true
                },
                {
                    name: '📅 **Listing Duration**',
                    value: `**Expires:** <t:${Math.floor(listing.expiresAt / 1000)}:R>\n**Category:** ${MARKET_CATEGORIES[category].name}`,
                    inline: true
                }
            )
            .setFooter({ text: 'Use /market mylistings to manage your active listings' });

        await interaction.editReply({ embeds: [embed] });
    },

    async buyItem(interaction, player, marketData) {
        const listingId = interaction.options.getString('listing_id');
        const quantity = interaction.options.getInteger('quantity') || 1;

        const listing = marketData.listings[listingId];
        if (!listing) {
            await interaction.editReply({
                content: '❌ Listing not found! It may have been sold or expired.',
                ephemeral: true
            });
            return;
        }

        // Check if trying to buy own item
        if (listing.sellerId === interaction.user.id) {
            await interaction.editReply({
                content: '❌ You cannot buy your own listing!',
                ephemeral: true
            });
            return;
        }

        // Check quantity available
        if (quantity > listing.quantity) {
            await interaction.editReply({
                content: `❌ Only ${listing.quantity} ${listing.itemName}(s) available!`,
                ephemeral: true
            });
            return;
        }

        const totalCost = listing.pricePerUnit * quantity;

        // Check if buyer has enough gold
        if ((player.gold || 0) < totalCost) {
            await interaction.editReply({
                content: `❌ You need ${totalCost} gold but only have ${player.gold || 0} gold!`,
                ephemeral: true
            });
            return;
        }

        // Process purchase
        player.gold -= totalCost;
        if (!player.inventory.items) player.inventory.items = {};
        player.inventory.items[listing.itemName] = (player.inventory.items[listing.itemName] || 0) + quantity;

        // Update listing quantity
        listing.quantity -= quantity;

        // Pay seller (minus 10% marketplace tax)
        const sellerProfit = Math.floor(totalCost * 0.9);
        const seller = await db.getPlayer(listing.sellerId);
        if (seller) {
            seller.gold += sellerProfit;
            await db.updatePlayer(listing.sellerId, seller);
        }

        // Remove listing if sold out
        if (listing.quantity <= 0) {
            delete marketData.listings[listingId];
        }

        await db.updatePlayer(interaction.user.id, player);
        await db.setGlobalData('market', marketData);

        const embed = new EmbedBuilder()
            .setColor('#00FF00')
            .setTitle('🛒 Purchase Successful!')
            .setDescription(`You bought **${quantity} ${listing.itemName}(s)** from **${listing.sellerName}**!`)
            .addFields(
                {
                    name: '💰 **Transaction Details**',
                    value: `**Item:** ${listing.itemName}\n**Quantity:** ${quantity}\n**Price per unit:** ${listing.pricePerUnit} gold\n**Total cost:** ${totalCost} gold`,
                    inline: true
                },
                {
                    name: '👛 **Your Balance**',
                    value: `**Remaining gold:** ${player.gold}\n**Marketplace tax:** ${totalCost - sellerProfit} gold`,
                    inline: true
                }
            )
            .setTimestamp();

        await interaction.editReply({ embeds: [embed] });
    },

    async removeListing(interaction, player, marketData) {
        const listingId = interaction.options.getString('listing_id');
        const listing = marketData.listings[listingId];

        if (!listing) {
            await interaction.editReply({
                content: '❌ Listing not found!',
                ephemeral: true
            });
            return;
        }

        if (listing.sellerId !== interaction.user.id) {
            await interaction.editReply({
                content: '❌ You can only remove your own listings!',
                ephemeral: true
            });
            return;
        }

        // Return items to player
        if (!player.inventory.items) player.inventory.items = {};
        player.inventory.items[listing.itemName] = (player.inventory.items[listing.itemName] || 0) + listing.quantity;

        // Remove listing
        delete marketData.listings[listingId];

        await db.updatePlayer(interaction.user.id, player);
        await db.setGlobalData('market', marketData);

        const embed = new EmbedBuilder()
            .setColor('#FFA500')
            .setTitle('📋 Listing Removed')
            .setDescription(`Your listing for **${listing.quantity} ${listing.itemName}(s)** has been removed from the marketplace.`)
            .addFields({
                name: '📦 Items Returned',
                value: `${listing.quantity} ${listing.itemName}(s) returned to your inventory.`,
                inline: false
            });

        await interaction.editReply({ embeds: [embed] });
    },

    async showMyListings(interaction, player, marketData) {
        const myListings = Object.values(marketData.listings)
            .filter(listing => listing.sellerId === interaction.user.id);

        if (myListings.length === 0) {
            await interaction.editReply({
                content: '❌ You have no active listings in the marketplace!',
                ephemeral: true
            });
            return;
        }

        const totalValue = myListings.reduce((sum, listing) => sum + (listing.pricePerUnit * listing.quantity), 0);

        const embed = new EmbedBuilder()
            .setColor('#4169E1')
            .setTitle('📋 Your Marketplace Listings')
            .setDescription(`You have **${myListings.length}** active listings worth **${totalValue}** gold total.`)
            .addFields(
                {
                    name: '📊 Summary',
                    value: `**Active listings:** ${myListings.length}\n**Total value:** ${totalValue} gold\n**Categories:** ${new Set(myListings.map(l => l.category)).size}`,
                    inline: true
                }
            );

        myListings.forEach(listing => {
            const categoryEmoji = MARKET_CATEGORIES[listing.category]?.emoji || '📦';
            const timeLeft = Math.ceil((listing.expiresAt - Date.now()) / (24 * 60 * 60 * 1000));

            embed.addFields({
                name: `${categoryEmoji} ${listing.itemName} (ID: ${listing.id})`,
                value: `**Price:** ${listing.pricePerUnit} gold each\n**Quantity:** ${listing.quantity}\n**Total:** ${listing.pricePerUnit * listing.quantity} gold\n**Expires in:** ${timeLeft} days`,
                inline: true
            });
        });

        const buttons = new ActionRowBuilder()
            .addComponents(
                new ButtonBuilder()
                    .setCustomId('market_remove_select')
                    .setLabel('Remove Listing')
                    .setStyle(ButtonStyle.Danger)
                    .setEmoji('❌'),
                new ButtonBuilder()
                    .setCustomId('market_browse_all')
                    .setLabel('Browse Market')
                    .setStyle(ButtonStyle.Primary)
                    .setEmoji('🏪')
            );

        await interaction.editReply({
            embeds: [embed],
            components: [buttons]
        });
    },

    categorizeItem(itemName) {
        const itemLower = itemName.toLowerCase();
        
        if (itemLower.includes('sword') || itemLower.includes('axe') || itemLower.includes('bow') || itemLower.includes('staff')) {
            return 'weapons';
        } else if (itemLower.includes('armor') || itemLower.includes('helmet') || itemLower.includes('shield') || itemLower.includes('boots')) {
            return 'armor';
        } else if (itemLower.includes('potion') || itemLower.includes('elixir') || itemLower.includes('tonic')) {
            return 'potions';
        } else if (itemLower.includes('scroll') || itemLower.includes('tome') || itemLower.includes('spell')) {
            return 'scrolls';
        } else if (itemLower.includes('gem') || itemLower.includes('crystal') || itemLower.includes('diamond') || itemLower.includes('ruby')) {
            return 'gems';
        } else if (itemLower.includes('ore') || itemLower.includes('wood') || itemLower.includes('stone') || itemLower.includes('metal')) {
            return 'materials';
        } else if (itemLower.includes('pet') || itemLower.includes('collar') || itemLower.includes('treat') || itemLower.includes('toy')) {
            return 'pets';
        } else {
            return 'misc';
        }
    },

    cleanExpiredListings(marketData) {
        const now = Date.now();
        Object.keys(marketData.listings).forEach(id => {
            if (marketData.listings[id].expiresAt < now) {
                // TODO: Return items to seller's inbox system
                delete marketData.listings[id];
            }
        });
    }
};
