// .sendcontact : MOD/GUILD/DM : resends the contact embed
// .updatecontact : MOD/GUILD/DM : updates the contact embed to current configuration
// .accept [message] : MOD/GUILD_REPLY : accepts the replied ticket and sends the user a message through dm anonymously
// .deny [message] : MOD/GUILD_REPLY : denies the replied ticket and sends the user a message through dm anonymously
// .resolve [message] : MOD/GUILD_REPLY : resolves the replied ticket and sends the user a message through dm anonymously
// .edit : DM : allows the user to edit their ticket
// .reopen : DM : re opens the last ticket issued by the user

const config = require('../config.json');
const src = require('./source.js');

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
        client.channels.fetch(config.SupportChannelID).then(channel => {
            if (!channel) return;
            return channel.send({embeds:[src.embeds.contactEmbed],components:[src.actions.contactAction]}).then(contact => {
                if (contact) {
                    message.react('✅');
                } else {
                    message.react('❌');
                }
            });
        }).catch(error => {
            message.react('❌');
        });
    });
}

function updateSupportContact (message) {
    isValid(client, message).then(valid => {
        if (!valid) return;
        client.channels.fetch(config.SupportChannelID).then(channel => { // Fetch support chanmel
            if (!channel) return message.react('❌');
            channel.message.fetch({limit:100}).then(messages => { // Fetch all messages
                if (!messages) return message.react('❌');
                for (const channel_message of messages.toJSON()) { // Iterate all messages
                    if (!channel_message.components) continue;
                    for (message_component of channel_message.components) { // Iterate all components
                        if (message_component.components.length > 0 && message_component.components[0].customId == 'RequestTicket') { // Check if component matches requestTicket
                            return channel_message.edit({embeds:[src.embeds.contactEmbed],components:[src.actions.contactAction]}).then(edited => { // Update message configuration
                                if (contact) {
                                    message.react('✅');
                                } else {
                                    message.react('❌');
                                }
                            }); 
                        }
                    }
                }
                message.react('❌');
            }).catch(error => {
                message.react('❌');
            });
        }).catch(error => {
            message.react('❌');
        });
    });
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