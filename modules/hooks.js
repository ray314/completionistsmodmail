const config = require('../config.json');
const src = require('./source.js');
const db = require('./database.js');

function Hooks(client) {
    client.on('messageCreate', message => {
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
            case '.block':
                blockUser(message);
                break;
            case '.blocked':
                listBlocked(message);
                break;
            case '.accept':
                resolveTicket(message, 'accepted');
            case '.deny':
                resolveTicket(message, 'denied');
            case '.resolve':
                resolveTicket(message, 'resolved');
                break;
            default:
                if (message.channel.type === 'DM' /*&& CHECK IF USER HAS REQUESTED TICKET*/) {
                    // Database set content
                }
                break;
        }
    });

    client.on('interactionCreate', interaction => {
        if (!interaction.isMessageComponent()) return;

        if (interaction.customId.includes('RequestTicket')) {
            // create ticket in db
            // send ticket dm
        } else if (interaction.customId.includes('AcceptTicket')) {
            resolveTicket(interaction, 'accepted');
        }  else if (interaction.customId.includes('DenyTicket')) {
            resolveTicket(interaction, 'denied');
        }  else if (interaction.customId.includes('ResolveTicket')) {
            resolveTicket(interaction, 'resolved');

        } else if (interaction.customId.includes('setType')) {
            const id = parseTicketId(interaction.customId);
            if (!id) return interaction.reply({content:'Failed to identify ticket, please request a new one.\nIf this problem persists please contact a moderator directly', ephemeral:true});
            if (!interaction.isSelectMenu()) return;
            if (interaction.values.length < 1) {
                var type = NULL;
            } else {
                var type = interaction.values[0];
            }
            db.setType(id, interaction.user.id, type).then(() => {
                if (success) {
                    return interaction.reply({content:'Changed type to ' + src.types[type] + '. Please send a message via the message bar below to set the comment.', ephemeral:true});
                }
            }).catch(error => {
                switch(error) {
                    case 'INVALID_USER':
                    case 'INVALID_STATUS':
                        break;
                    case 'NO_TICKET':
                        return interaction.reply({content:'Failed to identify ticket, please request a new one.\nIf this problem persists please contact a moderator directly', ephemeral:true});
                }
            });

        } else if (interaction.customId.includes('submitTicket')) {
            
        }
    });
}
//////////////////////////////////////////////////////////
// Top Level Functions

// .sendcontact : MOD/GUILD/DM : resends the contact embed
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

// .updatecontact : MOD/GUILD/DM : updates the contact embed to current configuration
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

// .accept [message] : MOD/GUILD_REPLY : accepts the replied ticket and sends the user a message through dm anonymously
// .deny [message] : MOD/GUILD_REPLY : denies the replied ticket and sends the user a message through dm anonymously
// .resolve [message] : MOD/GUILD_REPLY : resolves the replied ticket and sends the user a message through dm anonymously
function resolveTicket (message, status) {
    // updates db entry
    // updates ticket embed
    // updates dm ticket embed
}

// .block [member|user_id] : MOD/GUILD/DM : blocks user from opening tickets
function blockUser (message) {

}

// .unblock [member|user_id] : MOD/GUILD/DM : blocks user from opening tickets
function blockUser (message) {

}

// .blocked : MOD/GUILD/DM : dm's a list of blocked users
function listBlocked (message) {

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

function parseTicketId(command) {
    try {
        const commands = command.split('-');
        const id = parseInt(commands[1]);
        if (id) {
            return true;
        }  else {
            return false;
        }
    } catch {
        return false;
    }
}

//
//////////////////////////////////////////////////////////
module.exports = { Hooks };