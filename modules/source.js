const { MessageEmbed, MessageActionRow, MessageButton, MessageSelectMenu } = require('discord.js');

const intToStatus = {
    1: "Requested",
    2: "Pending",
    3: "Editing",
    4: "Resolved",
    5: "Accepted",
    6: "Denied",
    7: "Cancelled",
    8: "Closed"
};
/*const statusToInt = {
    "REQUESTED": 1,
    "PENDING": 2,
    "EDITING": 3,
    "RESOLVED": 4,
    "ACCEPTED": 5,
    "DENIED": 6,
    "CANCELLED": 7,
    "CLOSED": 8
};*/
const statusToUrl = {
    Requested: "https://raw.githubusercontent.com/mattmular/completionistsmodmail/main/data/requested.png",
    Pending: "https://raw.githubusercontent.com/mattmular/completionistsmodmail/main/data/pending.png",
    Editing: "https://raw.githubusercontent.com/mattmular/completionistsmodmail/main/data/editing.png",
    Resolved: "https://raw.githubusercontent.com/mattmular/completionistsmodmail/main/data/resolved.png",
    Accepted: "https://raw.githubusercontent.com/mattmular/completionistsmodmail/main/data/accepted.png",
    Denied: "https://raw.githubusercontent.com/mattmular/completionistsmodmail/main/data/denied.png",
    Cancelled: "https://raw.githubusercontent.com/mattmular/completionistsmodmail/main/data/cancelled.png",
    Closed: "https://raw.githubusercontent.com/mattmular/completionistsmodmail/main/data/closed.png",
    Unknown: "https://raw.githubusercontent.com/mattmular/completionistsmodmail/main/data/unknown.png"
}

const statusToColor = {
    Requested: "#38d77f",
    Pending: "#ffae12",
    Editing: "#cd75fb",
    Resolved: "#5865F2",
    Accepted: "#3BA55C",
    Denied: "#ED4245",
    Cancelled: "#ED4245",
    Closed: "#9c9c9c",
    Unknown: "#36393E"
}



// -- EMBEDS -- \\\
function getContactEmbed() {
    return new MessageEmbed()
    .setColor('#5865F2')
    .setDescription('Click the button below to request a support ticket!\nMake sure you\'ve read everything here first.');
}

function generateDmRequestEmbed(params) {
    let title = params.status == 3 ? 'Editing Ticket' : 'Ticket Request';
    var status = params.status ? intToStatus[params.status] : 'UNKNOWN'; 
    if (!params.type) params.type = 'Please set type';
    if (!params.comment) params.comment = 'Enter your comment via the message bar (Max: 500 Characters)';
    return new MessageEmbed()
        .setTitle(title)
        .setColor(statusToColor[status])
        .setThumbnail(statusToUrl[status])
        .addFields(
            { name: 'Type', value: params.type},  
            { name: 'Comment', value: params.comment},
        )
        .setTimestamp();
}

function generateDmSubmittedEmbed(params) {
    var status = params.status ? intToStatus[params.status] : 'UNKNOWN'; 
    if (!params.type) params.type = 'UNKNOWN';
    if (!params.comment) params.comment = 'UNKNOWN'; 
    return new MessageEmbed()
        .setTitle(params.type)
        .setColor(statusToColor[status])
        .setThumbnail(statusToUrl[status])
        .setDescription(params.comment)
        .addFields(
            { name: '\u200B', value: '\u200B' },
            { name: 'Thank You', value: 'Your request is under review.'}
        )
        .setTimestamp();
}

function generateDmResolvedEmbed(params) { 
    var status = params.status ? intToStatus[params.status] : 'UNKNOWN'; 
    if (!params.type) params.type = 'UNKNOWN';
    if (!params.remarks) params.remarks = '*no remarks*';
    return new MessageEmbed()
        .setTitle(params.type)
        .setColor(statusToColor[status])
        .setThumbnail(statusToUrl[status])
        .setDescription(params.comment)
        .addFields(
            { name: '\u200B', value: '\u200B' },
            { name: 'Your Request was '+ status, value: '"' + params.remarks + '"' }
        )
        .setTimestamp();
}

function generateDmExpiredEmbed() {
    return new MessageEmbed()
    .setColor(statusToColor.Closed)
    .setDescription('*ticket request has expired*');
}

function generateDmReplacedEmbed() {
    return new MessageEmbed()
    .setColor(statusToColor.Closed)
    .setDescription('*ticket was cancelled by another ticket*');
}

function generateDmCancelledEmbed() {
    return new MessageEmbed()
    .setColor(statusToColor.Cancelled)
    .setDescription('*ticket was cancelled*');
}

function generateDmBlockedEmbed() {
    return new MessageEmbed()
    .setColor(statusToColor.Closed)
    .setDescription('*you are blocked from creating new tickets*');
}

function generateDmClosedEmbed(remarks) {
    let desc = '*ticket forcefully closed by moderator*'
    if (remarks) desc += '\n"' + remarks + '"';
    return new MessageEmbed()
    .setColor(statusToColor.Closed)
    .setDescription(desc);
}

function generateTicketEmbed(params) {
    if (!params.ticketid) return console.log('Error S001: No TicketID found in params:\n' + params);
    if (!params.name) params.name = params.userid ? "ID: " + params.userid : "UNKNOWN";
    var status = params.status ? intToStatus[params.status] : 'UNKNOWN'; 
    if (!params.type) params.type = 'UNKNOWN';
    if (!params.comment) params.comment = 'UNKNOWN';
    return new MessageEmbed()
        .setAuthor({name: params.name, iconURL: params.iconurl})
        .setTitle(params.type)
        .setColor(statusToColor[status])
        .setThumbnail(statusToUrl[status])
        .setDescription(params.comment)
        .setFooter({text:params.ticketid.toString()})
        .setTimestamp();
}

function generateTicketResolvedEmbed(params, author) {
    if (!params.ticketid) return;
    if (!params.name) params.name = params.userid ? "ID: " + params.userid : "UNKNOWN";
    var status = params.status ? intToStatus[params.status] : 'UNKNOWN';
    if (!params.type) params.type = 'UNKNOWN';
    if (!params.comment) params.comment = 'UNKNOWN';
    if (!params.remarks) params.remarks = '*no remarks*'; 
    return new MessageEmbed()
        .setAuthor({name: params.name, iconURL: params.iconurl})
        .setTitle(params.type)
        .setColor(statusToColor[status])
        .setThumbnail(statusToUrl[status])
        .setDescription(params.comment)
        .setFooter({text:params.ticketid.toString()})
        .addFields(
            { name: '\u200B', value: '\u200B' },
            { name: status + ' by ' + author, value: '"' + params.remarks + '"' }
        )
        .setTimestamp();
}

function generateTicketClosedEmbed(params) {
    if (!params.user) params.user = 'moderator';
    let desc = '*ticket forcefully closed by ' + params.user + '*';
    if (params.remarks) desc += '\n"' + params.remarks + '"';
    return new MessageEmbed()
    .setColor(statusToColor.Closed)
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
            .addOptions([{label:'Appeal',value:'Appeal'},{label:'Report',value:'Report'},{label:'Other',value:'Other'}])
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
    generateTicketResolvedEmbed,
    generateTicketClosedEmbed,
    getContactAction,
    generateDmRequestAction,
    generateDmEditAction,
    generateTicketAction
};