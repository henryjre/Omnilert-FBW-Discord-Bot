const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  StringSelectMenuOptionBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

// const conn = require("../../sqlConnection.js");
const pools = require("../../sqlPools.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("in")
    .setDescription("Log in to start a task.")
    .addSubcommand((subcommand) =>
      subcommand.setName("executives").setDescription("Log in for Executives.")
    )
    .addSubcommand((subcommand) =>
      subcommand.setName("associates").setDescription("Log in for Associates.")
    ),
  async execute(interaction, client) {
    try {
      const subcommand = interaction.options.getSubcommand();

      if (subcommand === "associates") {
        await client.commands.get("in-associates").execute(interaction, client);
        return;
      }

      await interaction.deferReply();
      const member = interaction.guild.members.cache.get(interaction.user.id);

      if (!member.roles.cache.has("1185935514042388520")) {
        throw new Error("Only <@&1185935514042388520> can use this command.");
      }

      const messagePayload = {};

      // const mgmt_connection = await conn.managementConnection();
      const mgmt_connection = await pools.managementPool.getConnection();
      try {
        const queryTasks = `SELECT * FROM Executive_Tasks WHERE EXECUTIVE_ID = ?`;
        const queryExecutive = `SELECT * FROM Executives WHERE MEMBER_ID = ?`;

        const [executive] = await mgmt_connection.query(queryExecutive, [
          member.user.id,
        ]);

        if (
          process.env.node_env !== "dev" &&
          executive[0].OFFICE_ID !== interaction.channelId
        ) {
          throw new Error(
            `Use this command on your office channel: <#${executive[0].OFFICE_ID}>`
          );
        }

        const [tasks] = await mgmt_connection.query(queryTasks, [
          member.user.id,
        ]);

        const in_embed = new EmbedBuilder()
          .setDescription(`## LOG IN \n*Add a task to start working.*`)
          .setColor("#4F7942")
          .setFooter({ text: `${member.nickname}` });

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
        //   .setStyle(ButtonStyle.Secondary);

        const startButton = new ButtonBuilder()
          .setCustomId("reportalStart")
          .setLabel("Start")
          .setStyle(ButtonStyle.Success)
          .setDisabled(true);

        if (tasks.length > 0) {
          const taskOptions = [];
          let taskEmbedDescription = "";
          let totalHoursRendered = 0;
          for (const task of tasks) {
            const option = new StringSelectMenuOptionBuilder()
              .setLabel(task.TASK_NAME)
              .setValue(`${task.TASK_ID}_${task.TASK_NAME}`);

            if (task.TASK_DESCRIPTION) {
              option.setDescription(task.TASK_DESCRIPTION);
            }

            taskOptions.push(option);

            const totalTaskTime = task.TIME_RENDERED;
            const totalHours = Math.floor(totalTaskTime / 60);
            const totalMinutes = totalTaskTime % 60;

            taskEmbedDescription += `${task.TASK_NAME}・**\`⏱️ ${totalHours} ${
              totalHours === 1 ? "hour" : "hours"
            } and ${totalMinutes} ${
              totalMinutes === 1 ? "minute" : "minutes"
            }\`**\n`;

            totalHoursRendered += task.TIME_RENDERED;
          }

          const taskMenu = new StringSelectMenuBuilder()
            .setCustomId("reportalTasks")
            .setPlaceholder("Select a task to do.")
            .setMinValues(0)
            .setMaxValues(1)
            .addOptions(taskOptions);

          const menuRow = new ActionRowBuilder().addComponents(taskMenu);

          messagePayload.components = [menuRow];

          const totalHours = Math.floor(totalHoursRendered / 60);
          const totalMinutes = totalHoursRendered % 60;

          const totalRenderedTime = `**\`⏱️ ${totalHours} ${
            totalHours === 1 ? "hour" : "hours"
          } and ${totalMinutes} ${
            totalMinutes === 1 ? "minute" : "minutes"
          }\`**`;

          in_embed
            .setDescription(
              `## LOG IN \n**Total Hours Rendered**・${totalRenderedTime}\n\n**All Tasks**\n${taskEmbedDescription}`
            )
            .setColor("#228B22");
        }

        const buttonRow = new ActionRowBuilder().addComponents(
          startButton,
          addTaskButton,
          changeTaskButton
          //   editTaskButton,
        );

        if (messagePayload.components) {
          messagePayload.components.push(buttonRow);
        } else {
          messagePayload.components = [buttonRow];
        }

        messagePayload.embeds = [in_embed];

        await interaction.editReply(messagePayload);
      } finally {
        // await mgmt_connection.end();
        mgmt_connection.release();
      }
    } catch (error) {
      console.log(error.stack);
      await interaction.editReply({
        content: `🔴 ERROR: ${error.message}.`,
      });
    }
  },
};
