//const config = require('../config.json');
const config = require('../testing-config.json');
const { getContactEmbed, generateDmRequestEmbed, generateDmSubmittedEmbed, generateDmResolveEmbed, generateDmExpiredEmbed, generateDmReplacedEmbed, getContactAction, generateTicketPendingAction, generateDmRequestAction, generateDmEditAction, generateDmReopenAction, generateTicketEmbed, generateTicketAction } = require('./source.js');
const db = require('./database.js');

function Hooks(client) {
    client.on('messageCreate', message => {
        if (message.author == client) return;
        const content = message.content;
        if (!content) return;
        if (content.substring(0, 1) === '.') {
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
            }
        } else {
            if (message.channel.type === 'DM') { // Discord.JS doesnt support TextInputInteractions as of 13.7
                db.getRequest(message.author.id).then(result => {
                    if (result && result.id) {
                        db.setComment(result.id, message.author.id, content.substring(0, 500)).then(() => {
                            message.channel.messages.fetch(result.response).then(response => {
                                if (response.embeds.length < 1) return;
                                response.edit({embeds:[response.embeds[0].setDescription(content.substring(0, 500))]}).then(() => {
                                    message.react('✅');
                                });
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
        }
    });

    client.on('interactionCreate', interaction => {
        if (!interaction.isMessageComponent()) return;
        
        if (interaction.customId.includes('OpenTicket')) { 
            openTicket(interaction);            
        } else if (interaction.customId.includes('acceptTicket')) {
            resolveTicket(interaction, 'accepted');
        }  else if (interaction.customId.includes('denyTicket')) {
            resolveTicket(interaction, 'denied');
        }  else if (interaction.customId.includes('resolveTicket')) {
            resolveTicket(interaction, 'resolved');

        } else if (interaction.customId.includes('SetType')) {
            if (!interaction.isSelectMenu()) return;
            const id = parseTicketId(interaction.customId);
            if (!id) return interaction.reply({content:'Failed to identify ticket, please request a new one.\nIf this problem persists please contact a moderator directly', ephemeral:true});
            if (interaction.values.length < 1) {
                var type = NULL;
            } else {
                var type = interaction.values[0];
            }

            db.setType(id, interaction.user.id, type).then(() => {
                return interaction.reply({content:'Changed type to ' + type + '. Please send a message via the message bar below and tell us how we can help you. (Max 500 Characters)', ephemeral:true});
            }).catch(error => {
                switch(error) {
                    case 'INVALID_USER':
                        break;
                    case 'NO_TICKET':
                        return interaction.reply({content:'Failed to identify ticket, please request a new one.\nIf this problem persists please contact a moderator directly', ephemeral:true});
                }
            });
        } else if (interaction.customId.includes('SubmitTicket')) {
            // check if ready to submit
            if (!interaction.isButton()) return;
            const id = parseTicketId(interaction.customId);
            if (!id) return interaction.reply({content:'Failed to identify ticket, please request a new one.\nIf this problem persists please contact a moderator directly', ephemeral:true});
            
            db.getTicket(id).then(result => {
                if (!result || !result.status || result.status != 1) return;
                if (!result.type) return interaction.reply({content:'Please set an appeal type.', ephemeral:true});
                if (!result.comment) return interaction.reply({content:'Please send a message via the message bar below and tell us how we can help you. (Max 500 Characters)', ephemeral:true});
                fetchTicketChannel().then(channel => {
                    channel.send({embeds:[generateTicketEmbed()],components:generateTicketAction()}).then(ticket => {
                        db.submitTicket(result.id, interaction.user.id, ticket.id).then(() => {
                            interaction.reply({content:'Submitted ticket! Someone from our mod team will review your request shortly.', ephemeral:true});
                            interaction.message.edit({embeds:[generateDmSubmittedEmbed()],components:generateDmEditAction(result.id)});
                        });
                    });
                });
            });
            // send a message to tickets
            // update db
            // edit response
        }
    });
}
//////////////////////////////////////////////////////////
// Top Level Functions

function openTicket(interaction) { //  I think this control flow is good for now
    db.getRequest(interaction.user.id).then(async result => {
        if (result && result.id) {
            var ticketid = result.id;
            const response = await getOrFetchResponse(interaction.client, result.id);
            if (!response) return;
            await response.edit({embeds:[generateDmReplacedEmbed()],components:[]});
            await db.resetRequest(ticketid, interaction.user.id);
        } else {
            var ticketid = await db.createRequest(interaction.user.id, result.response);
        }
        
        interaction.user.send({embeds:[generateDmRequestEmbed()], components:generateDmRequestAction(ticketid)}).then(async message => {
            db.setResponse(ticketid, interaction.user.id, message.id);
            interaction.reply({content:'Please continue your ticket request in DMs.',ephemeral:true});
        });
    });
}

// .sendcontact : MOD/GUILD/DM : resends the contact embed
function sendSupportContact (message) {
    isValid(message).then(valid => {
        if (!valid) return;
        message.client.channels.fetch(config.SupportChannelID).then(channel => {
            if (!channel) return;
            return channel.send({embeds:[getContactEmbed()],components:getContactAction()}).then(contact => {
                if (contact) {
                    message.react('✅');
                } else {
                    message.react('❌');
                }
            });
        }).catch(error => {
            message.react('❌');
            console.log(error)
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

function fetchTicketChannel(client) {
    return new Promise((resolve, reject) => {
        client.channels.fetch(config.TicketChannelID).then(channel => {
            if (channel) {
                resolve(channel);
            } else {
                reject();
            }
        }).catch(error => {
            console.log('Error while fetching ticket channel.\n'+ error);
            reject();
        });
    });
}

function getOrFetchResponse(client, ticketid) {
    return new Promise((resolve) => {
        db.getTicket(ticketid).then(result => { // get userid from ticket
            if (!result || !result.userid) return;
            client.users.fetch(result.userid).then(user => { // get user from userid
                if (!user) return; 
                user.createDM().then(channel => { // get dmchannel from user
                    channel.messages.fetch(result.responseid).then(message => { // get response in dm channel
                        resolve(message); // return response
                    }).catch(error => {
                        console.log('Error while fetching response message of ' + ticketid + '\n' + error);
                        resolve(null);
                    });
                });
            });
        });
    });
}

function getOrFetchTicketMessage(client, ticketid) {
    return new Promise((resolve) => {
        db.getTicket(ticketid).then(result => {
            client.channels.fetch(config.TicketChannelID).then(channel => {
                channel.messages.fetch(result.messageid).then(message => {
                    resolve(message);
                }).catch(error => {
                    console.log('Error while fetching ticket message of ' + ticketid + '\n' + error);
                    resolve(null);
                });
            }).catch(error => {
                console.log('Error while fetching support channel for ' + ticketid + '\n' + error);
                resolve(null);
            });
        });
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