const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
} = require("discord.js");

const fetch = (...args) =>
  import("node-fetch").then(({ default: fetch }) => fetch(...args));

module.exports = {
  data: new SlashCommandBuilder()
    .setName("inventory")
    .setDescription("Inventory commands.")
    .addSubcommand((subcommand) =>
      subcommand
        .setName("sold-out")
        .setDescription("Mark product as sold-out in platforms.")
        .addStringOption((option) =>
          option
            .setName("sku")
            .setDescription("The SKU of the product to mark as sold-out.")
            .setRequired(true)
        )
    )
    .addSubcommand((subcommand) =>
      subcommand
        .setName("sync")
        .setDescription("Sync the current Main Inventory stocks to platforms.")
    ),

  async execute(interaction, client) {
    const validRoles = ["1185935514042388520", "1196806310524629062"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      await interaction.reply({
        content: `🔴 ERROR: This command can only be used by <@&1185935514042388520> & <@&1196806310524629062>.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const type = interaction.options.getSubcommand();

    if (type === "soldout") {
      const sku = interaction.options.getString("sku");
      await soldOutInventory(interaction, client, sku);
    }
  },
};

async function soldOutInventory(interaction, client, productSku) {
  try {
    const apiUrl = "https://jellyfish-app-yevob.ondigitalocean.app";
    const path = "/api/v1/inventory/markSoldOutProduct";

    const params = {
      sku: productSku,
    };

    const parsedParams = Object.entries(params)
      .map(([key, value]) => `${key}=${value}`)
      .join("&");

    const url = `${apiUrl}${path}?${parsedParams}`;

    const options = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.apiKey,
      },
    };

    const response = await fetch(url, options);
    const responseData = await response.json();

    console.log(responseData);
  } catch (error) {
    console.log(error.toString());
    const errorEmbed = new EmbedBuilder()
      .setDescription(`## ERROR\n${error.message}`)
      .setColor("Red");

    await interaction.editReply({
      
    });
  }
}

async function syncInventory() {
  try {
    const apiUrl = "https://jellyfish-app-yevob.ondigitalocean.app";
    const path = "/api/v1/inventory/syncInventory";

    const url = `${apiUrl}${path}`;

    const options = {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": process.env.apiKey,
      },
    };

    const response = await fetch(url, options);
    const responseData = await response.json();

    console.log(responseData);
  } catch (error) {
    console.log(error.toString());
    const errorEmbed = new EmbedBuilder()
      .setDescription(`## ERROR\n${error.message}`)
      .setColor("Red");
  }
}
