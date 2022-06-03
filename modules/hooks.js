// .sendcontact : MOD/GUILD/DM : resends the contact embed
// .updatecontact : MOD/GUILD/DM : updates the contact embed to current configuration
// .accept [message] : MOD/GUILD_REPLY : accepts the replied ticket and sends the user a message through dm anonymously
// .deny [message] : MOD/GUILD_REPLY : denies the replied ticket and sends the user a message through dm anonymously
// .resolve [message] : MOD/GUILD_REPLY : resolves the replied ticket and sends the user a message through dm anonymously
// .edit : DM : allows the user to edit their ticket
// .reopen : DM : re opens the last ticket issued by the user
const { MessageEmbed, MessageActionRow, MessageSelectMenu } = require('discord.js');
const config = require('../config.json');

function Hooks(client) {
    client.on('messageCreate', message => {
        switch (message.channel.type) {
            case 'GUILD_TEXT':
                break;
            case 'DM':
                break;
        }
        const content = message.content;
        if (!content) return;
        const command = content.substring(0, content.indexOf(' ')).toLowerCase();
        switch(command) {
            case '.sendcontact':
                sendSupportContact(message);
                break;
            case '.updatecontact':
                updateSupportContact(message);
                break;
            case '.accept':
                resolveTicket(message, 'accepted');
            case '.deny':
                resolveTicket(message, 'denied');
            case '.resolve':
                resolveTicket(message, 'resolved');
                break;
            case '.edit':
                editTicket(message);
                break;
            case '.reopen':
                reopenTicket(message);
                break;
        }
    });
}
//////////////////////////////////////////////////////////
// Top Level Functions

function sendSupportContact (message) {
    isValid(client, message).then(valid => {
        if (!valid) return;
    });
}

function updateSupportContact (message) {
    isValid(client, message).then(valid => {
        if (!valid) return;

    })
}

function resolveTicket (message, status) {
    
}

function editTicket (message) {

}

function reopenTicket (message) {

}

//
//////////////////////////////////////////////////////////
// Sub Level Functions
function isValid (message) {
    return Promise((resolve) => {
        if (message.member) {
            if (message.member.roles.cache.hasAny(config.ModeratorRoleID)) {
                resolve(true);
            } else {
                resolve(false);
            }
        } else if (message.author) {
            fetchPrivlege(message.client, message.author).then(valid => {
                if (valid) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            });
        } else {
            resolve(false);
        }
    })
}

function fetchPrivlege (client, user) {
    return Promise((resolve) => {
        client.guilds.fetch(config.GuildID).then(guild => {
            if (!guild) return resolve(false);
            guild.members.fetch(user.id).then(member => {
                if (member && member.roles.cache.hasAny(config.ModeratorRoleID)) {
                    resolve(true);
                } else {
                    resolve(false);
                }
            }).catch(() => resolve(false));
        }).catch(() => resolve(false));
    });
}

//
//////////////////////////////////////////////////////////
module.exports = { Hooks };