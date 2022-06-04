const { Intents, Client } = require("discord.js");
const { Hooks } = require('./modules/hooks.js');
const db = require('./modules/database.js');
const auth = require('./auth.json');
const config = require('./config.json');

const client = new Client({ intents: [
    Intents.FLAGS.GUILDS, 
    Intents.FLAGS.GUILD_MESSAGES,
    Intents.FLAGS.DIRECT_MESSAGES
] })

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setActivity('minecraft ost', { type: 'LISTENING' });
    Hooks(client);
});

client.login(auth.token);