const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
const fs = require("fs");
const chalk = require("chalk");

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
        case "tiktokCommands":
          for (const file of commandFiles) {
            const command = require(`../../commands/${folder}/${file}`);
            commands.set(command.data.name, command);
            commandArray.push(command.data.toJSON());
            // console.log(`Command: ${command.data.name} has been passed throught the handler`);
          }
          break;
        case "hiddenCommands":
          for (const file of commandFiles) {
            const command = require(`../../commands/${folder}/${file}`);
            commands.set(command.name, command);
          }
          break;
        case "reactionCommands":
          for (const file of commandFiles) {
            const command = require(`../../commands/${folder}/${file}`);
            commands.set(command.name, command);
          }
          break;

        default:
          break;
      }
    }

    const guildId = "1049165537193754664";
    let clientId, token;

    if (process.env.node_env === "prod") {
      clientId = "1048079490493993000";
      token = process.env.token;
    } else if (process.env.node_env === "dev") {
      clientId = "1166638042698747924";
      token = process.env.test;
    }

    const rest = new REST({ version: "10" }).setToken(token);
    try {
      console.log(chalk.blue("Started refreshing application (/) commands."));

      await rest.put(Routes.applicationGuildCommands(clientId, guildId), {
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
