require("dotenv").config({ path: "src/.env" });
const mysql = require("mysql2/promise");

module.exports = async (req, res) => {
  const connection = await mysql.createConnection({
    host: process.env.sqlHost,
    user: process.env.sqlUsername,
    password: process.env.sqlPassword,
    database: process.env.sqlDatabase,
    port: process.env.sqlPort,
  });

  const { timestamp, member_id } = req.body;

  const queryBalanceDeetails =
    "UPDATE Pending_Payment SET STATUS = ? WHERE TIMESTAMP = ? AND MEMBER_ID = ?";
  await connection
    .query(queryBalanceDeetails, [`verifying`, timestamp, member_id])
    .catch((err) => consolFe.log(err));

  connection.end();
  return res.status(200).send({
    ok: true,
    message: "Status Updated.",
  });
};
