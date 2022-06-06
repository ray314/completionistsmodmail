//const config = require('../config.json');
const config = require('../testing-config.json');
const { getContactEmbed, generateDmRequestEmbed, generateDmSubmittedEmbed, generateDmResolveEmbed, generateDmExpiredEmbed, generateDmReplacedEmbed, generateTicketEditingEmbed, generateTicketResolvedEmbed, getContactAction, generateDmRequestAction, generateDmEditAction, generateDmReopenAction, generateTicketEmbed, generateTicketAction, generateDmResolvedEmbed, statusToInt, intToStatus} = require('./source.js');
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
                case '.block':
                    unblockUser(message);
                    break;
                case '.blocked':
                    listBlocked(message);
                    break;
                case '.accept':
                    resolveTicket(message, 'ACCEPTED');
                    break;
                case '.deny':
                    resolveTicket(message, 'DENIED');
                    break;
                case '.resolve':
                    resolveTicket(message, 'RESOLVED');
                    break;
            }
        } else {
            if (message.channel.type === 'DM') { // Discord.JS doesnt support TextInputInteractions as of 13.7
                db.getRequest(message.author.id).then(result => {
                    if (result && result.ticketid) {
                        db.setComment(result.ticketid, message.author.id, content.substring(0, 500)).then(() => {
                            message.channel.messages.fetch(result.responseid).then(response => {
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
        } else if (interaction.customId.includes('AcceptTicket')) {
            resolveTicketInteraction(interaction, 'ACCEPTED');
        }  else if (interaction.customId.includes('DenyTicket')) {
            resolveTicketInteraction(interaction, 'DENIED');
        }  else if (interaction.customId.includes('ResolveTicket')) {
            resolveTicketInteraction(interaction, 'RESOLVED');
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
            
            db.getTicket(id).then(async result => {
                if (!result || !result.status || (result.status != 1 && result.status != 3)) return;
                if (!result.type) return interaction.reply({content:'Please set an appeal type.', ephemeral:true});
                if (!result.comment) return interaction.reply({content:'Please send a message via the message bar below and tell us how we can help you. (Max 500 Characters)', ephemeral:true});
                fetchTicketChannel(client).then(async channel => {
                    if (result.messageid) {
                        var ticket = await channel.messages.fetch(result.messageid);
                        await ticket.edit({embeds:[generateTicketEmbed(id.toString())],components:generateTicketAction()});
                    } else {
                        var ticket = await channel.send({embeds:[generateTicketEmbed(id.toString())],components:generateTicketAction()});
                    }

                    db.submitTicket(id, interaction.user.id, ticket.id).then(() => {
                        interaction.reply({content:'Submitted ticket! Someone from our mod team will review your request shortly.', ephemeral:true});
                        interaction.message.edit({embeds:[generateDmSubmittedEmbed()],components:generateDmEditAction(id)});
                    });
                });
            });
        } else if (interaction.customId.includes('EditTicket')) {
            if (!interaction.isButton()) return;
            const id = parseTicketId(interaction.customId);
            if (!id) return interaction.reply({content:'Failed to identify ticket, please request a new one.\nIf this problem persists contact a moderator directly', ephemeral:true});
            db.getTicket(id).then(result => {
                if (!result || result.status && result.status != 2) return;
                db.setStatus(id, interaction.user.id, 3).then(() => {
                    fetchTicketMessage(client, result.messageid).then(ticket => {
                        ticket.edit({embeds:[generateTicketEditingEmbed()],components:[]});
                    })
                    
                    interaction.message.edit({embeds:[generateDmRequestEmbed()],components:generateDmRequestAction(id)}).then(() => {
                        return interaction.reply({content:'Your ticket is now being edited.', ephemeral:true});
                    });
                });
            });
        } 
    });
}
//////////////////////////////////////////////////////////
// Top Level Functions

function openTicket(interaction) { //  I think this control flow is good for now
    db.getRequest(interaction.user.id).then(async result => {
        if (result && result.ticketid) { 
            var ticketid = result.ticketid;
            const response = await callTicketResponse(interaction.client, result.ticketid);
            if (!response) return;
            await response.edit({embeds:[generateDmReplacedEmbed()],components:[]});
            if (result.status == 1) await db.resetRequest(ticketid, interaction.user.id);
        } else {
            var ticketid = await db.createRequest(interaction.user.id, result.responseid);
        }
        interaction.user.send({embeds:[generateDmRequestEmbed()], components:generateDmRequestAction(ticketid)}).then(async message => {
            db.setResponse(ticketid, interaction.user.id, message.id);
            interaction.reply({content:'Please continue your ticket request in DMs.',ephemeral:true});
        });
    });
}

// .sendcontact : MOD/GUILD/DM : resends the contact embed
function sendSupportContact (message) {
    isValid(message, message.user).then(valid => {
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
    isValid(message, message.user).then(valid => {
        if (!valid) return;
        message.client.channels.fetch(config.SupportChannelID).then(channel => { // Fetch support chanmel
            if (!channel) return message.react('❌');
            channel.messages.fetch({limit:100}).then(messages => { // Fetch all messages
                if (!messages) return message.react('❌');
                for (const channel_message of messages.toJSON()) { // Iterate all messages
                    if (!channel_message.components) continue;
                    for (message_component of channel_message.components) { // Iterate all components
                        if (message_component.components.length > 0 && message_component.components[0].customId == 'OpenTicket') { // Check if component matches requestTicket
                            return channel_message.edit({embeds:[getContactEmbed()],components:getContactAction()}).then(contact => { // Update message configuration
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
    isValid(message, message.user).then(valid => {
        if (!valid) return;
        try {
            var ticket = message.reference.messageId;
        } catch {
            return message.react('❌');
        }
        
        message.channel.messages.fetch(ticket).then(ticketmessage => {
            if (ticketmessage.embeds.length < 0) return message.react('❌');  
            try { 
                var id = parseInt(ticketmessage.embeds[0].footer.text); 
            } catch {
                return message.react('❌');
            }
            if (!id) return message.react('❌');
            
            ticketmessage.edit({embeds:[generateTicketResolvedEmbed()],components:[]});

            callTicketResponse(message.client, id).then(oldresponse => {
                oldresponse.edit({embeds:[generateDmResolvedEmbed()],components:[]});
                const remarks = parseRemarks(message.content);
                oldresponse.channel.send({embeds:[generateDmResolveEmbed(status, remarks)],components:[]}).then(newresponse => {
                    db.resolveTicket(id, statusToInt[status], newresponse.id, remarks).then(() => {
                        return message.react('✅');
                    });
                });
            });
        });
    });
}

function resolveTicketInteraction (interaction, status) {
    if (!interaction.isButton()) return; 
    isValid(interaction, interaction.user).then(valid => {
        if (!valid) return;
        if (interaction.message.embeds.length < 0) return interaction.reply({content:'error: resolveTicketInteraction, message does not contain embeds',ephemeral:true});  
        try { 
            var id = parseInt(interaction.message.embeds[0].footer.text); 
        } catch {
            return interaction.reply({content:'error: resolveTicketInteraction, embed does not contain footer',ephemeral:true});
        }
        if (!id) return interaction.reply({content:'error: resolveTicketInteraction, embed does not contain footer',ephemeral:true});

        interaction.message.edit({embeds:[generateTicketResolvedEmbed()],components:[]});

        callTicketResponse(interaction.client, id).then(oldresponse => {
            oldresponse.edit({embeds:[generateDmResolvedEmbed()],components:[]});
            oldresponse.channel.send({embeds:[generateDmResolveEmbed(status)],components:[]}).then(newresponse => {
                db.resolveTicket(id, statusToInt[status], newresponse.id, null).then(() => {
                    return interaction.reply({content:'Ticket resolved. Feedback has been sent.',ephemeral:true});
                });
            });
        });
    });
}

// .block [mention|user_id] [hours]: MOD/GUILD/DM : blocks user from opening tickets
function blockUser (message) {
    isValid(message, message.user).then(valid => {
        if (!valid) return;
        var userid = parseMentionOrUser(message)
        if (!userid) return message.reply('Could not identify user. `.block [mention|user_id] [hours]');
        var hours = message.content.find(/(?<=\s)[0-9]+$/g);
        try {
            hours = parseInt(hours);
        } catch {
            var hours = 0;
        }
        db.blockUser(userid, hours).then(() => {
            return message.react('✅');
        }).catch(() => {
            return message.react('❌');
        });
    });
}

// .unblock [member|user_id] : MOD/GUILD/DM : blocks user from opening tickets
function unblockUser (message) {
    isValid(message, message.user).then(valid => {
        if (!valid) return;
        var userid = parseMentionOrUser(message)
        if (!userid) return message.reply('Could not identify user. `.unblock [mention|user_id]');
        db.unblockUser(userid).then(() => {
            return message.react('✅');
        }).catch(() => {
            return message.react('❌');
        });
    });
}

// .blocked : MOD/GUILD/DM : dm's a list of blocked users
function listBlocked (message) {
    
}

function reopenTicket (interaction) {
    
}

function cancelTicket (ticketid) {

}

//
//////////////////////////////////////////////////////////
// Sub Level Functions
function isValid (interaction, user) {
    return new Promise((resolve) => {
        if (interaction.member) {
            if (config.ModeratorRoleID.some((r)=> interaction.member.roles.cache.has(r))) {
                resolve(true);
            } else {
                resolve(false);
            }
        } else if (user) {
            fetchPrivlege(interaction.client, user).then(valid => {
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

function callTicketResponse(client, ticketid) {
    return new Promise((resolve) => {
        db.getTicket(ticketid).then(result => { // get userid from ticket
            if (!result || !result.userid) return;
            fetchTicketResponse(client, result.userid, result.responseid).then(message => {
                resolve(message);
            })
        });
    });
}

function fetchTicketResponse(client, userid, id) {
    return new Promise((resolve) => {
        client.users.fetch(userid).then(user => { // get user from userid
            if (!user) return; 
            user.createDM().then(channel => { // get dmchannel from user
                channel.messages.fetch(id).then(message => { // get response in dm channel
                    resolve(message); // return response
                }).catch(error => {
                    console.log('Error while fetching response message of ' + ticketid + '\n' + error);
                    resolve(null);
                });
            });
        });
    });
}

function callTicketMessage(client, ticketid) {
    return new Promise((resolve) => {
        db.getTicket(ticketid).then(result => { // get messageid from ticket
            if (!result || !result.messageid) return;
            fetchTicketMessage(client, result.messageid).then(message => {
                resolve(message);
            });
        });
    });
}

function fetchTicketMessage(client, id) {
    return new Promise((resolve) => {
        fetchTicketChannel(client).then(channel => { // get tickets channel
            channel.messages.fetch(id).then(message => { // get message from tickets channel
                if (!message) return; 
                resolve(message);
            }).catch(error => {
                console.log('Error while fetching ticket message of ' + ticketid + '\n' + error);
                resolve(null);
            });
        });
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

function parseTicketId(command) {
    try {
        const commands = command.split('-');
        const id = parseInt(commands[1]);
        if (id) {
            return id;
        }  else {
            return false;
        }
    } catch {
        return false;
    }
}

function parseRemarks(command) {
    try {
        return command.match(/(?<=^\.[A-Za-z]+\s)([\s\S]+)/g)[0];
    } catch {
        return null;
    }
}

function parseMentionOrUser(message) {
    try {
        var userid = message.mentions.users.firstKey();
        if (!userid) {
            return message.content.find(/(?<=^\.block+\s)([0-9]+)/g);
        }
    } catch {
        return null;
    }
}

//
//////////////////////////////////////////////////////////
module.exports = { Hooks };