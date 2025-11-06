const { MessageFlags, EmbedBuilder } = require('discord.js');

const departments = require('../../../config/departments.json');
const dutyTypes = require('../../../config/duty_types.json');

const { createPlanningShift } = require('../../../odooRpc.js');

const moment = require('moment-timezone');

const hrRole = '1314815153421680640';

module.exports = {
  data: {
    name: `approveInterimDuty`
  },
  async execute(interaction, client) {
    let messageEmbed = interaction.message.embeds[0];

    const replyEmbed = new EmbedBuilder();

    const ownerFieldNames = ['Submitted By'];

    const mentionableMembers = messageEmbed.data.fields
      .filter((f) => ownerFieldNames.includes(f.name))
      .map((f) => f.value)
      .join('\n');

    if (!interaction.member.roles.cache.has(hrRole)) {
      replyEmbed.setDescription(`🔴 ERROR: You cannot use this button.`).setColor('Red');

      return await interaction.reply({
        embeds: [replyEmbed],
        flags: MessageFlags.Ephemeral
      });
    }

    await interaction.deferReply({ flags: MessageFlags.Ephemeral });

    const attendanceIdField = messageEmbed.data.fields.find((f) => f.name === 'Attendance ID');
    const branchField = messageEmbed.data.fields.find((f) => f.name === 'Branch');
    const dateField = messageEmbed.data.fields.find((f) => f.name === 'Interim Duty Date');
    const shiftStartTimeField = messageEmbed.data.fields.find((f) => f.name === 'Shift Start Time');
    const shiftEndTimeField = messageEmbed.data.fields.find((f) => f.name === 'Shift End Time');
    const shiftCoverageField = messageEmbed.data.fields.find((f) => f.name === 'Shift Coverage');
    const shiftCoverageValue = cleanFieldValue(shiftCoverageField.value);
    const shiftCoverage = dutyTypes.find(
      (d) => d.code === shiftCoverageValue.toLowerCase() || d.name === shiftCoverageValue
    );
    const submittedByField = messageEmbed.data.fields.find(
      (f) => f.name === 'Submitted By' || f.name === 'Employee'
    );

    const interimDutyData = {
      branch: branchField ? cleanFieldValue(branchField.value) : '',
      date: dateField ? cleanFieldValue(dateField.value) : '',
      shiftStartTime: shiftStartTimeField ? cleanFieldValue(shiftStartTimeField.value) : '',
      shiftEndTime: shiftEndTimeField ? cleanFieldValue(shiftEndTimeField.value) : '',
      shiftCoverage: shiftCoverage ? shiftCoverage.id : '',
      discordId: submittedByField ? extractUserId(submittedByField.value) : '',
      interimFormId: interaction.message.id
    };

    if (attendanceIdField) {
      interimDutyData.attendanceId = cleanFieldValue(attendanceIdField.value);
    }

    const department = departments.find((d) => d.name === interimDutyData.branch);

    if (!department) {
      replyEmbed.setDescription(`🔴 ERROR: Branch not found.`).setColor('Red');
      return await interaction.reply({
        embeds: [replyEmbed]
      });
    }

    const payload = createInterimDutyPayload(interimDutyData, department);

    // approve the embed first
    const approvedBy = interaction.member.nickname.replace(/^[🔴🟢]\s*/, '');

    messageEmbed.data.footer = {
      text: `Approved By: ${approvedBy}`
    };
    messageEmbed.data.color = 5763719;

    // await interaction.message.edit({
    //   embeds: [messageEmbed],
    //   components: []
    // });

    replyEmbed
      .setDescription(
        `🟢 Successfully approved the interim duty form. A planning shift will be created shortly.`
      )
      .setColor('Green');

    await interaction.editReply({
      embeds: [replyEmbed]
    });

    await createPlanningShift(payload).then((res) => {
      console.log('Planning shift created:', res);
    });
  }
};

function cleanFieldValue(s) {
  return s.replace(/^[^|]*\|\s*/, '').trim();
}

function extractUserId(mention) {
  return mention.match(/<@!?(\d+)>/)?.[1] ?? null;
}

function createInterimDutyPayload(interimDutyData, department) {
  try {
    console.log('interimDutyData', interimDutyData);
    const dutyDate = moment(interimDutyData.date, 'MMMM DD, YYYY');

    let startDateTime, endDateTime;

    if (interimDutyData.attendanceId) {
      startDateTime = moment(interimDutyData.shiftStartTime, 'MMMM DD, YYYY [at] h:mm A').format(
        'YYYY-MM-DD HH:mm:ss'
      );
      endDateTime = moment(interimDutyData.shiftEndTime, 'MMMM DD, YYYY [at] h:mm A').format(
        'YYYY-MM-DD HH:mm:ss'
      );
    } else {
      const startTime = moment(interimDutyData.shiftStartTime, 'h:mm A');
      const endTime = moment(interimDutyData.shiftEndTime, 'h:mm A');
      startDateTime = dutyDate
        .clone()
        .hour(startTime.hour())
        .minute(startTime.minute())
        .second(0)
        .format('YYYY-MM-DD HH:mm:ss');

      // Check if end time is earlier than start time (crosses to next day)
      if (endTime.isBefore(startTime)) {
        // Add one day to the end date
        endDateTime = dutyDate
          .clone()
          .add(1, 'day')
          .hour(endTime.hour())
          .minute(endTime.minute())
          .second(0)
          .format('YYYY-MM-DD HH:mm:ss');
      } else {
        // Same day
        endDateTime = dutyDate
          .clone()
          .hour(endTime.hour())
          .minute(endTime.minute())
          .second(0)
          .format('YYYY-MM-DD HH:mm:ss');
      }
    }

    const payload = {
      x_discord_id: interimDutyData.discordId,
      start_datetime: startDateTime,
      end_datetime: endDateTime,
      company_id: department.id
    };

    if (interimDutyData.attendanceId) {
      payload.x_attendance_id = interimDutyData.attendanceId;
    }

    if (interimDutyData.shiftCoverage) {
      payload.role_id = interimDutyData.shiftCoverage;
    }

    if (interimDutyData.interimFormId) {
      payload.x_interim_form_id = interimDutyData.interimFormId;
    }

    return payload;
  } catch (error) {
    console.error('Error creating interim duty payload:', error);
    throw new Error('Failed to create interim duty payload: ' + error.message);
  }
}
