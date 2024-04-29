const {
  SlashCommandBuilder,
  EmbedBuilder,
  ButtonBuilder,
  StringSelectMenuOptionBuilder,
  StringSelectMenuBuilder,
  ActionRowBuilder,
  ButtonStyle,
} = require("discord.js");

const conn = require("../../sqlConnection.js");

module.exports = {
  data: new SlashCommandBuilder()
    .setName("test-in")
    .setDescription("Log in to start a task."),
  async execute(interaction, client) {
    await interaction.deferReply();
    try {
      const mgmt_connection = await conn.managementConnection();
      const member = interaction.guild.members.cache.get(interaction.user.id);
      const messagePayload = {};
      try {
        const queryTasks = `SELECT * FROM Executive_Tasks WHERE EXECUTIVE_ID = ?`;
        // const queryExecutive = `SELECT * FROM Executives WHERE MEMBER_ID = ?`;

        // const [executive] = await mgmt_connection.query(queryExecutive, [
        //   member.user.id,
        // ]);

        // if (executive[0].OFFICE_ID !== interaction.channelId) {
        //   throw new Error(
        //     `Use this command on your office channel: <#${executive[0].OFFICE_ID}>`
        //   );
        // }

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
          addTaskButton,
          //   editTaskButton,
          startButton
        );

        if (messagePayload.components) {
          messagePayload.components.push(buttonRow);
        } else {
          messagePayload.components = [buttonRow];
        }

        messagePayload.embeds = [in_embed];

        await interaction.editReply(messagePayload);
      } finally {
        await mgmt_connection.end();
      }
    } catch (error) {
      console.log(error.stack);
      await interaction.editReply({
        content: `🔴 ERROR: ${error.message}.`,
      });
    }
  },
};
