const employeeCheckIn = async (req, res) => {
  console.log(req.body);

  const body = req.body;

  res.status(200).json({ ok: true, message: "success" });
};

module.exports = { employeeCheckIn };
