const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const client = require('../../../index.js');
const departments = require('../../../config/departments.json');
const auditTypes = require('../../../config/audit_types.json');

const { meritDemerit } = require('../../../odooRpc.js');

const auditQueueChannelId = '1423573262641922149';

const storeCCTVSpotAudit = async (req, res) => {
  const { company_id, x_pos_name } = req.body;

  const department = departments.find((d) => d.id === company_id);
  if (!department) {
    return res.status(200).json({ ok: true, message: 'Department not found' });
  }

  try {
    const storeAuditEmbed = new EmbedBuilder()
      .setDescription(`## 📺 Store CCTV Spot Audit`)
      .setTimestamp(new Date())
      .setColor('#55ACEE')
      .addFields(
        {
          name: 'Session Name',
          value: x_pos_name
        },
        {
          name: 'Branch',
          value: department.name
        }
      );

    const getAudit = new ButtonBuilder()
      .setCustomId('auditClaim')
      .setLabel('Claim Audit')
      .setStyle(ButtonStyle.Success);

    const buttonRow = new ActionRowBuilder().addComponents(getAudit);

    const auditQueueChannel = client.channels.cache.get(auditQueueChannelId);
    await auditQueueChannel.send({
      embeds: [storeAuditEmbed],
      components: [buttonRow]
    });

    return res.status(200).json({ ok: true, message: 'Audit queued successfully' });
  } catch (error) {
    console.error(error);
    return res.status(500).json({ ok: false, message: 'Internal server error' });
  }
};

const calculateWeeklyMerit = async (req, res) => {
  const { id, employee_id, x_average_sqaa, x_average_scsa } = req.body;

  // Return early if no audit scores are provided
  if (!x_average_sqaa && !x_average_scsa) {
    console.log('No audit scores for employee', employee_id);
    return res.status(200).json({ ok: true, message: 'No audit scores provided' });
  }

  const payload = {
    audit_title: 'POS Session Audits',
    audit_code: sessionName,
    data: employeeAverageAndMerit // { x_employee_id: 1, x_average: 1.5, merit_amount: 10 }
  };

  if (x_average_sqaa) {
    const auditType = auditTypes.find((type) => type.code === 'SQAA');
    const meritAmount = getMeritAmount(x_average_sqaa, auditType);
    if (!meritAmount) {
      console.log('No merit amount for SQAA audit for employee', employee_id);
      return res.status(200).json({ ok: true, message: 'No merit amount for SQAA audit' });
    }

    payload.audit_title = auditType.name;
    payload.audit_code = auditType.code;
    payload.data = [
      { x_employee_id: employee_id, x_average: x_average_sqaa, merit_amount: meritAmount }
    ];

    await meritDemerit(payload);
  }

  if (x_average_scsa) {
    const auditType = auditTypes.find((type) => type.code === 'SCSA');
    const meritAmount = getMeritAmount(x_average_scsa, auditType);
    if (!meritAmount) {
      console.log('No merit amount for SCSA audit for employee', employee_id);
      return res.status(200).json({ ok: true, message: 'No merit amount for SCSA audit' });
    }

    payload.audit_title = auditType.name;
    payload.audit_code = auditType.code;
    payload.data = [
      { x_employee_id: employee_id, x_average: x_average_scsa, merit_amount: meritAmount }
    ];

    await meritDemerit(payload);
  }

  return res.status(200).json({ ok: true, message: 'Weekly merit calculated successfully' });

  function getMeritAmount(avg, audit) {
    if (!audit || !audit.merit) return null;

    const meritRange = audit.merit.find((m) => avg >= m.avg_min && avg <= m.avg_max);

    return meritRange ? meritRange.merit_amount : null;
  }
};

module.exports = {
  storeCCTVSpotAudit,
  calculateWeeklyMerit
};
