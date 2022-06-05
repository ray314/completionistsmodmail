require('dotenv').config();
const { Intents, Client } = require("discord.js");
const { Hooks } = require('./modules/hooks.js');

const client = new Client({ intents: [
    Intents.FLAGS.GUILDS, 
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES
],
partials: [
    'CHANNEL'
] });

client.once('ready', () => {
    //console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('minecraft ost', { type: 'LISTENING' });
    Hooks(client);
});

client.on('error', error => {
	console.log("Discord Error:\n"+error);
});

client.login(process.env.TOKEN);