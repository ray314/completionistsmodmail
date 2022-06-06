const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu, TextInputComponent, Message} = require('discord.js');

// -- EMBEDS -- \\
function getContactEmbed() {
    return new MessageEmbed()
    .setColor('#d6b3f2')
    .setDescription('Click the button below to request a support ticket!\nMake sure you\'ve read everything here first.');
}

function generateDmRequestEmbed() {
    return new MessageEmbed()
        .setDescription('Test');
}

function generateDmSubmittedEmbed() {
    return new MessageEmbed()
        .setDescription('Submitted');
}

function generateDmResolvedEmbed() { // old response (no information)
    return new MessageEmbed()
    .setColor('#d6b3f2')
    .setDescription('*ticket has been resolved*');
}

function generateDmResolveEmbed(status, remarks) { // new response ()
    var description = '*ticket is resolve status' + status;
    if (remarks) description += 'Remarks: ' + remarks;
    return new MessageEmbed()
    .setColor('#d6b3f2')
    .setDescription(description);
}

function generateDmExpiredEmbed() {
    
}

function generateDmReplacedEmbed() {
    return new MessageEmbed()
    .setColor('#d6b3f2')
    .setDescription('*ticket cancelled by another ticket*');
}

function generateTicketEmbed(id) {
    return new MessageEmbed()
    .setColor('#d6b3f2')
    .setDescription('This is a ticket embed')
    .setFooter({text:id});
}

function generateTicketEditingEmbed() {
    return new MessageEmbed()
    .setColor('#d6b3f2')
    .setDescription('*Ticket is currently being edited*');
}

function generateTicketResolvedEmbed() {
    return new MessageEmbed()
    .setColor('#d6b3f2')
    .setDescription('*ticket is resolve');
}

// -- ACTIONS -- \\
function getContactAction() {
    return [new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId('OpenTicket')
            .setLabel('Request Support')
            .setStyle('PRIMARY'))];
}

function generateDmRequestAction(id) {
    return [ new MessageActionRow().addComponents(
        new MessageSelectMenu()
            .setCustomId('SetType-'+id)
            .setPlaceholder('Type')
            .setMinValues(1)
            .setMaxValues(1)
            .addOptions([{label:'Appeal',value:'APPEAL'},{label:'Report',value:'REPORT'},{label:'Other',value:'OTHER'}])
    ), new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId('SubmitTicket-'+id)
            .setLabel('Submit')
            .setStyle('PRIMARY')
    )];
}

function generateDmEditAction(id) {
    return [ new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId('EditTicket-'+id)
            .setLabel('Edit')
            .setStyle('PRIMARY')
        )
    ];
}

function generateDmReopenAction() {
    return [ new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId('ReopenTicket-'+id)
            .setLabel('Reopen')
            .setStyle('PRIMARY')
        )
    ];
}

function generateTicketAction() {
    return [ new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId('ResolveTicket-')
            .setLabel('Resolve')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('AcceptTicket-')
            .setLabel('Accept')
            .setStyle('SUCCESS'),
        new MessageButton()
            .setCustomId('DenyTicket-')
            .setLabel('Deny')
            .setStyle('DANGER')
    )];
}


module.exports = {
    getContactEmbed,
    generateDmRequestEmbed,
    generateDmSubmittedEmbed,
    generateDmResolvedEmbed,
    generateDmResolveEmbed,
    generateDmExpiredEmbed,
    generateDmReplacedEmbed,
    generateTicketEmbed,
    generateTicketEditingEmbed,
    generateTicketResolvedEmbed,
    getContactAction,
    generateDmRequestAction,
    generateDmEditAction,
    generateDmReopenAction,
    generateTicketAction,
    intToStatus: {
        1: "REQUESTED",
        2: "PENDING",
        3: "EDITING",
        4: "RESOLVED",
        5: "ACCEPTED",
        6: "DENIED"
    }, 
    statusToInt: {
        "REQUESTED": 1,
        "PENDING": 2,
        "EDITING": 3,
        "RESOLVED": 4,
        "ACCEPTED": 5,
        "DENIED": 6
    }
};