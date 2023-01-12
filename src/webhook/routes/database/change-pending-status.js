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

  const {
    id,
    timestamp,
    member_id,
    full_name,
    proof_of_payment,
    payment_type,
    status,
    reference_number,
    verifier,
  } = req.body;

  if (reference_number === "none") {
    const updateQuery = "UPDATE Pending_Payment SET STATUS = ? WHERE _id = ?";
    await connection
      .query(updateQuery, [status, id])
      .catch((err) => consolFe.log(err));

    connection.end();
    return res.status(200).send({
      ok: true,
      message: "Status Updated.",
    });
  } else {
    const insertQuery =
      "INSERT INTO Approved_Payments (_id, TIMESTAMP, MEMBER_ID, FULL_NAME, REF_NUMBER, PROOF_OF_PAYMENT, PAYMENT_TYPE, VERIFIER) VALUES (?, ?, ?, ?, ?, ?, ?, ?)";
    await connection
      .query(insertQuery, [
        id,
        timestamp,
        member_id,
        full_name,
        reference_number,
        proof_of_payment,
        payment_type,
        verifier,
      ])
      .catch((err) => console.log(err));

    const deleteQuery = "DELETE FROM Pending_Payment WHERE _id = ?";
    await connection.query(deleteQuery, [id]).catch((err) => console.log(err));

    connection.end();
    return res.status(200).send({
      ok: true,
      message: "Payment approved.",
    });
  }
};
