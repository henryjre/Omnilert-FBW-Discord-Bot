const { Client, Collection, GatewayIntentBits, Partials } = require('discord.js');
const fs = require('fs');

require('dotenv').config({ path: 'src/.env' });

const client = new Client({
  intents: [
    GatewayIntentBits.Guilds,
    GatewayIntentBits.GuildMessages,
    GatewayIntentBits.GuildMembers,
    GatewayIntentBits.MessageContent,
    GatewayIntentBits.GuildMessageReactions,
    GatewayIntentBits.GuildIntegrations,
    GatewayIntentBits.GuildVoiceStates,
    GatewayIntentBits.GuildScheduledEvents
  ],
  partials: [Partials.Channel, Partials.Message, Partials.Reaction]
});

client.commands = new Collection();
client.events = new Collection();
client.buttons = new Collection();
client.selectMenus = new Collection();
client.modals = new Collection();
client.cooldowns = new Collection();
client.commandArray = [];

const functionFolders = fs.readdirSync(`./src/functions`).filter((folder) => folder !== 'code');
for (const folder of functionFolders) {
  const functionFiles = fs
    .readdirSync(`./src/functions/${folder}`)
    .filter((file) => file.endsWith('.js'));
  for (const file of functionFiles) require(`./functions/${folder}/${file}`)(client);
}

client.handleEvents();
client.handleCommands();
client.handleComponents();

if (process.env.node_env === 'prod') {
  client.login(process.env.prodToken);
} else if (process.env.node_env === 'test') {
  client.login(process.env.testToken);
}

module.exports = client;

if (process.env.node_env === 'prod') {
  require('./webhook/app.js');
}
require('./sqliteConnection.js');
require('./zkteco/zkteco.js');

