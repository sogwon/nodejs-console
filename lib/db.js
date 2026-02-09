/**
 * MySQL 연결 풀 (업무일지용)
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");

let pool = null;

function getPool() {
  if (pool) return pool;
  const connectionUri = process.env.CONNECTION_URI;
  const hasDbVars =
    process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD;

  if (!connectionUri && !hasDbVars) {
    throw new Error(
      ".env에 CONNECTION_URI 또는 DB_HOST, DB_USER, DB_PASSWORD를 설정하세요."
    );
  }

  if (connectionUri) {
    pool = mysql.createPool(connectionUri);
  } else {
    pool = mysql.createPool({
      host: process.env.DB_HOST,
      port: parseInt(process.env.DB_PORT || "3306", 10),
      user: process.env.DB_USER,
      password: process.env.DB_PASSWORD,
      database: process.env.DB_NAME || "tcb",
      waitForConnections: true,
      connectionLimit: 10,
      queueLimit: 0,
      charset: "utf8mb4",
    });
  }
  return pool;
}

module.exports = { getPool };
