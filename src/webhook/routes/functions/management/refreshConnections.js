const pools = require("../../../../sqlPools.js");

module.exports = async (req, res) => {
  try {
    const def_connection = await pools.leviosaPool.getConnection();
    try {
      const sqlQuery = "SHOW PROCESSLIST";

      const [processes] = await def_connection.query(sqlQuery);

      const terminated = {
        success: 0,
        fail: 0,
        total_idle: processes.filter((p) => p.Command === "Sleep").length,
        total: processes.filter((p) => p.db !== null).length,
      };

      for (const process of processes) {
        if (process.Command === "Sleep") {
          const killQuery = `KILL '${process.Id}'`;
          try {
            await def_connection.query(killQuery);
            terminated.success += 1;
          } catch (killError) {
            console.error("Error terminating connection: " + killError.stack);
            terminated.fail += 1;
          }
        }
      }

      return res.status(200).json({
        message: "Connection termination success.",
        total_open_connections: terminated.total,
        total_idle_connections: terminated.total_idle,
        success_count: terminated.success,
        fail_count: terminated.fail,
      });
    } finally {
      await def_connection.end();
    }
  } catch (error) {
    console.error("Error in terminating connection:", error.stack);
    return res.status(400).json({
      message: "Connection termination failed.",
      total_open_connections: null,
      total_idle_connections: null,
      success_count: null,
      fail_count: null,
    });
  }
};
