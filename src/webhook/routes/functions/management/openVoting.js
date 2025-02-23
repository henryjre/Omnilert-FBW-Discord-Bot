const {
  EmbedBuilder,
  ButtonBuilder,
  ButtonStyle,
  ActionRowBuilder,
} = require("discord.js");
const client = require("../../../../index");
// const pools = require("../../../../sqlPools.js");

const fs = require("fs").promises;
const path = require("path");

module.exports = async (req, res) => {
  const { doc_url, executive_name, executive_id } = req.body;

  try {
    if (!doc_url) {
      throw new Error("No URL");
    }

    const embed = new EmbedBuilder()
      .setTitle(executive_name)
      .setDescription(`PBR Voting is now open for this executive.`)
      .setColor("Blurple");

    const link = new ButtonBuilder()
      .setLabel("Submit Vote")
      .setURL(doc_url)
      .setStyle(ButtonStyle.Link);

    const buttonRow = new ActionRowBuilder().addComponents(link);

    await client.channels.cache.get("1186662402247368704").send({
      embeds: [embed],
      components: [buttonRow],
    });

    const mgmt_connection = await pools.managementPool.getConnection();
    try {
      const updateQuery = `UPDATE Executives SET TIME_RENDERED = ?, TIME_DEDUCTION = ? WHERE MEMBER_ID = ?`;
      await mgmt_connection.query(updateQuery, [0, 0, executive_id]);

      const insertQuery = `INSERT IGNORE INTO Executive_Tasks_History (TASK_ID, EXECUTIVE_ID, EXECUTIVE_NAME, TASK_NAME, TASK_DESCRIPTION, TIME_RENDERED, DATE_CREATED)
      SELECT TASK_ID, EXECUTIVE_ID, EXECUTIVE_NAME, TASK_NAME, TASK_DESCRIPTION, TIME_RENDERED, DATE_CREATED
      FROM Executive_Tasks
      WHERE EXECUTIVE_ID = ?`;
      const [insertedTasks] = await mgmt_connection.query(insertQuery, [
        executive_id,
      ]);

      if (insertedTasks.affectedRows > 0) {
        const deleteQuery = `DELETE FROM Executive_Tasks WHERE EXECUTIVE_ID = ?`;
        await mgmt_connection.query(deleteQuery, [executive_id]);
      }
    } finally {
      mgmt_connection.release();
    }

    return res.status(200).json({ ok: true, message: "success" });
  } catch (error) {
    console.log(error.stack);
    return res.status(404).json({ ok: false, message: error.message });
  }
};
