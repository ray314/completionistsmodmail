require('dotenv').config();
const { IntentsBitField, Client, ActivityType } = require("discord.js");
const { Hooks } = require('./modules/hooks.js');
const express = require('express')
const app = express()
const PORT = process.env.PORT || 3000;

const client = new Client({ intents: [
    IntentsBitField.Flags.Guilds, 
    IntentsBitField.Flags.GuildMessages,
    IntentsBitField.Flags.DirectMessages
],
partials: [
    'CHANNEL'
] });

client.once('ready', () => {
    console.log(`Logged in as ${client.user.tag}!`);
    client.user.setPresence({
        activities: [{ name: 'bald eagle', type: ActivityType.Listening}],
        status: 'bald eagle'
    })
    //client.user.setActivity('bald eagle', { type: 'LISTENING' });
    Hooks(client);
});

client.on('error', error => {
	console.log("Discord Error:\n"+error);
});

client.login(process.env.TOKEN);

app.listen(PORT, () => {
    console.log(`Our app is running on port ${ PORT }`);
});