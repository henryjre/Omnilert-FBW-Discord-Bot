const {
  EmbedBuilder,
  ChannelType,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder
} = require('discord.js');
const moment = require('moment-timezone');

const departments = require('../../../config/departments.json');
const workEntryTypes = require('../../../config/work_entry_types.json');
const client = require('../../../index');
const { searchActiveAttendance, editAttendance } = require('../../../odooRpc.js');

const managementAttendanceLogChannelId = '1314413190074994690';
const hrRoleId = '1314815153421680640';

const attendanceCheckIn = async (req, res) => {
  try {
    const { x_company_id, x_discord_id } = req.body;

    const department = departments.find((d) => d.id === x_company_id);

    if (!department) throw new Error('Department not found');

    if (x_discord_id) {
      try {
        const guild = client.guilds.cache.get('1314413189613490248');
        const discordMember = guild?.members.cache.get(x_discord_id);
        let currentNickname = discordMember.nickname || discordMember.user.username;

        if (currentNickname.includes('🔴')) {
          currentNickname = currentNickname.replace('🔴', '🟢');
        } else if (!currentNickname.startsWith('🟢')) {
          currentNickname = '🟢 ' + currentNickname;
        }

        if (department?.role) {
          const rolesToRemove = departments.map((d) => d.role).filter(Boolean);

          await discordMember.roles.remove(rolesToRemove);
          await discordMember.roles.add(department.role);
        }

        await discordMember.setNickname(currentNickname);
      } catch (error) {
        console.error('Error updating Discord member status:', error);
        // Continue execution even if Discord operations fail
      }
    }

    if (department.id === 1) {
      return await managementCheckIn(req, res);
    } else {
      return await employeeCheckIn(req, res);
    }
  } catch (error) {
    console.error('Schedule Error:', error);
    return res.status(500).json({ ok: false, message: error.message });
  }
};

const attendanceCheckOut = async (req, res) => {
  try {
    const { x_discord_id, id: attendanceId, x_company_id } = req.body;

    const department = departments.find((d) => d.id === x_company_id);

    if (!department) throw new Error('Department not found');

    if (x_discord_id) {
      try {
        const activeAttendance = await searchActiveAttendance(x_discord_id, attendanceId);

        if (activeAttendance.length <= 0) {
          const guild = client.guilds.cache.get('1314413189613490248');
          const discordMember = guild?.members.cache.get(x_discord_id);
          let currentNickname = discordMember.nickname || discordMember.user.username;

          if (currentNickname.includes('🟢')) {
            currentNickname = currentNickname.replace('🟢', '🔴');
          } else if (!currentNickname.startsWith('🔴')) {
            currentNickname = '🔴 ' + currentNickname;
          }

          await discordMember.setNickname(currentNickname);
        }
      } catch (error) {
        console.error('Error updating user nickname:', error);
        // Continue execution even if nickname update fails
      }
    }

    if (department.id === 1) {
      return await managementCheckOut(req, res);
    } else {
      return await employeeCheckOut(req, res);
    }
  } catch (error) {
    console.error('Attendance Check-Out Error:', error);
    return res.status(500).json({ ok: false, message: error.message });
  }
};

module.exports = { attendanceCheckIn, attendanceCheckOut };

////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////// MANAGEMENT ATTENDANCE /////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

const managementCheckIn = async (req, res) => {
  try {
    const {
      id,
      x_company_id,
      check_in,
      x_cumulative_minutes,
      x_discord_id,
      x_employee_avatar,
      x_employee_contact_name,
      x_prev_attendance_id,
      x_minutes_delta
    } = req.body;

    const department = departments.find((d) => d.id === x_company_id);

    if (!department) throw new Error('Department not found');

    const checkInTime = formatTime(check_in);
    const cumulative_minutes = formatMinutes(x_cumulative_minutes);

    const employeeName = x_employee_contact_name?.split('-')[1]?.trim() || 'Unknown';
    const attendanceLogChannel = client.channels.cache.get(managementAttendanceLogChannelId);

    if (!x_prev_attendance_id) {
      const embed = new EmbedBuilder()
        .setTitle('🗓️ Attendance Log')
        .addFields(
          { name: 'Employee', value: `🪪 | ${employeeName}` },
          {
            name: 'Discord User',
            value: `👤 | ${x_discord_id ? `<@${x_discord_id}>` : 'N/A'}`
          },
          { name: 'Branch', value: `🛒 | ${department?.name || 'Omnilert'}` },
          {
            name: 'Total Working Time',
            value: `🕒 | Currently Working`
          },
          {
            name: 'Check-In',
            value: `⏱️ | ${checkInTime}`
          }
        )
        .setColor('Green');

      if (x_employee_avatar) {
        embed.setThumbnail(x_employee_avatar);
      }

      const messagePayload = {
        content: `Attendance ID: ${id}`,
        embeds: [embed]
      };

      const logMessage = await attendanceLogChannel.send(messagePayload);
    } else {
      const channelMessages = await attendanceLogChannel.messages.fetch({
        limit: 100
      });

      const attendanceMessage = channelMessages.find((msg) =>
        msg.content.includes(String(x_prev_attendance_id))
      );

      if (attendanceMessage) {
        const messageEmbed = attendanceMessage.embeds[0];
        const cumulativeMinutesField = messageEmbed.data.fields?.find(
          (f) => f.name === 'Total Working Time'
        );
        if (cumulativeMinutesField) {
          cumulativeMinutesField.value = `🕒 | ${cumulative_minutes} as of last check-out`;
        }

        const newMessageEmbed = EmbedBuilder.from(messageEmbed)
          .addFields({ name: 'Check-In', value: `⏱️ | ${checkInTime}` })
          .setColor('Green');

        await attendanceMessage.edit({
          content: `Attendance ID: ${id}`,
          embeds: [newMessageEmbed]
        });
      }
    }

    return res.status(200).json({ ok: true, message: 'Attendance logged' });
  } catch (error) {
    console.error('Management Check-In Error:', error);
    return res.status(500).json({ ok: false, message: error.message });
  }
};

const managementCheckOut = async (req, res) => {
  try {
    const {
      x_discord_id,
      check_out,
      id: attendanceId,
      x_cumulative_minutes,
      x_company_id
    } = req.body;

    const department = departments.find((d) => d.id === x_company_id);

    if (!department) throw new Error('Department not found');

    const check_out_time = formatTime(check_out);
    const cumulative_minutes = formatMinutes(x_cumulative_minutes);

    const attendanceLogChannel = client.channels.cache.get(managementAttendanceLogChannelId);

    const channelMessages = await attendanceLogChannel.messages.fetch({
      limit: 100
    });

    const attendanceMessage = channelMessages.find((msg) => msg.content.includes(attendanceId));
    if (!attendanceMessage) throw new Error('Attendance message not found');

    let messageEmbed = attendanceMessage.embeds[0];

    const totalWorkingTime = messageEmbed.data.fields?.find((f) => f.name === 'Total Working Time');
    if (totalWorkingTime) totalWorkingTime.value = `⏳ | ${cumulative_minutes}`;

    messageEmbed.data.fields.push({
      name: 'Check-Out',
      value: `⏱️ | ${check_out_time}`
    });

    messageEmbed.data.color = 9807270;

    await attendanceMessage.edit({ embeds: [messageEmbed] });

    return res.status(200).json({ ok: true, message: 'Attendance updated successfully' });
  } catch (error) {
    console.error('Management Check-Out Error:', error);
    return res.status(500).json({ ok: false, message: error.message });
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////// EMPLOYEE ATTENDANCE /////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

const employeeCheckIn = async (req, res) => {
  try {
    const {
      id,
      x_company_id,
      check_in,
      x_cumulative_minutes,
      x_discord_id,
      x_employee_avatar,
      x_employee_contact_name,
      x_planning_slot_id,
      x_shift_start,
      x_shift_end,
      x_minutes_delta,
      x_prev_attendance_id
    } = req.body;

    if (!x_planning_slot_id)
      throw new Error('Planning slot not found for employee: ' + x_employee_contact_name);

    const department = departments.find((d) => d.id === x_company_id);

    if (!department) throw new Error('Department not found');

    const checkInTime = formatTime(check_in);
    const shift_start_time = formatTime(x_shift_start);
    const shift_start_date = formatDate(x_shift_start);
    const shift_end_time = formatTime(x_shift_end);
    const punctuality = evaluatePunctuality(check_in, x_shift_start);

    const employeeName = x_employee_contact_name?.split('-')[1]?.trim() || 'Unknown';
    const attendanceLogChannel = client.channels.cache.get(department.scheduleChannel);

    if (!attendanceLogChannel) throw new Error('Attendance channel not found');

    const channelMessages = await attendanceLogChannel.messages.fetch({
      limit: 100
    });
    const attendanceMessage = channelMessages.find((msg) =>
      msg.content.includes(x_planning_slot_id)
    );

    if (!attendanceMessage) throw new Error('Attendance message not found');

    let messageEmbed = attendanceMessage.embeds[0];
    const hasTotalWorkedTime = messageEmbed.data.fields?.find(
      (f) => f.name === 'Total Worked Time'
    );
    if (!hasTotalWorkedTime) {
      messageEmbed.data.fields.push({
        name: 'Total Worked Time',
        value: `⏱️ | Currently Working`
      });
    }

    await attendanceMessage.edit({ embeds: [messageEmbed] });

    let thread;
    if (attendanceMessage.hasThread) {
      thread = await attendanceMessage.thread;
    } else {
      thread = await attendanceMessage.startThread({
        name: `${shift_start_date} | ${employeeName} | ${x_planning_slot_id}`,
        type: ChannelType.PublicThread,
        autoArchiveDuration: 1440
      });
    }

    const attendanceLogEmbed = new EmbedBuilder()
      .setDescription('## 🟢 CHECK-IN')
      .addFields(
        { name: 'Attendance ID', value: `🆔 | ${id}` },
        { name: 'Timestamp', value: `⏱️ | ${checkInTime}` }
      )
      .setColor('Green');

    await thread.send({ embeds: [attendanceLogEmbed] });

    if (punctuality.status === 'on_time' || x_prev_attendance_id)
      return res.status(200).json({ ok: true, message: 'Attendance logged' });

    const title =
      punctuality.status === 'late'
        ? 'TARDINESS AUTHORIZATION REQUEST'
        : 'EARLY ATTENDANCE APPROVAL';
    const color = punctuality.status === 'late' ? '#ff00aa' : '#a600ff';
    const fieldName = punctuality.status === 'late' ? 'Tardiness' : 'Early Attendance';

    const embed = new EmbedBuilder()
      .setDescription(`## ⏰ ${title}`)
      .addFields(
        { name: 'Attendance ID', value: `🆔 | ${id}` },
        {
          name: 'Date',
          value: `📆 | ${moment().format('MMMM DD, YYYY')}`
        },
        { name: 'Employee', value: `🪪 | ${employeeName}` },
        {
          name: 'Discord User',
          value: `👤 | ${x_discord_id ? `<@${x_discord_id}>` : 'N/A'}`
        },
        {
          name: 'Branch',
          value: `🛒 | ${department?.name || 'Omnilert'}`
        },
        {
          name: 'Shift Start Date',
          value: `📅 | ${shift_start_time}`
        },
        {
          name: 'Shift End Date',
          value: `📅 | ${shift_end_time}`
        },
        { name: fieldName, value: `⏱️ | ${punctuality.readable}` }
      )
      .setColor(color);

    const messagePayload = {
      embeds: [embed]
    };

    const submit = new ButtonBuilder()
      .setCustomId('attendanceLogSubmit')
      .setLabel('Submit')
      .setDisabled(true)
      .setStyle(ButtonStyle.Success);

    const addReason = new ButtonBuilder()
      .setCustomId('tardinessAddReason')
      .setLabel('Add Reason')
      .setStyle(ButtonStyle.Primary);

    const approve = new ButtonBuilder()
      .setCustomId('attendanceLogApprove')
      .setLabel('Approve')
      .setStyle(ButtonStyle.Success);

    const reject = new ButtonBuilder()
      .setCustomId('attendanceLogReject')
      .setLabel('Reject')
      .setStyle(ButtonStyle.Danger);

    const tardinessRow = new ActionRowBuilder().addComponents(submit, addReason);
    const earlyAttendanceRow = new ActionRowBuilder().addComponents(approve, reject);

    if (punctuality.status === 'late') {
      messagePayload.components = [tardinessRow];
      messagePayload.content = `${x_discord_id ? `<@${x_discord_id}>` : department?.role}`;
    } else {
      messagePayload.components = [earlyAttendanceRow];
      messagePayload.content = `<@&${hrRoleId}>`;
    }

    await thread.send(messagePayload);

    return res.status(200).json({ ok: true, message: 'Attendance logged' });
  } catch (error) {
    console.error('Employee Check-In Error:', error.message);
    return res.status(500).json({ ok: false, message: error.message });
  }
};

const employeeCheckOut = async (req, res) => {
  try {
    const {
      x_planning_slot_id,
      x_discord_id,
      check_out,
      check_in,
      id: attendanceId,
      x_cumulative_minutes,
      x_company_id,
      x_employee_avatar,
      x_employee_contact_name,
      x_checkout_notified,
      x_shift_start,
      x_shift_end
    } = req.body;

    if (!x_planning_slot_id)
      throw new Error('Planning slot not found for employee: ' + x_employee_contact_name);

    const department = departments.find((d) => d.id === x_company_id);
    if (!department) throw new Error('Department not found');

    const employeeName = x_employee_contact_name?.split('-')[1]?.trim() || 'Unknown';

    const check_out_time = formatTime(check_out);
    const check_in_time = formatTime(check_in);
    const shift_start_time = formatTime(x_shift_start);
    const shift_start_date = formatDate(x_shift_start);
    const shift_end_time = formatTime(x_shift_end);
    const cumulative_minutes = formatMinutes(x_cumulative_minutes);

    const messageContent = `${shift_start_date} | ${x_planning_slot_id}`;

    const attendanceLogChannel = client.channels.cache.get(department.scheduleChannel);
    if (!attendanceLogChannel) throw new Error('Attendance channel not found');

    const channelMessages = await attendanceLogChannel.messages.fetch({
      limit: 100
    });

    const attendanceMessage = channelMessages.find((msg) => msg.content.includes(messageContent));
    if (!attendanceMessage) throw new Error('Attendance message not found');

    let messageEmbed = attendanceMessage.embeds[0];
    const hasTotalWorkedTime = messageEmbed.data.fields?.find(
      (f) => f.name === 'Total Worked Time'
    );
    if (!hasTotalWorkedTime) {
      messageEmbed.data.fields.push({
        name: 'Total Worked Time',
        value: `⏱️ | ${cumulative_minutes}`
      });
    } else {
      hasTotalWorkedTime.value = `⏱️ | ${cumulative_minutes}`;
    }

    let thread;
    if (attendanceMessage.hasThread) {
      thread = await attendanceMessage.thread;
    } else {
      thread = await attendanceMessage.startThread({
        name: `${shift_start_date} | ${employeeName} | ${x_planning_slot_id}`,
        type: ChannelType.PublicThread,
        autoArchiveDuration: 1440
      });
    }

    if (!isWorkValid(check_in, check_out, x_shift_start, x_shift_end)) {
      const attendanceErrorEmbed = new EmbedBuilder()
        .setDescription(
          '## ⚠️ INVALID ATTENDANCE\n\u200b\n**This attendance is outside the shift schedule and has been deleted. Please contact the management for assistance.**'
        )
        .addFields(
          { name: 'Attendance ID', value: `🆔 | ${attendanceId}` },
          { name: 'Check-In', value: `⏱️ | ${check_in_time}` },
          { name: 'Check-Out', value: `⏱️ | ${check_out_time}` },
          { name: 'Shift Start', value: `⏰ | ${shift_start_time}` },
          { name: 'Shift End', value: `⏰ | ${shift_end_time}` }
        )
        .setColor('Yellow');

      try {
        const threadMessages = await thread.messages.fetch({ limit: 100 });

        const messagesToDelete = threadMessages.filter((message) => {
          if (!message.embeds || message.embeds.length === 0) {
            return false;
          }

          return message.embeds.some((embed) => {
            const attendanceIdField = embed.fields?.find((field) => field.name === 'Attendance ID');

            if (!attendanceIdField) {
              return false;
            }

            const fieldValue = attendanceIdField.value;
            const extractedId = fieldValue.split('|')[1].trim();

            return extractedId == attendanceId;
          });
        });

        for (const message of messagesToDelete.values()) {
          await message.delete();
        }
      } catch (deleteError) {
        console.error('Error deleting previous attendance messages:', deleteError);
      }

      try {
        await editAttendance({
          attendanceId: attendanceId,
          field: 'delete'
        });
      } catch (error) {
        console.error('Error deleting attendance:', error);
      }

      await thread.send({
        content: `${x_discord_id ? `<@${x_discord_id}>` : department?.role}`,
        embeds: [attendanceErrorEmbed]
      });
      return res.status(200).json({ ok: true, message: 'Invalid attendance' });
    }

    await attendanceMessage.edit({ embeds: [messageEmbed] });

    if (x_checkout_notified) return res.status(200).json({ ok: true, message: 'Checkout logged' });

    const attendanceLogEmbed = new EmbedBuilder()
      .setDescription('## 🔴 CHECK-OUT')
      .addFields(
        { name: 'Attendance ID', value: `🆔 | ${attendanceId}` },
        { name: 'Timestamp', value: `⏱️ | ${check_out_time}` }
      )
      .setColor('Red');

    const addReason = new ButtonBuilder()
      .setCustomId('checkoutAddReason')
      .setLabel('Add Reason')
      .setStyle(ButtonStyle.Primary);

    const endShift = new ButtonBuilder()
      .setCustomId('attendanceEndShift')
      .setLabel('End Shift')
      .setStyle(ButtonStyle.Danger);

    const buttonRow = new ActionRowBuilder().addComponents(addReason, endShift);

    await thread.send({
      content: `${
        x_discord_id ? `<@${x_discord_id}>` : department?.role
      }, maglagay ng reason para sa check-out. Kung tapos ka na mag duty, i-click ang **End Shift** button.`,
      embeds: [attendanceLogEmbed],
      components: [buttonRow]
    });

    return res.status(200).json({ ok: true, message: 'Checkout logged' });
  } catch (error) {
    console.error('Employee Check-Out Error:', error.message);
    return res.status(500).json({ ok: false, message: error.message });
  }
};

////////////////////////////////////////////////////////////////////////////////////////////////////////
/////////////////////////////////////////// HELPER FUNCTIONS ///////////////////////////////////////////
////////////////////////////////////////////////////////////////////////////////////////////////////////

function formatTime(rawTime) {
  return moment
    .tz(rawTime, 'YYYY-MM-DD HH:mm:ss', 'UTC')
    .tz('Asia/Manila')
    .format('MMMM D, YYYY [at] h:mm A');
}

function formatDate(rawTime) {
  return moment.tz(rawTime, 'YYYY-MM-DD HH:mm:ss', 'UTC').tz('Asia/Manila').format('MMM DD, YYYY');
}

function formatMinutes(minutes) {
  const hours = Math.floor(Math.abs(minutes) / 60);
  const mins = Math.abs(minutes) % 60;

  let parts = [];
  if (hours > 0) {
    parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  }
  if (mins > 0) {
    parts.push(`${mins} minute${mins > 1 ? 's' : ''}`);
  }

  return parts.length > 0 ? parts.join(' and ') : '0 minutes';
}

function formatMinutesDelta(x_minutes_delta) {
  if (x_minutes_delta === 0) return 'On time';

  const isLate = x_minutes_delta > 0;
  const minutes = Math.abs(x_minutes_delta);

  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;

  let parts = [];
  if (hours > 0) {
    parts.push(`${hours} hour${hours > 1 ? 's' : ''}`);
  }
  if (mins > 0) {
    parts.push(`${mins} minute${mins > 1 ? 's' : ''}`);
  }

  return parts.join(' and ') + (isLate ? ' late' : ' early');
}

function evaluatePunctuality(checkIn, shiftStart, tz = 'Asia/Manila') {
  const fmt = 'YYYY-MM-DD HH:mm:ss';

  const asMoment = (val) => {
    if (typeof val === 'string') {
      // Has explicit zone? parseZone preserves it; otherwise read in tz
      const hasZone = /[zZ]|[+\-]\d{2}:?\d{2}$/.test(val);
      return hasZone ? moment.parseZone(val).tz(tz) : moment.tz(val, fmt, tz);
    }
    // Date object
    return moment(val).tz(tz);
  };

  const mIn = asMoment(checkIn);
  const mStart = asMoment(shiftStart);

  if (!mIn.isValid() || !mStart.isValid()) {
    throw new Error(
      "Invalid datetime: ensure values match 'YYYY-MM-DD HH:mm:ss' or include an offset."
    );
  }

  // Positive = late, Negative = early
  const diffMs = mIn.diff(mStart);
  const secondsDelta = Math.round(diffMs / 1000);
  const minutesDelta = Math.round(diffMs / (1000 * 60));

  let status = 'on_time';
  if (secondsDelta > 0) status = 'late';
  else if (secondsDelta < 0) status = 'early';

  const readable =
    status === 'on_time'
      ? 'on time'
      : `${Math.abs(minutesDelta)} minute${Math.abs(minutesDelta) === 1 ? '' : 's'} ${status}`;

  return {
    status,
    minutesDelta,
    secondsDelta,
    readable,
    checkInLocal: mIn.format(fmt),
    shiftStartLocal: mStart.format(fmt)
  };
}

function isWorkValid(checkIn, checkOut, shiftStart, shiftEnd, tz = 'Asia/Manila') {
  const fmt = 'YYYY-MM-DD HH:mm:ss';

  const asMoment = (val) => {
    if (typeof val === 'string') {
      const hasZone = /[zZ]|[+\-]\d{2}:?\d{2}$/.test(val);
      return hasZone ? moment.parseZone(val).tz(tz) : moment.tz(val, fmt, tz);
    }
    return moment(val).tz(tz);
  };

  const mIn = asMoment(checkIn);
  const mOut = asMoment(checkOut);
  const mStart = asMoment(shiftStart);
  const mEnd = asMoment(shiftEnd);

  if (!mIn.isValid() || !mOut.isValid() || !mStart.isValid() || !mEnd.isValid()) {
    throw new Error(
      "Invalid datetime: ensure values match 'YYYY-MM-DD HH:mm:ss' or include an offset."
    );
  }

  // Normalize potential overnight windows (end on/before start => next day)
  const sStart = mStart.clone();
  const sEnd = mEnd.clone();
  if (sEnd.isSameOrBefore(sStart)) sEnd.add(1, 'day');

  const wIn = mIn.clone();
  const wOut = mOut.clone();
  if (wOut.isSameOrBefore(wIn)) wOut.add(1, 'day');

  // Overlap exists if max(starts) < min(ends) — strictly less (positive duration)
  const latestStart = moment.max(sStart, wIn);
  const earliestEnd = moment.min(sEnd, wOut);
  return latestStart.isBefore(earliestEnd);
}
