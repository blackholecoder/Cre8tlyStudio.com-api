import connect from "../connect.js";


export async function getReferralsByEmployee(employeeId, page = 1, limit = 10) {
  const db = connect();

  const offset = (page - 1) * limit;

  // Main query with pagination
  const [rows] = await db.query(
    `
      SELECT 
        er.id,
        er.referred_email,
        er.referred_user_id,
        er.created_at,
        u.name AS referred_user_name
      FROM employee_referrals er
      LEFT JOIN users u ON u.id = er.referred_user_id
      WHERE er.employee_id = ?
      ORDER BY er.created_at DESC
      LIMIT ? OFFSET ?
    `,
    [employeeId, limit, offset]
  );

  // Get total count for pagination
  const [[{ total }]] = await db.query(
    `
      SELECT COUNT(*) AS total
      FROM employee_referrals
      WHERE employee_id = ?
    `,
    [employeeId]
  );

  return {
    referrals: rows,
    total,
    totalPages: Math.ceil(total / limit),
  };
}


export async function getAllEmployeeReferrals(page = 1, limit = 20, employeeId = null) {
  const db = connect();
  const offset = (page - 1) * limit;

  let whereClause = "";
  let params = [];

  if (employeeId) {
    whereClause = "WHERE er.employee_id = ?";
    params.push(employeeId);
  }

  const [rows] = await db.query(
    `
      SELECT 
        er.id,
        er.employee_id,
        emp.name AS employee_name,  -- referring employee
        er.referred_email,
        er.referred_user_id,
        ref.name AS referred_user_name, -- newly registered user
        er.created_at
      FROM employee_referrals er
      LEFT JOIN users emp ON emp.id = er.employee_id
      LEFT JOIN users ref ON ref.id = er.referred_user_id
      ${whereClause}
      ORDER BY er.created_at DESC
      LIMIT ? OFFSET ?
    `,
    [...params, limit, offset]
  );

  const [[{ total }]] = await db.query(
    `
      SELECT COUNT(*) AS total
      FROM employee_referrals er
      ${whereClause}
    `,
    params
  );

  return {
    referrals: rows,
    total,
    totalPages: Math.ceil(total / limit),
  };
}


export async function getAllEmployeeList() {
  try {
    const db = connect();

    const [rows] = await db.query(
      `
        SELECT 
          id, 
          name, 
          email
        FROM users
        WHERE is_admin_employee = 1
        ORDER BY name ASC
      `
    );

    return rows;
  } catch (err) {
    console.error("DB Error (getAllEmployeeList):", err);
    throw new Error("Failed to fetch employee list");
  }
}


