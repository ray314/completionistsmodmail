//const config = require('../config.json');
const config = require('../testing-config.json');
const { getContactEmbed, generateDmRequestEmbed, generateDmSubmittedEmbed, generateDmExpiredEmbed, generateDmReplacedEmbed, generateDmBlockedEmbed, generateTicketEditingEmbed, generateTicketResolvedEmbed, generateDmClosedEmbed, getContactAction, generateDmRequestAction, generateDmEditAction, generateTicketEmbed, generateTicketAction, generateDmResolvedEmbed, generateTicketClosedEmbed } = require('./source.js');
const db = require('./database.js');

function Hooks(client) {
    const expiration = expiryTimeout(client);

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
                case '.unblock':
                    unblockUser(message);
                    break;
                case '.blocked':
                    listBlocked(message);
                    break;
                case '.accept':
                    resolveTicket(message, 5);
                    break;
                case '.deny':
                    resolveTicket(message, 6);
                    break;
                case '.resolve':
                    resolveTicket(message, 4);
                    break;
                case '.close':
                    closeTicket(message);
                    break;
            }
        } else {
            if (message.channel.type === 'DM') { // Discord.JS doesnt support TextInputInteractions as of 13.7
                db.getRequest(message.author.id).then(result => {
                    if (result && result.ticketid) {
                        db.setComment(result.ticketid, message.author.id, content.substring(0, 500)).then(() => {
                            message.channel.messages.fetch(result.responseid).then(response => {
                                if (response.embeds.length < 1) return;
                                result.comment = content.substring(0, 500);
                                response.edit({embeds:[generateDmRequestEmbed(result)]}).then(() => {
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
                 db.getRequest(interaction.user.id).then(result => {
                    if (!result) return; 
                    interaction.message.edit({embeds:[generateDmRequestEmbed(result)]}).then(() => {
                        return interaction.reply({content:'Changed ticket type to ' + type, ephemeral:true});
                    }).catch(error => console.log(error));
                });
            }).catch(error => {
                switch(error) {
                    case 'INVALID_USER':
                        break;
                    case 'NO_TICKET':
                        return interaction.reply({content:'Failed to identify ticket, please request a new one.\nIf this problem persists please contact a moderator directly', ephemeral:true});
                }
            });;
            
        } else if (interaction.customId.includes('SubmitTicket')) {
            submitTicket(interaction);
        } else if (interaction.customId.includes('EditTicket')) {
            if (!interaction.isButton()) return;
            const id = parseTicketId(interaction.customId);
            if (!id) return interaction.reply({content:'Failed to identify ticket, please request a new one.\nIf this problem persists contact a moderator directly', ephemeral:true});
            db.getTicket(id).then(result => {
                if (!result || result.status && result.status != 2) return;
                db.setStatus(id, interaction.user.id, 3).then(() => {
                    fetchTicketMessage(client, result.messageid).then(ticket => {
                        ticket.edit({embeds:[generateTicketEditingEmbed()],components:[]});
                    });
                    result.status = 3;
                    interaction.message.edit({embeds:[generateDmRequestEmbed(result)],components:generateDmRequestAction(id)}).then(() => {
                        return interaction.reply({content:'Your ticket is now being edited.', ephemeral:true});
                    });
                });
            });
        } else if (interaction.customId.includes('CancelTicket')) {
            cancelTicket(interaction);
        }
    });
}
//////////////////////////////////////////////////////////
// Top Level Functions

function openTicket(interaction) { //  I think this control flow is good for now
    db.isBlocked(interaction.user.id).then(blocked => {
        if (blocked) return interaction.reply({content:'You\'re blocked from creating new tickets.',ephemeral:true});;
        interaction.user.send({embeds:[generateDmRequestEmbed({status: 1})]}).then(async message => {
            db.getRequest(interaction.user.id).then(async result => {
                if (result && result.ticketid) { 
                    var ticketid = result.ticketid;
                    const response = await fetchTicketResponse(interaction.client, result.userid, result.responseid);
                    if (response) await response.edit({embeds:[generateDmReplacedEmbed()],components:[]});;
                    if (result.status == 1) await db.resetRequest(ticketid, interaction.user.id);
                } else {
                    result = {status:1};
                    var ticketid = await db.createRequest(interaction.user, message.id);
                }
                message.edit({embeds:[generateDmRequestEmbed(result)],components:generateDmRequestAction(ticketid)});
                interaction.reply({content:'Please continue your ticket request in DMs.',ephemeral:true});
            });
        }).catch(() => {
            interaction.reply({content:'Your DMs need to be open in order to request a ticket.',ephemeral:true});
        });
    });
}

function submitTicket(interaction) {
    if (!interaction.isButton()) return;
    const id = parseTicketId(interaction.customId);
    if (!id) return interaction.reply({content:'Failed to identify ticket, please request a new one.\nIf this problem persists please contact a moderator directly', ephemeral:true});
    
    db.getTicket(id).then(async result => {
        if (!result || !result.status || (result.status != 1 && result.status != 3)) return;
        if (!result.type) return interaction.reply({content:'Please set an appeal type.', ephemeral:true});
        if (!result.comment) return interaction.reply({content:'Please send a message via the message bar below and tell us how we can help you. (Max 500 Characters)', ephemeral:true});
        result.status = 2;
        fetchTicketChannel(interaction.client).then(async channel => {
            if (result.messageid) {
                var ticket = await channel.messages.fetch(result.messageid);
                await ticket.edit({embeds:[generateTicketEmbed(result)],components:generateTicketAction()});
            } else {
                var ticket = await channel.send({embeds:[generateTicketEmbed(result)],components:generateTicketAction()});
            }

            db.submitTicket(id, interaction.user.id, ticket.id).then(() => {
                interaction.reply({content:'Submitted ticket! Someone from our mod team will review your request shortly.', ephemeral:true});
                interaction.message.edit({embeds:[generateDmSubmittedEmbed(result)],components:generateDmEditAction(id)});
            });
        });
    });
}

// .sendcontact : MOD/GUILD/DM : resends the contact embed
function sendSupportContact (message) {
    isValid(message, message.author).then(valid => {
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
    isValid(message, message.author).then(valid => {
        if (!valid) return;
        message.client.channels.fetch(config.SupportChannelID).then(channel => { // Fetch support chanmel
            if (!channel) return message.react('❌');
            channel.messages.fetch({limit:100}).then(messages => { // Fetch all messages
                if (!messages) return message.react('❌');
                for (const channel_message of messages.toJSON()) { // Iterate all messages
                    if (!channel_message.components) continue;
                    for (const message_component of channel_message.components) { // Iterate all components
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
    isValid(message, message.author).then(valid => {
        if (!valid) return;
        try {
            var ticket = message.reference.messageId;
        } catch {
            return message.react('❌');
        }
        
        message.channel.messages.fetch(ticket).then(ticketmessage => {
            if (ticketmessage.embeds.length < 0) return message.react('❌');  
            const id = parseInt(ticketmessage.embeds[0].footer.text); 
            if (!id) return message.react('❌');

            db.getTicket(id).then(result => {
                result.remarks = parseRemarks(message.content);
                result.status = status;
                if (message.author) {
                    if (message.author.username) {
                        var author = message.author.username;
                    } else if (message.author.id) {
                        var author = 'moderator. ID = ' + message.author.id;
                    } else {
                        var author = 'moderator'
                    }
                } else {
                    var author = 'moderator'  
                }
                ticketmessage.edit({embeds:[generateTicketResolvedEmbed(result, author)],components:[]});

                fetchTicketResponse(message.client, result.userid, result.responseid).then(response => {
                    response.delete().then(() => {
                        db.deleteTicket(id).then(() => {
                            return message.delete();
                        });
                    });
                    response.channel.send({embeds:[generateDmResolvedEmbed(result)]});
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
        const id = parseInt(interaction.message.embeds[0].footer.text); 
        if (!id) return interaction.reply({content:'error: resolveTicketInteraction, embed does not contain footer',ephemeral:true});

        db.getTicket(id).then(result => {
            result.status = status;
            if (interaction.user) {
                if (interaction.user) {
                    var author = interaction.user.username;
                } else if (interaction.user.id) {
                    var author = 'moderator. ID = ' + interaction.user.id;
                } else {
                    var author = 'moderator'
                }
            } else {
                var author = 'moderator'  
            }
            interaction.message.edit({embeds:[generateTicketResolvedEmbed(result, author)],components:[]});

            fetchTicketResponse(interaction.client, result.userid, result.responseid).then(response => {
                response.delete();
                response.channel.send({embeds:[generateDmResolvedEmbed(result)],components:[]}).then(() => {
                    db.deleteTicket(id);
                });
            });
        });
    });
}

// .block [mention|user_id] [hours]: MOD/GUILD/DM : blocks user from opening tickets
function blockUser (message) {
    isValid(message, message.author).then(valid => {
        if (!valid) return;
        var userid = parseMentionOrUser(message)
        if (!userid) return message.reply('Could not identify user. `.block [mention|user_id] [hours]`');
        var hours = message.content.match(/(?<=\s)[0-9]+$/g);
        hours = parseInt(hours);
        if (!hours) hours = 0;

        db.blockUser(userid, hours).then(() => {
            return message.react('✅');
        }).catch(() => {
            return message.react('❌');
        });

        db.getRequest(userid).then(result => {
            if (result && result.status == 1 && result.responseid) {
                fetchTicketResponse(message.client, userid, result.responseid).then(response => {
                    response.edit({embeds:[generateDmBlockedEmbed()],components:[]});
                });
            }
        });
    });
}

// .unblock [member|user_id] : MOD/GUILD/DM : blocks user from opening tickets
function unblockUser (message) {
    isValid(message, message.author).then(valid => {
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

function cancelTicket (interaction) {
    if (!interaction.isButton()) return;
    const id = parseTicketId(interaction.customId);
    if (!id) return interaction.reply({content:'Failed to identify ticket, please request a new one.\nIf this problem persists please contact a moderator directly', ephemeral:true});

    db.getTicket(id).then(async result => {
        if (!result || result.userid != interaction.user.id) return;
        db.deleteTicket(id).then(() => {
            interaction.reply({content:'Successfully cancelled ticket.',ephemeral:true});
        });
        result.status = 7;
        await interaction.message.edit({embeds:[generateDmRequestEmbed(result)],components:[]});
        if (result.messageid) {
            await fetchTicketMessage(interaction.client, result.messageid).then(message => {
                message.edit({embeds:[generateTicketEmbed(result)],components:[]});
            });
        }
    });
}

function closeTicket (message) {
    isValid(message, message.author).then(valid => {
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
            db.getTicket(id).then(result => {
                db.deleteTicket(id).then(() => {
                    const remarks = parseRemarks(message.content);
                    if (message.author) {
                        if (message.author.username) {
                            var author = message.author.username;
                        } else if (message.author.id) {
                            var author = 'moderator. ID = ' + message.author.id;
                        } else {
                            var author = 'moderator'
                        }
                    } else {
                        var author = 'moderator'  
                    }
                    ticketmessage.edit({embeds:[generateTicketClosedEmbed({user:author,remarks:remarks})],components:[]});
                    fetchTicketResponse(message.client, result.userid, result.responseid).then(response => { // 
                        response.edit({embeds:[generateDmClosedEmbed(remarks)],components:[]}).then(() => {
                            return message.delete();
                        });
                    });
                });
            });
        });
    });
}

function expiryTimeout(client) {
    db.expiredTickets().then(rows => {
        for (let row of rows) {
            db.deleteTicket(row.ticketid).then(() => {
                fetchTicketResponse(client, row.userid, row.responseid).then(response=>{
                    response.edit({embeds:[generateDmExpiredEmbed()],components:[]});
                });
            });
        }
    });

    db.expiredBlocks().then(rows => {
        for (let row of rows) {
            db.unblockUser(row.userid);
        }
    });
    return setTimeout(function(){expiryTimeout()}, 3600000);
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
            return message.content.match(/(?<=^\.block+\s)([0-9]+)/g);
        } else {
            return userid;
        }
    } catch {
        return null;
    }
}

//
//////////////////////////////////////////////////////////
module.exports = { Hooks };