const {
  ModalBuilder,
  TextInputBuilder,
  TextInputStyle,
  EmbedBuilder,
  MessageFlags,
  LabelBuilder,
} = require('discord.js');
const moment = require('moment-timezone');

const { editAttendance } = require('../../../odooRpc.js');
const { decrementThreadApprovals, getThreadApprovals } = require('../../../sqliteFunctions');
const { isScheduleChannel, updateStarterMessageApprovals } = require('../../../functions/helpers/approvalCounterUtils');

const hrRoleId = '1314815153421680640';

module.exports = {
  data: {
    name: `attendanceLogReject`,
  },
  async execute(interaction, client) {
    if (!interaction.member.roles.cache.has(hrRoleId)) {
      await interaction.reply({
        content: `🔴 ERROR: You cannot use this button.`,
        flags: MessageFlags.Ephemeral,
      });
      return;
    }

    const messageEmbed = interaction.message.embeds[0];

    const modal = new ModalBuilder()
      .setCustomId(`rejectRequest_${interaction.id}`)
      .setTitle(`Attendance Log Rejection`);

    const details = new TextInputBuilder()
      .setCustomId(`reasonInput`)
      .setStyle(TextInputStyle.Paragraph)
      .setRequired(true);

    const detailsLabel = new LabelBuilder()
      .setLabel('Reason for Rejection')
      .setDescription('Add the reason for rejection.')
      .setTextInputComponent(details);

    modal.addLabelComponents(detailsLabel);
    await interaction.showModal(modal);

    const modalResponse = await interaction.awaitModalSubmit({
      filter: async (i) => {
        const f =
          i.customId === `rejectRequest_${interaction.id}` && i.user.id === interaction.user.id;

        if (f) {
          await i.deferUpdate();
        }
        return f;
      },
      time: 120000,
    });

    try {
      if (modalResponse.isModalSubmit()) {
        const details = modalResponse.fields.getTextInputValue('reasonInput');
        const rejectedBy = interaction.member.nickname.replace(/^[🔴🟢]\s*/, '');

        const discordUserField = messageEmbed.data.fields.find((f) => f.name === 'Discord User');
        const discordUser = cleanFieldValue(discordUserField.value);

        messageEmbed.data.fields.push(
          {
            name: 'Status',
            value: '🔴 | Rejected',
          },
          {
            name: 'Reason for Rejection',
            value: `*${details}*`,
          }
        );

        messageEmbed.data.footer = {
          text: `Rejected By: ${rejectedBy}`,
        };

        messageEmbed.data.color = 15548997;

        const messagePayload = {
          embeds: [messageEmbed],
          components: [],
        };

        const replyEmbed = new EmbedBuilder().setColor('Red');

        if (messageEmbed.data.description.includes('EARLY ATTENDANCE APPROVAL')) {
          const response = await rejectEarlyCheckIn(interaction, client);
          if (!response.ok) {
            throw new Error(response.message);
          }
          replyEmbed.setDescription(
            `### Your early check in has been rejected. Your check in time has been updated.`
          );
          replyEmbed.addFields({
            name: 'New Check-In Time',
            value: `⏱️ | ${response.timestamp}`,
          });
        } else if (messageEmbed.data.description.includes('LATE CHECKOUT APPROVAL')) {
          const response = await rejectLateCheckOut(interaction, client);
          if (!response.ok) {
            throw new Error(response.message);
          }

          const originalMessage = await interaction.channel.fetchStarterMessage();
          const originalEmbed = originalMessage.embeds[0];
          const totalWorkedTimeField = originalEmbed.data.fields.find(
            (field) => field.name === 'Total Worked Time'
          );
          totalWorkedTimeField.value = `⏱️ | ${response.timestamp}`;

          replyEmbed.setDescription(
            `### Your late checkout has been rejected. Your check out time has been updated.`
          );
          replyEmbed.addFields({
            name: 'New Check-Out Time',
            value: `⏱️ | ${response.timestamp}`,
          });
        } else if (messageEmbed.data.description.includes('TARDINESS AUTHORIZATION REQUEST')) {
          replyEmbed.setDescription(
            `### Your tardiness request has been rejected. No changes have been made to your attendance.`
          );
        } else if (messageEmbed.data.description.includes('OVERTIME PREMIUM AUTHORIZATION')) {
          replyEmbed.setDescription(
            `### Your overtime premium request has been rejected. No overtime premium has been added to your payroll.`
          );
        }

        await interaction.message.edit(messagePayload);

        // Decrement approval count if in a schedule channel
        if (interaction.channel.isThread() && isScheduleChannel(interaction.channel.parentId)) {
          try {
            // Decrement approval count in database
            decrementThreadApprovals(interaction.channel.id);

            // Get updated count
            const { current_approvals } = getThreadApprovals(interaction.channel.id);

            // Update starter message button
            await updateStarterMessageApprovals(interaction.channel, current_approvals);
          } catch (error) {
            console.error('Error tracking approval count (reject):', error.message);
          }
        }

        await interaction.channel.send({
          content: discordUser,
          embeds: [replyEmbed],
        });
      }
    } catch (error) {
      console.log(error);
      await modalResponse.followUp({
        content: `🔴 ERROR: An error occurred while rejecting the attendance log.`,
        flags: MessageFlags.Ephemeral,
      });
    }
  },
};

////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////// EARLY CHECK-IN REJECTION ///////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

async function rejectEarlyCheckIn(interaction, client) {
  const messageEmbed = interaction.message.embeds[0];

  const attendanceIdField = messageEmbed.data.fields.find(
    (field) => field.name === 'Attendance ID'
  );
  const startDateField = messageEmbed.data.fields.find(
    (field) => field.name === 'Shift Start Date'
  );

  const attendanceId = cleanFieldValue(attendanceIdField.value);
  const startDate = cleanFieldValue(startDateField.value);
  const parsedStartDate = formatDateToISOString(startDate);

  const payload = {
    attendanceId: attendanceId,
    field: 'check_in',
    timestamp: parsedStartDate,
  };

  try {
    const response = await editAttendance(payload);
    console.log(response);
    return {
      ok: true,
      message: 'Attendance updated successfully',
      timestamp: startDate,
    };
  } catch (error) {
    console.error(error);
    return { ok: false, message: 'Error updating attendance' };
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////// LATE CHECK-OUT REJECTION ///////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

async function rejectLateCheckOut(interaction, client) {
  const messageEmbed = interaction.message.embeds[0];

  const attendanceIdField = messageEmbed.data.fields.find(
    (field) => field.name === 'Attendance ID'
  );
  const endDateField = messageEmbed.data.fields.find((field) => field.name === 'Shift End Date');

  const attendanceId = cleanFieldValue(attendanceIdField.value);
  const endDate = cleanFieldValue(endDateField.value);
  const parsedEndDate = formatDateToISOString(endDate);

  const payload = {
    attendanceId: attendanceId,
    field: 'check_out',
    timestamp: parsedEndDate,
  };

  try {
    const response = await editAttendance(payload);
    console.log(response);
    return {
      ok: true,
      message: 'Attendance updated successfully',
      timestamp: endDate,
    };
  } catch (error) {
    console.error(error);
    return { ok: false, message: 'Error updating attendance' };
  }
}

////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////// HELPER FUNCTIONS ///////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

function cleanFieldValue(s) {
  return s.replace(/^[^|]*\|\s*/, '').trim();
}

function formatDateToISOString(dateString, timezone = 'Asia/Manila') {
  // Parse the date string using moment
  const parsedDate = moment.tz(dateString, 'MMMM D, YYYY [at] h:mm A', timezone);

  // Check if the date is valid
  if (!parsedDate.isValid()) {
    throw new Error(`Invalid date format: ${dateString}`);
  }

  // Format as ISO 8601 string with timezone offset
  return parsedDate.format('YYYY-MM-DDTHH:mm:ssZ');
}
