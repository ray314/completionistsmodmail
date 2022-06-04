//const config = require('../config.json');
const config = require('../testing-config.json');
const src = require('./source.js');
const db = require('./database.js');

function Hooks(client) {
    client.on('messageCreate', message => {
        const content = message.content;
        if (!content) return;
        if (content.substring(0, 1) != '.') return;
        const command = content.split(' ');
        switch(command[0]) {
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
                if (message.channel.type === 'DM') {
                    db.getRequest(message.author.id).then(result => {
                        if (result && result.id) {
                            db.setComment(result.id, message.author.id, content.substring(0, 500)).then(() => {
                                message.channel.messages.fetch(result.response).then(response => {
                                    if (response.embeds.length < 1) return;
                                    response.edit([response.embeds[0].setDescription(content.substring(0, 500))]);
                                }).catch(error => console.log(error));
                            }).catch(error => {
                                switch(error) {
                                    case 'INVALID_USER':
                                        break;
                                    case 'NO_TICKET':
                                        break;
                                }
                            });
                        } else {
                            return;
                        }
                    });
                }
                break;
        }
    });

    client.on('interactionCreate', interaction => {
        if (!interaction.isMessageComponent()) return;

        if (interaction.customId.includes('RequestTicket')) { // This command is a mess rn. getrequest > delete previous response > create/update ticket > send new response > update ticket with new message id   
            db.getRequest(interaction.user.id).then(result => {
                let customEmbed = Object.assign(Object.create(Object.getPrototypeOf(src.embeds.dmRequestEmbed)), src.embeds.dmRequestEmbed);
                let customAction = Object.assign(Object.create(Object.getPrototypeOf(src.actions.dmRequestAction)), src.actions.dmRequestAction);
                for (const component of customAction.components) {
                    component.setCustomId(component.customId+=result.id)
                }
                interaction.user.send({embeds:[customEmbed], components:[customAction]}).then(async message => {
                    if (result && result.response) {
                        message.channel.messages.fetch(result.response).then(oldmessage => {
                            oldmessage.edit();
                        }).catch(error=>console.log(error));
                        db.resetRequest(result.id, message.id);
                    } else {
                        db.createRequest(interaction.user.id, message.id).then();
                    }
                });
            });
        } else if (interaction.customId.includes('acceptTicket')) {
            resolveTicket(interaction, 'accepted');
        }  else if (interaction.customId.includes('denyTicket')) {
            resolveTicket(interaction, 'denied');
        }  else if (interaction.customId.includes('resolveTicket')) {
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
                return interaction.reply({content:'Changed type to ' + src.types[type] + '. Please send a message via the message bar below to set the comment.', ephemeral:true});
            }).catch(error => {
                switch(error) {
                    case 'INVALID_USER':
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
    isValid(message).then(valid => {
        if (!valid) return;
        message.client.channels.fetch(config.SupportChannelID).then(channel => {
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
    isValid(message).then(valid => {
        if (!valid) return;
        message.client.channels.fetch(config.SupportChannelID).then(channel => { // Fetch support chanmel
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

function cancelTicket (ticketid) {

}

//
//////////////////////////////////////////////////////////
// Sub Level Functions
function isValid (message) {
    return new Promise((resolve) => {
        if (message.member) {
            if (config.ModeratorRoleID.some((r)=> message.member.roles.cache.has(r))) {
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
    return new Promise((resolve) => {
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