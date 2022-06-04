const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js');

module.exports = {
    embeds: {
        contactEmbed: new MessageEmbed()
            .setColor('#d6b3f2')
            .setDescription('Click the button below to request a support ticket!\nMake sure you\'ve read everything here first.'),
        dmRequestEmbed: new MessageEmbed()
        .setDescription('Test'),
        dmSubmittedEmbed: new MessageEmbed(),
        dmResolveEmbed: new MessageEmbed(),
        dmExpiredEmbed: new MessageEmbed(),
        dmReplacedEmbed: new MessageEmbed()
            .setDescription('*noooo!*')

    }, actions: {
        contactAction: new MessageActionRow().addComponents(
            new MessageButton()
                .setCustomId('RequestTicket')
                .setLabel('Request Support')
                .setStyle('PRIMARY')
        ),
        ticketPendingAction: new MessageActionRow(),
        ticketResolvedAction: new MessageActionRow(),
        dmRequestAction: new MessageActionRow().addComponents(
            new MessageSelectMenu()
                .setCustomId('SelectType')
                .setPlaceholder('Type')
                .setMinValues(0)
                .setMaxValues(1)
                .addOptions([{label:'Appeal',value:1},{label:'Report',value:2},{label:'Other',value:3}]),
            new MessageButton()
                .setCustomId('SubmitTicket')
                .setLabel('Submit')
                .setStyle('PRIMARY')
        ),
        dmEditAction: new MessageActionRow(),
        dmReopenAction: new MessageActionRow()
    }, types: {
        1: 'Appeal',
        2: 'Report',
        3: 'Other'
    }, statuses: {
        1: 'REQUESTED',
        2: 'PENDING',
        3: 'RESOLVED',
        4: 'ACCEPTED',
        5: 'DENIED'
    } 
};