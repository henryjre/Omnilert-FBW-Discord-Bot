const { REST } = require("@discordjs/rest");
const { Routes } = require("discord-api-types/v10");
const fs = require("fs");
const path = require("path");
const chalk = require("chalk");

module.exports = (client) => {
  client.handleCommands = async () => {
    const commandFolders = fs.readdirSync("./src/commands");

    for (const folder of commandFolders) {
      const folderPath = `./src/commands/${folder}`;
      if (!fs.lstatSync(folderPath).isDirectory()) continue; // Skip if not a directory

      const { commands, commandArray } = client;

      // Load commands inside the main folder (e.g., `./src/commands/managementCommands/example.js`)
      const commandFiles = fs
        .readdirSync(folderPath)
        .filter((file) => file.endsWith(".js"));

      for (const file of commandFiles) {
        const command = require(`../../commands/${folder}/${file}`);
        commands.set(command.data.name, command);

        if (command.pushToArray !== false) {
          commandArray.push(command.data.toJSON());
        }
      }

      // Load commands from subfolders
      const subFolders = fs
        .readdirSync(folderPath)
        .filter((sub) =>
          fs.lstatSync(path.join(folderPath, sub)).isDirectory()
        );

      for (const subFolder of subFolders) {
        const subFolderPath = path.join(folderPath, subFolder);
        const subCommandFiles = fs
          .readdirSync(subFolderPath)
          .filter((file) => file.endsWith(".js"));

        for (const file of subCommandFiles) {
          const command = require(`../../commands/${folder}/${subFolder}/${file}`);
          commands.set(command.data.name, command);

          if (command.pushToArray !== false) {
            commandArray.push(command.data.toJSON());
          }
        }
      }
    }

    let clientId, token;
    const guildId = process.env.prodGuildId;

    if (process.env.node_env === "prod") {
      clientId = process.env.prodClientId;
      token = process.env.prodToken;
    } else if (process.env.node_env === "test") {
      clientId = process.env.testClientId;
      token = process.env.testToken;
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
