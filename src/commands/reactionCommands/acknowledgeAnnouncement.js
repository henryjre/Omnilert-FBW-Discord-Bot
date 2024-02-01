const { EmbedBuilder } = require("discord.js");

module.exports = {
  name: "acknowledgeAnnouncement",
  async execute(reaction, user, client) {
    const message = await reaction.message.channel.messages.fetch(
      reaction.message.id
    );
    const messageEmbed = message.embeds[0];
    const userField = messageEmbed.data.fields[1];

    const mentionedUsers = message.mentions.users.map((u) => u.id);
    const mentionedRole = message.mentions.roles.map((r) => r.id);

    if (mentionedUsers.length > 0 && mentionedUsers.includes(user.id)) {
      if (
        userField.value.includes(`<@${user.id}>`) &&
        !userField.value.includes(`✔ <@${user.id}>`)
      ) {
        messageEmbed.data.fields[1].value = userField.value.replace(
          `<@${user.id}>`,
          `✔ <@${user.id}>`
        );
      }
    } else if (mentionedRole.length > 0) {
      if (userField) {
        if (
          userField.value.includes(`<@${user.id}>`) &&
          !userField.value.includes(`✔ <@${user.id}>`)
        ) {
          messageEmbed.data.fields[1].value = userField.value.replace(
            `<@${user.id}>`,
            `✔ <@${user.id}>`
          );
        } else if (!userField.value.includes(`<@${user.id}>`)) {
          messageEmbed.data.fields[1].value += `\n✔ <@${user.id}>`;
        }
      } else {
        messageEmbed.data.fields.push({
          name: "Acknowledgement",
          value: `✔ <@${user.id}>\n`,
        });
      }
    } else {
      return;
    }

    await message.edit({
      embeds: [messageEmbed],
    });
  },
};
