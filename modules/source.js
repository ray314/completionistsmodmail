const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js');

const intToStatus = {
    1: "REQUESTED",
    2: "PENDING",
    3: "EDITING",
    4: "RESOLVED",
    5: "ACCEPTED",
    6: "DENIED",
    7: "CANCELLED BY USER",
    8: "CLOSED"
};
const statusToInt = {
    "REQUESTED": 1,
    "PENDING": 2,
    "EDITING": 3,
    "RESOLVED": 4,
    "ACCEPTED": 5,
    "DENIED": 6,
    "CANCELLED": 7,
    "CLOSED": 8
};



// -- EMBEDS -- \\\
function getTestEmbed() {
    return new MessageEmbed()
    .setAuthor({name: 'mitsukeni' + '\u2003'.repeat(27), iconURL: 'https://images-ext-1.discordapp.net/external/4UvUlktBxkjyKMahZLNcqRIdgIsnEWqHhg0gIeHd69s/https/cdn.discordapp.com/avatars/306478889306423296/7c426685550a812a0a631f5e8ff2889d.webp'})
    .setColor('#e3b314')
    .setTitle('Ban Appeal')
    .setDescription('unban me pls')
    .setThumbnail('https://media.discordapp.net/attachments/983585037813416007/983587855815307354/pending.png')
    .setFooter({text:'132'})
    .setTimestamp();
}

function getTestEmbed2() {
    return new MessageEmbed()
    .setAuthor({name: 'mitsukeni' + '\u2003'.repeat(27), iconURL: 'https://images-ext-1.discordapp.net/external/4UvUlktBxkjyKMahZLNcqRIdgIsnEWqHhg0gIeHd69s/https/cdn.discordapp.com/avatars/306478889306423296/7c426685550a812a0a631f5e8ff2889d.webp'})
    .setColor('#3DDB3D')
    .setTitle('Ban Appeal')
    .setDescription('unban me pls')
    .setThumbnail('https://media.discordapp.net/attachments/983585037813416007/983589279693426718/pending.png')
    .addFields(
        { name: '\u200B', value: '\u200B' },
        { name: 'Accepted by mitsukeni', value: 'Stop spamming \'sussy balls\' in chat'}  
    )
    .setFooter({text:'132'})
    .setTimestamp();
}


function getContactEmbed() {
    return new MessageEmbed()
    .setColor('#d6b3f2')
    .setDescription('Click the button below to request a support ticket!\nMake sure you\'ve read everything here first.');
}

function generateDmRequestEmbed(params) {
    params.status = params.status ? intToStatus[params.status] : 'UNKNOWN'; 
    if (!params.type) params.type = 'Please set type';
    if (!params.comment) params.comment = 'Enter your comment via the message bar (Max: 500)'; 
    return new MessageEmbed()
        .setDescription('Status = '+ params.status +'\n\nType = '+params.type+'\n\nComment = '+params.comment)
        .setTimestamp();
}

function generateDmSubmittedEmbed(params) {
    params.status = params.status ? intToStatus[params.status] : 'UNKNOWN'; 
    if (!params.type) params.type = 'Please set type';
    if (!params.comment) params.comment = 'Enter your comment via the message bar (Max: 500)'; 
    return new MessageEmbed()
        .setDescription('Status = PENDING\n\nType = '+params.type+'\n\nComment = '+params.comment)
        .setTimestamp();
}

function generateDmResolvedEmbed(params) { // new response ()
    if (!params.status) params.status = 'UNKNOWN';
    if (!params.type) params.type = 'UNKNOWN';
    if (!params.remarks) params.remarks = '*no remarks*';
    return new MessageEmbed()
        .setDescription('Status = '+params.status+'\n\nType = '+params.type+'\n\nModerator Reply = '+params.remarks)
        .setTimestamp();
}

function generateDmExpiredEmbed() {
    return new MessageEmbed()
    .setColor('#d6b3f2')
    .setDescription('*ticket request has expired*');
}

function generateDmReplacedEmbed() {
    return new MessageEmbed()
    .setColor('#d6b3f2')
    .setDescription('*ticket cancelled by another ticket*');
}

function generateDmCancelledEmbed() {
    return new MessageEmbed()
    .setColor('#d6b3f2')
    .setDescription('*ticket was cancelled*');
}

function generateDmBlockedEmbed() {
    return new MessageEmbed()
    .setColor('#d6b3f2')
    .setDescription('*You\'ve been blocked from creating new tickets*');
}

function generateDmClosedEmbed(remarks) {
    let desc = '*ticket forcefully closed by moderator*'
    if (remarks) desc += '\n"' + remarks + '"';
    return new MessageEmbed()
    .setColor('#d6b3f2')
    .setDescription(desc);
}

function generateTicketEmbed(params) {
    if (!params.ticketid) return;
    if (!params.name) params.name = 'UNKNOWN';
    params.status = params.status ? intToStatus[params.status] : 'UNKNOWN'; 
    if (!params.type) params.type = 'UNKNOWN';
    if (!params.comment) params.comment = 'UNKNOWN';
    return new MessageEmbed()
    .setAuthor({name: params.name, iconURL: params.iconurl})
    .setDescription('Status = '+params.status+'\n\nType ='+params.type+'\n\nComment = '+params.comment)
    .setFooter({text:params.ticketid.toString()});
}

function generateTicketEditingEmbed() {
    return new MessageEmbed()
    .setColor('#d6b3f2')
    .setDescription('*ticket is currently being edited*');
}

function generateTicketResolvedEmbed(params, author) {
    if (!params.ticketid) return;
    if (!params.name) params.name = 'UNKNOWN';
    params.status = params.status ? intToStatus[params.status] : 'UNKNOWN'; 
    if (!params.type) params.type = 'UNKNOWN';
    if (!params.comment) params.comment = 'UNKNOWN';
    if (!params.remarks) params.remarks = '*no remarks*'; 
    return new MessageEmbed()
    .setAuthor({name: params.name, iconURL: params.iconurl})
    .setDescription('Status = '+params.status+' by ' + author +'\n\nType ='+params.type+'\n\nComment = '+params.comment+'\n\n'+'Reply = '+params.remarks)
    .setFooter({text:params.ticketid.toString()});
}

function generateTicketClosedEmbed(params) {
    if (!params.user) params.user = 'moderator';
    let desc = '*ticket forcefully closed by ' + params.user + '*';
    if (params.remarks) desc += '"\n' + params.remarks + '"';
    return new MessageEmbed()
    .setColor('#d6b3f2')
    .setDescription(desc);
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
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('CancelTicket-'+id)
            .setLabel('Cancel')
            .setStyle('DANGER')
    )];
}

function generateDmEditAction(id) {
    return [ new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId('EditTicket-'+id)
            .setLabel('Edit')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('CancelTicket-'+id)
            .setLabel('Cancel')
            .setStyle('DANGER')
        )
    ];
}

function generateTicketAction(id) {
    return [ new MessageActionRow().addComponents(
        new MessageButton()
            .setCustomId('ResolveTicket-'+id)
            .setLabel('Resolve')
            .setStyle('PRIMARY'),
        new MessageButton()
            .setCustomId('AcceptTicket-'+id)
            .setLabel('Accept')
            .setStyle('SUCCESS'),
        new MessageButton()
            .setCustomId('DenyTicket-'+id)
            .setLabel('Deny')
            .setStyle('DANGER')
    )];
}


module.exports = {
    getTestEmbed,
    getTestEmbed2,
    getContactEmbed,
    generateDmRequestEmbed,
    generateDmSubmittedEmbed,
    generateDmResolvedEmbed,
    generateDmExpiredEmbed,
    generateDmReplacedEmbed,
    generateDmCancelledEmbed,
    generateDmBlockedEmbed,
    generateDmClosedEmbed,
    generateTicketEmbed,
    generateTicketEditingEmbed,
    generateTicketResolvedEmbed,
    generateTicketClosedEmbed,
    getContactAction,
    generateDmRequestAction,
    generateDmEditAction,
    generateTicketAction
};