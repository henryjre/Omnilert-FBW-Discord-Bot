const {
  ActionRowBuilder,
  ButtonBuilder,
  ButtonStyle,
  EmbedBuilder,
  StringSelectMenuOptionBuilder,
  StringSelectMenuBuilder,
  MessageFlags,
} = require("discord.js");

const { customAlphabet } = require("nanoid");
const nanoid = customAlphabet("0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ", 13);

// const conn = require("../../../sqlConnection.js");
// const pools = require("../../../sqlPools.js");

module.exports = {
  data: {
    name: "reportalTask",
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();

    try {
      // const mgmt_connection = await conn.managementConnection();
      const mgmt_connection = await pools.managementPool.getConnection();
      const member = interaction.guild.members.cache.get(interaction.user.id);
      const messagePayload = {};
      try {
        const taskId = nanoid();
        const taskName = interaction.fields.getTextInputValue("taskName");
        const taskDescription =
          interaction.fields.getTextInputValue("taskDescription");

        const messageEmbed = interaction.message.embeds[0];

        const addTaskButton = new ButtonBuilder()
          .setCustomId("reportalAddTask")
          .setLabel("Add Task")
          .setStyle(ButtonStyle.Primary);

        const changeTaskButton = new ButtonBuilder()
          .setCustomId("reportalChangeTask")
          .setLabel("Switch Task")
          .setStyle(ButtonStyle.Danger)
          .setDisabled(true);

        // const editTaskButton = new ButtonBuilder()
        //   .setCustomId("reportalTaskEdit")
        //   .setLabel("Edit Task")
        //   .setStyle(ButtonStyle.Secondary)
        //   .setDisabled(true);

        const startButton = new ButtonBuilder()
          .setCustomId("reportalStart")
          .setLabel("Start")
          .setStyle(ButtonStyle.Success)
          .setDisabled(true);

        if (messageEmbed.data.fields) {
          const fieldIndex = messageEmbed.data.fields.findIndex(
            (f) => f.name === "Current Selected Task"
          );

          if (fieldIndex == -1) {
            startButton.setDisabled(false);
            // editTaskButton.setDisabled(false);
          }
        }

        const buttonRow = new ActionRowBuilder().addComponents(
          startButton,
          addTaskButton,
          changeTaskButton
          // editTaskButton,
        );

        //end of buttons, start of select menu

        const taskMenuComponent = interaction.message.components.find(
          (c) =>
            c.components[0].data.type === 3 &&
            c.components[0].data.custom_id === "reportalTasks"
        );

        const option = new StringSelectMenuOptionBuilder()
          .setLabel(taskName)
          .setValue(`${taskId}_${taskName}`);

        if (taskDescription.length !== 0) {
          option.setDescription(taskDescription);
        }

        let taskMenu;
        if (taskMenuComponent) {
          taskMenu = new StringSelectMenuBuilder(
            taskMenuComponent.components[0].data
          );

          taskMenu.addOptions([option]);
        } else {
          taskMenu = new StringSelectMenuBuilder()
            .setCustomId("reportalTasks")
            .setPlaceholder("Select a task to do.")
            .setMinValues(0)
            .setMaxValues(1)
            .addOptions([option]);
        }

        const menuRow = new ActionRowBuilder().addComponents(taskMenu);

        const taskEmbedDescription = `\n${taskName}・**\`⏱️ 0 hours and 0 minutes\`**`;

        if (messageEmbed.data.color === 2263842) {
          messageEmbed.data.description += taskEmbedDescription;
        } else {
          messageEmbed.data.description += `\n\n**All Tasks**${taskEmbedDescription}`;
          messageEmbed.data.color = 2263842;
        }

        messagePayload.embeds = [messageEmbed];
        messagePayload.components = [menuRow, buttonRow];

        const addTaskQuery = `INSERT INTO Executive_Tasks (TASK_ID, EXECUTIVE_ID, EXECUTIVE_NAME, TASK_NAME, TASK_DESCRIPTION) VALUES (?, ?, ?, ? ,?)`;
        const [insert] = await mgmt_connection.query(addTaskQuery, [
          taskId,
          member.user.id,
          member.nickname,
          taskName,
          taskDescription ? taskDescription : null,
        ]);

        if (insert.affectedRows === 1) {
          await interaction.editReply(messagePayload);
        } else {
          throw new Error(
            "There was an error while adding your task, please try again."
          );
        }
      } finally {
        // await mgmt_connection.end();
        mgmt_connection.release();
      }
    } catch (error) {
      console.log(error.stack);
      await interaction.followUp({
        content: `🔴 ERROR: ${error.message}.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};
