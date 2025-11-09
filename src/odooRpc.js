const axios = require('axios');
const moment = require('moment');

const rpcUrl = 'https://omnilert.odoo.com/jsonrpc';
const webhookUrl = 'https://omnilert.odoo.com/web/hook/';

async function jsonRpc(method, params) {
  const data = {
    jsonrpc: '2.0',
    method: method,
    params: params,
    id: Math.floor(Math.random() * 1000000000),
  };

  try {
    const response = await axios.post(rpcUrl, data, {
      headers: {
        'Content-Type': 'application/json',
      },
    });

    if (response.data.error) {
      // Log the full error response
      console.error('Odoo Error Details:', {
        message: response.data.error.message,
        code: response.data.error.code,
        data: response.data.error.data,
      });
      throw new Error(`Odoo Server Error: ${JSON.stringify(response.data.error)}`);
    }

    return response.data;
  } catch (error) {
    console.error('Error in jsonRpc:', error);
    // If it's an axios error, log the response data if available
    if (error.response) {
      console.error('Response data:', error.response.data);
    }
    throw error;
  }
}

async function odooLogin() {
  try {
    // Log in to the given database
    const uid = await jsonRpc('call', {
      service: 'common',
      method: 'login',
      args: [process.env.odoo_db, process.env.odoo_username, process.env.odoo_password],
    });

    console.log('Logged in as UID:', uid.result);

    return uid.result;
  } catch (error) {
    console.error('Login Error:', error);
    return null;
  }
}

async function searchActiveAttendance(discordId, attendanceId) {
  // Validate input
  if (!discordId || typeof discordId !== 'string') {
    throw new Error('Invalid Discord ID format');
  }

  try {
    // Build domain with optional attendance ID exclusion
    const domain = [
      ['x_discord_id', '=', discordId],
      ['check_out', '=', false],
    ];

    if (attendanceId) {
      domain.push(['id', '!=', attendanceId]);
    }

    // Search for active attendance directly using x_discord_id
    const activeAttendance = await jsonRpc('call', {
      service: 'object',
      method: 'execute_kw',
      args: [
        process.env.odoo_db,
        2,
        process.env.odoo_password,
        'hr.attendance',
        'search_read',
        [domain],
        {
          fields: ['id', 'employee_id', 'check_in', 'in_mode', 'x_discord_id'],
        },
      ],
    });

    return activeAttendance.result;
  } catch (error) {
    console.error('Error searching active attendance:', error);
    throw error;
  }
}

async function getAttendanceById(attendanceId) {
  const parsedId = Number(attendanceId);
  if (isNaN(parsedId) || parsedId <= 0) {
    throw new Error('Invalid attendance ID format');
  }

  const domain = [['id', '=', parsedId]];
  const fields = [
    'id',
    'employee_id',
    'check_in',
    'check_out',
    'x_discord_id',
    'x_cumulative_minutes',
    'x_shift_start',
    'x_shift_end',
    'x_employee_contact_name',
  ];

  const result = await callOdooRpc('hr.attendance', 'search_read', domain, fields, { limit: 1 });
  return result ? result[0] : null;
}

async function getAttendanceByEmployee(discordId, company_id, dateStart = null, dateEnd = null) {
  const domain = [
    ['x_discord_id', '=', discordId],
    ['x_company_id', '=', company_id],
  ];

  if (dateStart && dateEnd) {
    // Include attendances overlapping the given range
    domain.push(['check_in', '<=', dateEnd], ['check_out', '>=', dateStart]);
  }

  const fields = ['id', 'check_in', 'check_out', 'worked_hours', 'create_date'];

  const result = await callOdooRpc('hr.attendance', 'search_read', domain, fields, {
    order: 'check_in asc',
  });
  return result?.length ? result : null;
}

async function callOdooAttendanceWebhook(action, url, discordId) {
  // Format current date/time as 'YYYY-MM-DD HH:MM:SS'
  const now = new Date();
  const formattedDate = now.toISOString().replace('T', ' ').split('.')[0];

  // Build payload based on action
  let payload = { x_discord_id: discordId };
  if (action === 'checkin') {
    payload.check_in = formattedDate;
  } else if (action === 'checkout') {
    payload.check_out = formattedDate;
  } else {
    throw new Error('Invalid action. Use "checkin" or "checkout".');
  }

  try {
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    console.error('Error calling Odoo webhook:', error.response?.data || error.message);
    throw error;
  }
}

async function updateClosingPcfBalance(balance, company_id, session_id, type) {
  const payload = {
    amount: balance,
    session_id: session_id,
    company_id: company_id,
    type: type,
  };

  const url = webhookUrl + process.env.ODOO_CLOSING_PCF_SECRET;

  try {
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    console.error('Error calling Odoo webhook:', error.response?.data || error.message);
    throw error;
  }
}

/**
 * Makes a request to an Odoo webhook endpoint
 * @param {string} webhookType - The type of webhook to call (edit_attendance, work_entry, planning_shift)
 * @param {Object} payload - The data to send to the webhook
 * @returns {Promise<Object>} - The response from the webhook
 * @throws {Error} - If there's an error calling the webhook
 */
async function callOdooWebhook(webhookType, payload) {
  // Map webhook types to their corresponding environment variables
  const secretMap = {
    edit_attendance: process.env.ODOO_EDIT_ATTENDANCE_SECRET,
    work_entry: process.env.ODOO_WORK_ENTRY_SECRET, // Fixed typo in original (sECRET)
    planning_shift: process.env.ODOO_CREATE_PLANNING_SHIFT_SECRET,
    audit_salary_attachment: process.env.ODOO_CREATE_AUDIT_SALARY_ATTACHMENT_SECRET,
    store_audit_rating: process.env.ODOO_STORE_AUDIT_RATING_SECRET,
    merit_demerit: process.env.ODOO_MERIT_DEMERIT_SECRET,
  };

  // Validate webhook type
  if (!secretMap[webhookType]) {
    throw new Error(`Invalid webhook type: ${webhookType}`);
  }

  const url = `https://omnilert.odoo.com/web/hook/${secretMap[webhookType]}`;

  try {
    const response = await axios.post(url, payload, {
      headers: { 'Content-Type': 'application/json' },
    });
    return response.data;
  } catch (error) {
    console.error(
      `Error calling Odoo ${webhookType} webhook:`,
      error.response?.data || error.message
    );
    throw error;
  }
}

// Wrapper functions to maintain backward compatibility
async function editAttendance(payload) {
  return callOdooWebhook('edit_attendance', payload);
}

async function createWorkEntry(payload) {
  return callOdooWebhook('work_entry', payload);
}

// async function createPlanningShift(payload) {
//   return callOdooWebhook('planning_shift', payload);
// }

async function createAuditSalaryAttachment(payload) {
  return callOdooWebhook('audit_salary_attachment', payload);
}

async function storeAuditRating(payload) {
  return callOdooWebhook('store_audit_rating', payload);
}

async function meritDemerit(payload) {
  return callOdooWebhook('merit_demerit', payload);
}

async function getAuditRatingByCode(auditCode) {
  try {
    const domain = [['x_audit_code', '=', auditCode]];
    const fields = [
      'x_audit_date',
      'x_audit_code',
      'x_audit_id',
      'x_name',
      'x_rating',
      'x_employee_id',
    ];
    return await callOdooRpc('x_audit_ratings', 'search_read', domain, fields);
  } catch (error) {
    console.error('Error fetching audit rating by code:', error);
    throw error;
  }
}

async function getEmployeeEPIData(discordId) {
  try {
    const domain = ['&', ['x_discord_id', '=', discordId], ['company_id', '=', 1]];
    const fields = ['x_epi', 'x_average_scsa', 'x_average_sqaa', 'employee_id', 'x_audit_ratings'];
    return await callOdooRpc('hr.employee', 'search_read', domain, fields);
  } catch (error) {
    console.error('Error fetching employee data by Discord ID:', error);
    throw error;
  }
}

async function getEmployeeAuditRatings(discordId) {
  try {
    const domain = [['x_discord_id', '=', discordId]];
    const fields = [
      'x_audit_date',
      'x_audit_code',
      'x_audit_id',
      'x_name',
      'x_rating',
      'x_employee_id',
    ];
    return await callOdooRpc('x_audit_ratings', 'search_read', domain, fields);
  } catch (error) {
    console.error('Error fetching employee audit ratings by Discord ID:', error);
    throw error;
  }
}

async function getEmployeePayslipData(discordId, company_id) {
  try {
    const employee = await getEmployeeByDiscordId(discordId, company_id);
    const { date_from, date_to } = currentSemiMonthRangeUTC8();
    const domain = [
      ['x_view_only', '=', true],
      ['date_from', '=', date_from],
      ['date_to', '=', date_to],
      ['employee_id', '=', employee.id],
      ['company_id', '=', company_id],
    ];
    const fields = [
      'id',
      'name',
      'state',
      'employee_id',
      'date_from',
      'date_to',
      'x_view_only',
      'line_ids',
      'worked_days_line_ids',
    ];

    const slips = await callOdooRpc('hr.payslip', 'search_read', domain, fields);
    const slip = slips?.length ? slips.sort((a, b) => b.id - a.id)[0] : null;
    if (!slip) return null;

    let targetSlipId = slip.id;

    await callOdooKw('hr.payslip', 'action_refresh_from_work_entries', [[targetSlipId]]);

    // Compute the salary rule lines
    await callOdooKw('hr.payslip', 'compute_sheet', [[targetSlipId]]);

    const lines = await callOdooKw('hr.payslip.line', 'search_read', [], {
      domain: [['slip_id', '=', targetSlipId]],
      fields: [
        'id',
        'name',
        'code',
        'category_id',
        'total',
        'amount',
        'quantity',
        'rate',
        'sequence',
      ],
      order: 'sequence asc, id asc',
      limit: 1000,
    });

    const workedDays = await callOdooKw('hr.payslip.worked_days', 'search_read', [], {
      domain: [['payslip_id', '=', targetSlipId]],
      fields: ['id', 'name', 'code', 'number_of_days', 'number_of_hours', 'amount'],
      order: 'id asc',
      limit: 1000,
    });

    // Return the slip header plus fresh details
    return {
      ...slip,
      lines: lines,
      worked_days: workedDays,
    };
  } catch (error) {
    console.error('Error fetching employee salary payslip data:', error);
    throw error;
  }
}

async function createViewOnlyPayslip(discordId, company_id) {
  try {
    const { date_from, date_to } = currentSemiMonthRangeUTC8();

    const employee = await getEmployeeByDiscordId(discordId, company_id);

    const vals = {
      employee_id: employee.id,
      date_from,
      date_to,
      x_view_only: true, // your custom flag
      name: `${employee.name} | View-Only Payslip`,
      company_id: company_id,
    };

    const slipId = await callOdooKw('hr.payslip', 'create', [vals]);

    const fields = [
      'id',
      'name',
      'state',
      'employee_id',
      'date_from',
      'date_to',
      'x_view_only',
      'line_ids',
      'worked_days_line_ids',
    ];

    const [slip] = await callOdooKw('hr.payslip', 'read', [[slipId]], { fields });

    let targetSlipId = slip.id;

    await callOdooKw('hr.payslip', 'compute_sheet', [[targetSlipId]]);

    const lines = await callOdooKw('hr.payslip.line', 'search_read', [], {
      domain: [['slip_id', '=', targetSlipId]],
      fields: [
        'id',
        'name',
        'code',
        'category_id',
        'total',
        'amount',
        'quantity',
        'rate',
        'sequence',
      ],
      order: 'sequence asc, id asc',
      limit: 1000,
    });

    const workedDays = await callOdooKw('hr.payslip.worked_days', 'search_read', [], {
      domain: [['payslip_id', '=', targetSlipId]],
      fields: ['id', 'name', 'code', 'number_of_days', 'number_of_hours', 'amount'],
      order: 'id asc',
      limit: 1000,
    });

    // Return the slip header plus fresh details
    return {
      ...slip,
      lines: lines,
      worked_days: workedDays,
    };
  } catch (error) {
    console.error('Error creating view only payslip:', error);
    throw error;
  }
}

const createPlanningShift = async (payload) => {
  try {
    const {
      x_attendance_id,
      x_discord_id,
      start_datetime,
      end_datetime,
      role_id,
      company_id,
      x_interim_form_id,
    } = payload;

    const employee = await getEmployeeByDiscordId(x_discord_id, company_id);

    let vals = {
      resource_id: employee.resource_id[0],
      company_id: company_id,
      start_datetime,
      end_datetime,
    };

    if (x_interim_form_id) {
      vals.x_interim_form_id = x_interim_form_id;
    }

    if (x_attendance_id) {
      vals.x_attendance_id = x_attendance_id;
    }

    if (role_id) {
      vals.role_id = role_id;
    }

    const slot_id = await callOdooKw('planning.slot', 'create', [vals]);
    await callOdooKw('planning.slot', 'action_planning_publish_and_send', [[slot_id]]);
    return slot_id;
  } catch (error) {
    console.error('Error creating planning shift:', error);
    throw error;
  }
};

module.exports = {
  jsonRpc,
  odooLogin,
  callOdooAttendanceWebhook,
  searchActiveAttendance,
  updateClosingPcfBalance,
  editAttendance,
  getAttendanceById,
  getAttendanceByEmployee,
  createWorkEntry,
  createPlanningShift,
  createAuditSalaryAttachment,
  storeAuditRating,
  getAuditRatingByCode,
  meritDemerit,
  getEmployeeEPIData,
  getEmployeeAuditRatings,
  getEmployeePayslipData,
  createViewOnlyPayslip,
};

async function callOdooRpc(model, method, domain = [], fields = [], options = {}) {
  try {
    const payload = {
      service: 'object',
      method: 'execute_kw',
      args: [
        process.env.odoo_db,
        2,
        process.env.odoo_password,
        model,
        method,
        [domain],
        { fields, ...options }, // merge any extra options like limit, offset, etc.
      ],
    };

    const res = await jsonRpc('call', payload);
    return res.result && res.result.length > 0 ? res.result : null;
  } catch (err) {
    console.error(`Error calling Odoo RPC for model "${model}":`, err);
    throw err;
  }
}

async function callOdooKw(model, method, args = [], kwargs = {}) {
  try {
    const payload = {
      service: 'object',
      method: 'execute_kw',
      args: [
        process.env.odoo_db, // database name
        2, // user ID (adjust if not always 2)
        process.env.odoo_password, // API key or password
        model, // model name
        method, // method to call
        args, // positional arguments (list)
        kwargs, // keyword arguments (object)
      ],
    };

    const res = await jsonRpc('call', payload);
    // return whatever Odoo returned (result can be object, list, or boolean)
    return res.result ?? null;
  } catch (err) {
    console.error(`Error calling Odoo execute_kw for model "${model}", method "${method}":`, err);
    throw err;
  }
}

async function getEmployeeByDiscordId(discordId, company_id) {
  const empFields = ['id', 'name', 'resource_id'];
  const employees = await callOdooRpc(
    'hr.employee',
    'search_read',
    [
      ['x_discord_id', '=', discordId],
      ['company_id', '=', company_id],
    ],
    empFields
  );
  if (!employees?.length) throw new Error(`No employee with x_discord_id = ${discordId}`);
  return employees[0];
}

function currentSemiMonthRangeUTC8() {
  const now = new Date();
  // Build a "Manila now" by adding the local offset to hit UTC, then +8h
  const utc = new Date(now.getTime() + now.getTimezoneOffset() * 60000);
  const manila = new Date(utc.getTime() + 8 * 3600 * 1000);
  const y = manila.getFullYear();
  const m = manila.getMonth() + 1; // 1..12
  const pad = (n) => String(n).padStart(2, '0');
  const first = `${y}-${pad(m)}-01`;
  const fifteenth = `${y}-${pad(m)}-15`;
  const last = new Date(y, m, 0).getDate();
  const sixteenth = `${y}-${pad(m)}-16`;
  const end = `${y}-${pad(m)}-${pad(last)}`;

  // If today <= 15 → 01–15; else → 16–end
  const day = manila.getDate();
  return day <= 15
    ? { date_from: first, date_to: fifteenth }
    : { date_from: sixteenth, date_to: end };
}
