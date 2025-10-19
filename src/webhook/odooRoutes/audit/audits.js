const { EmbedBuilder, ButtonBuilder, ButtonStyle, ActionRowBuilder } = require('discord.js');

const client = require('../../../index.js');
const departments = require('../../../config/departments.json');

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
  console.log(req.body);
};

module.exports = {
  storeCCTVSpotAudit,
  calculateWeeklyMerit
};
