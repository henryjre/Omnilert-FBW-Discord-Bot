const fs = require("fs").promises;
const path = require("path");
const pools = require("../../../../sqlPools.js");

module.exports = async (req, res) => {
  try {
    const mgmt_connection = await pools.managementPool.getConnection();
    try {
      const selectQuery = `SELECT * FROM Executives;`;
      const [executive] = await mgmt_connection.query(selectQuery);

      await storeData(executive);
    } finally {
      mgmt_connection.release();
    }

    return res.status(200).json({ ok: true, message: "success" });
  } catch (error) {
    console.log(error.stack);
    return res.status(404).json({ ok: false, message: error.message });
  }
};

const filePath = path.join(
  __dirname,
  "../../../../temp/executivesPbrData.json"
);

async function storeData(jsonArray) {
  try {
    // Read existing data
    const existingData = await fs.readFile(filePath, "utf-8");

    const existingArray = existingData ? JSON.parse(existingData) : [];

    if (existingArray.length > 0) {
      console.log("Executive data is already stored");
      return;
    }

    await fs.writeFile(filePath, JSON.stringify(jsonArray));
    console.log("Data stored successfully.");
  } catch (error) {
    console.error("Error storing data:", error);
  }
}
