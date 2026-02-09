/**
 * 업무일지 테이블 생성 (work_logs)
 */
const path = require("path");
require("dotenv").config({ path: path.resolve(__dirname, "..", ".env") });
const mysql = require("mysql2/promise");

const CREATE_TABLE_SQL = `
CREATE TABLE IF NOT EXISTS work_logs (
  id INT AUTO_INCREMENT PRIMARY KEY,
  log_date DATE NOT NULL,
  title VARCHAR(200) NOT NULL,
  content TEXT,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP,
  INDEX idx_log_date (log_date)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4;
`;

async function initDb() {
  const connectionUri = process.env.CONNECTION_URI;
  const hasDbVars =
    process.env.DB_HOST && process.env.DB_USER && process.env.DB_PASSWORD;

  if (!connectionUri && !hasDbVars) {
    console.error(".env에 CONNECTION_URI 또는 DB_HOST, DB_USER, DB_PASSWORD를 설정하세요.");
    process.exit(1);
  }

  let conn;
  try {
    if (connectionUri) {
      conn = await mysql.createConnection(connectionUri);
    } else {
      conn = await mysql.createConnection({
        host: process.env.DB_HOST,
        port: parseInt(process.env.DB_PORT || "3306", 10),
        user: process.env.DB_USER,
        password: process.env.DB_PASSWORD,
        database: process.env.DB_NAME || "tcb",
        charset: "utf8mb4",
      });
    }
    await conn.query(CREATE_TABLE_SQL);
    console.log("work_logs 테이블이 생성되었습니다 (또는 이미 존재합니다).");
  } catch (err) {
    console.error("초기화 실패:", err.message);
    process.exit(1);
  } finally {
    if (conn) await conn.end();
  }
}

initDb();
