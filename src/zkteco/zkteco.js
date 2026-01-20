const { ZKLib } = require("node-zklib");

// Device config
const DEVICE_IP = process.env.ZKTECO_DEVICE_IP;
const DEVICE_PORT = Number(process.env.ZK_PORT || 4370);
const IN_PORT = Number(process.env.ZK_IN_PORT || 5200);
const TIMEOUT = Number(process.env.ZK_TIMEOUT || 5000);


function sleep(ms) {
    return new Promise((r) => setTimeout(r, ms));
}

function normalizeLog(row) {
    // Different builds return different field names; keep raw.
    const pin = row.userId ?? row.uid ?? row.pin ?? row.id ?? null;
    const ts = row.timestamp ?? row.time ?? row.datetime ?? null;
    const state = row.state ?? row.status ?? row.inOut ?? null;

    return { pin, ts, state, raw: row };
}

async function run() {
    const zk = new ZKLib(DEVICE_IP, DEVICE_PORT, TIMEOUT, IN_PORT);
    console.log("Connecting...");
    await zk.createSocket();
    console.log("Connected.");

    // optional time sync
    try { await zk.setTime(new Date()); } catch { }

    let lastSeen = null;

    zk.getRealTimeLogs((log) => console.log("RT:", log));

    while (true) {
        try {
            const resp = await zk.getAttendances();
            const logs = resp?.data ?? resp ?? [];

            // Oldest → newest
            logs.sort((a, b) => {
                const ta = new Date(a.timestamp || a.time || 0).getTime();
                const tb = new Date(b.timestamp || b.time || 0).getTime();
                return ta - tb;
            });

            for (const row of logs) {
                const e = normalizeLog(row);
                const key = `${e.pin}|${e.ts}|${e.state}`;
                if (!e.pin || !e.ts) continue;
                if (lastSeen === key) continue;

                console.log("EVENT:", e);
                lastSeen = key;
            }
        } catch (e) {
            console.error("poll error:", e?.message || e);
            try { await zk.disconnect(); } catch { }
            try { await zk.createSocket(); } catch { }
        }

        await sleep(1500);
    }
}

run().catch(console.error);