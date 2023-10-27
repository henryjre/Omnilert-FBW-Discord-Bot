const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v9");
const fs = require("fs");
const chalk = require("chalk");
require("dotenv").config({ path: "src/.env" });

module.exports = (client) => {
  client.handleCommands = async () => {
    const commandFolders = fs.readdirSync("./src/commands");
    for (const folder of commandFolders) {
      const commandFiles = fs
        .readdirSync(`./src/commands/${folder}`)
        .filter((file) => file.endsWith(".js"));

      const { commands, commandArray } = client;

      switch (folder) {
        case "staffCommands":
          for (const file of commandFiles) {
            const command = require(`../../commands/${folder}/${file}`);
            commands.set(command.data.name, command);
            commandArray.push(command.data.toJSON());
            // console.log(`Command: ${command.data.name} has been passed throught the handler`);
          }
          break;
        case "inventoryCommands":
          for (const file of commandFiles) {
            const command = require(`../../commands/${folder}/${file}`);
            commands.set(command.name, command);
            // commandArray.push(command.data.toJSON());
            // console.log(`Command: ${command.data.name} has been passed throught the handler`);
          }
          break;

        default:
          break;
      }
    }

    const clientId = "1048079490493993000";
    const testClientId = "1166638042698747924";
    const guildId = "1049165537193754664";
    const rest = new REST({ version: "9" }).setToken(process.env.testingBotToken);
    try {
      console.log(chalk.blue("Started refreshing application (/) commands."));

      await rest.put(Routes.applicationGuildCommands(testClientId, guildId), {
        body: client.commandArray,
      });

      console.log(
        chalk.blue("Successfully reloaded application (/) commands.")
      );
    } catch (error) {
      console.error(error);
    }
  };
};
