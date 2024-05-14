const {
  SlashCommandBuilder,
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  ComponentType,
} = require("discord.js");

// const conn = require("../../sqlConnection");
const pools = require("../../sqlPools.js");
const pesoFormatter = new Intl.NumberFormat("en-PH", {
  style: "currency",
  currency: "PHP",
  maximumFractionDigits: 2,
  minimumFractionDigits: 2,
});

module.exports = {
  cooldown: 90,
  data: new SlashCommandBuilder()
    .setName("withdraw")
    .setDescription("Withdraw your commission balance.")
    .addNumberOption((option) =>
      option
        .setName("amount")
        .setDescription("The amount of your withdrawal in peso.")
        .setRequired(true)
    ),
  async execute(interaction, client) {
    const validRoles = ["1117440696891220050"];

    if (
      !interaction.member.roles.cache.some((r) => validRoles.includes(r.id))
    ) {
      await interaction.reply({
        content: `🔴 ERROR: This command can only be used by <@&1117440696891220050>.`,
        ephemeral: true,
      });
      return;
    }

    await interaction.deferReply();

    const withdrawalAmount = interaction.options.getNumber("amount");
    const streamerId = interaction.user.id;

    // const connection = await conn.managementConnection();
    const connection = await pools.managementPool.getConnection();

    const findStreamerQuery =
      "SELECT * FROM Tiktok_Livestreamers WHERE STREAMER_ID = ?";
    const [streamerData] = await connection
      .query(findStreamerQuery, [streamerId])
      .catch((err) => console.log(err));

    // await connection.end();
    connection.release();

    const withdrawals = streamerData[0].WITHDRAWALS;

    if (withdrawals <= 0) {
      const errorEmbed = new EmbedBuilder()
        .setTitle(`WITHDRAWAL ERROR`)
        .setAuthor({
          iconURL: interaction.user.displayAvatarURL(),
          name: "Livestreamer: " + interaction.user.globalName,
        })
        .setColor("Red")
        .setDescription(`🔴 Withdrawal limit reached.`)
        .setTimestamp(Date.now());

      await interaction.editReply({
        embeds: [errorEmbed],
        components: [],
      });
      return;
    }

    const balance = streamerData[0].BALANCE;
    const liab = streamerData[0].LIABILITIES;

    let withdrawalFees = withdrawalAmount * 0.15;
    if (liab === 0) {
      withdrawalFees = 0;
    } else if (liab < withdrawalFees) {
      withdrawalFees = liab;
    }

    if (balance < withdrawalAmount) {
      const errorEmbed = new EmbedBuilder()
        .setTitle(`WITHDRAWAL`)
        .setAuthor({
          iconURL: interaction.user.displayAvatarURL(),
          name: "Livestreamer: " + interaction.user.globalName,
        })
        .setColor("Red")
        .setDescription(
          `🔴 Not enough balance to withdraw \`${pesoFormatter.format(
            withdrawalAmount
          )}\`.`
        )
        .addFields([
          {
            name: "CURRENT RUNNING BALANCE",
            value: pesoFormatter.format(balance),
          },
        ])
        .setTimestamp(Date.now());

      await interaction.editReply({
        embeds: [errorEmbed],
        components: [],
      });
      return;
    }

    const netWithdrawal = withdrawalAmount - withdrawalFees;

    const remBal = balance - withdrawalAmount;
    const remLiab = liab - withdrawalFees;

    const withdrawalEmbed = new EmbedBuilder()
      .setTitle(`WITHDRAWAL REQUEST`)
      .setColor("#fae6fa")
      .setDescription(
        `**NOTES:**\n**\`WITHDRAWAL FEES\`** refers to your current liabilities.\n**\`TOTAL AMOUNT\`** is the amount that you requested minus the withdrawal fees.\n\u200b`
      )
      .addFields([
        {
          name: "CURRENT BALANCE",
          value: `💰 ${pesoFormatter.format(balance)}`,
        },
        {
          name: "CURRENT LIABILITIES",
          value: `💸 ${pesoFormatter.format(liab)}\n\u200b`,
        },
        {
          name: "WITHDRAWAL AMOUNT",
          value: `🪙 ${pesoFormatter.format(withdrawalAmount)}`,
        },
        {
          name: "LIABILITY PAYMENT",
          value: `🪙 ${pesoFormatter.format(withdrawalFees)}`,
        },
        {
          name: "NET WITHDRAWAL",
          value: `💵 ${pesoFormatter.format(netWithdrawal)}\n\u200b`,
        },
        {
          name: "REMAINING BALANCE",
          value: `💰 ${pesoFormatter.format(remBal)}`,
        },
        {
          name: "REMAINING LIABILITIES",
          value: `💸 ${pesoFormatter.format(remLiab)}`,
        },
      ])
      .setTimestamp(Date.now());

    const confirm = new ButtonBuilder()
      .setCustomId("confirmWithdrawal")
      .setLabel("Confirm")
      .setStyle(ButtonStyle.Success)
      .setDisabled(false);

    const cancel = new ButtonBuilder()
      .setCustomId("cancelWithdrawal")
      .setLabel("Cancel")
      .setStyle(ButtonStyle.Danger)
      .setDisabled(false);

    const buttonRow = new ActionRowBuilder().addComponents(confirm, cancel);

    const replyMessage = await interaction.editReply({
      embeds: [withdrawalEmbed],
      components: [buttonRow],
      fetchReply: true,
    });

    const collector = await replyMessage.createMessageComponentCollector({
      componentType: ComponentType.Button,
      time: 120000,
    });

    collector.on("end", async (i) => {
      try {
        const message = await replyMessage.channel.messages.fetch(
          replyMessage.id
        );

        const currentEmbed = message.embeds[0].data;
        if (currentEmbed.title === "WITHDRAWAL REQUEST") {
          await replyMessage.edit({
            embeds: [withdrawalEmbed],
            components: [],
          });
        }
      } catch (error) {
        console.log("withdraw.js ERROR:", error);
      }
    });

    return;
  },
};
