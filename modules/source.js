const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js');

module.exports = {
    embeds: {
        contactEmbed: new MessageEmbed()
            .setColor('#d6b3f2')
            .setDescription('Click the button below to request a support ticket!\nMake sure you\'ve read everything here first.'),
        dmTypeEmbed: new MessageEmbed(),
        dmContentEmbed: new MessageEmbed(),
        dmResolveEmbed: new MessageEmbed(),
        dmExpiredEmbed: new MessageEmbed()

    }, actions: {
        contactAction: new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId('RequestTicket')
                .setLabel('Request Support')
                .setStyle('PRIMARY')
        ),
        ticketPendingAction: new MessageActionRow(),
        ticketResolvedAction: new MessageActionRow(),
        dmTypeAction: new MessageActionRow(),
        dmReopenAction: new MessageActionRow()
    }
};