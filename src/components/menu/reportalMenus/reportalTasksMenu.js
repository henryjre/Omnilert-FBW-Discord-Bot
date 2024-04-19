module.exports = {
  data: {
    name: `reportalTasks`,
  },
  async execute(interaction, client) {
    await interaction.deferUpdate();

    try {
      if (interaction.message.interaction.user.id !== interaction.user.id) {
        await interaction.reply({
          content: `You cannot use this button.`,
          ephemeral: true,
        });
        return;
      }

      const messagePayload = {};

      const messageEmbed = interaction.message.embeds[0].data;
      const selectedTask = interaction.values[0];

      const [taskId, taskName] = selectedTask.split("_");

      if (messageEmbed.fields) {
        const currentTaskFieldIndex = messageEmbed.fields.findIndex(
          (f) => f.name === "Current Selected Task"
        );
        const taskIdFieldIndex = messageEmbed.fields.findIndex(
          (f) => f.name === "Task ID"
        );

        messageEmbed.fields[currentTaskFieldIndex].value = taskName;
        messageEmbed.fields[taskIdFieldIndex].value = taskId;
      } else {
        messageEmbed.fields = [
          {
            name: "Current Selected Task",
            value: taskName,
          },
          {
            name: "Task ID",
            value: taskId,
          },
        ];
      }

      const messageComponents = interaction.message.components;
      messageComponents[1].components[1].data.disabled = false;
      //   messageComponents[1].components[2].data.disabled = false;

      messagePayload.embeds = [messageEmbed];
      messagePayload.components = messageComponents;

      await interaction.editReply(messagePayload);
    } catch (error) {
      console.log(error.stack);
      await interaction.followUp({
        content: `🔴 ERROR: ${error.message}.`,
        ephemeral: true,
      });
    }
  },
};
