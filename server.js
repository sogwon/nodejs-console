/**
 * 업무일지 웹 사이트 서버
 * - 정적 파일: /public
 * - API: GET/POST /api/entries, GET/PUT/DELETE /api/entries/:id
 */
const path = require("path");
const fs = require("fs");
require("dotenv").config({ path: path.resolve(__dirname, ".env") });
const http = require("http");
const { getPool } = require("./lib/db");

const PORT = Number(process.env.PORT) || 3000;
const PUBLIC_DIR = path.join(__dirname, "public");

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".ico": "image/x-icon",
  ".svg": "image/svg+xml",
};

function parseBody(req) {
  return new Promise((resolve) => {
    let body = "";
    req.on("data", (chunk) => (body += chunk));
    req.on("end", () => {
      try {
        resolve(body ? JSON.parse(body) : {});
      } catch {
        resolve({});
      }
    });
  });
}

function send(res, statusCode, body, contentType = "application/json") {
  res.writeHead(statusCode, {
    "Content-Type": contentType,
    "Access-Control-Allow-Origin": "*",
  });
  if (Buffer.isBuffer(body)) {
    res.end(body);
  } else if (typeof body === "string") {
    res.end(body);
  } else {
    res.end(JSON.stringify(body));
  }
}

function sendJson(res, statusCode, data) {
  send(res, statusCode, data);
}

// API: 업무일지 목록 (최신순, 선택: limit, offset, log_date)
async function listEntries(query) {
  const pool = getPool();
  const limit = Math.min(parseInt(query.limit, 10) || 50, 100);
  const offset = parseInt(query.offset, 10) || 0;
  const logDate = query.log_date || null;

  let sql =
    "SELECT id, log_date, title, content, created_at, updated_at FROM work_logs";
  const params = [];
  if (logDate) {
    sql += " WHERE log_date = ?";
    params.push(logDate);
  }
  sql += " ORDER BY log_date DESC, id DESC LIMIT ? OFFSET ?";
  params.push(limit, offset);

  const [rows] = await pool.query(sql, params);
  const [countResult] = await pool.query(
    logDate
      ? "SELECT COUNT(*) AS total FROM work_logs WHERE log_date = ?"
      : "SELECT COUNT(*) AS total FROM work_logs",
    logDate ? [logDate] : []
  );
  return { list: rows, total: countResult[0].total };
}

// API: 단건 조회
async function getEntry(id) {
  const pool = getPool();
  const [rows] = await pool.query(
    "SELECT id, log_date, title, content, created_at, updated_at FROM work_logs WHERE id = ?",
    [id]
  );
  return rows[0] || null;
}

// API: 생성
async function createEntry(data) {
  const pool = getPool();
  const { log_date, title, content } = data;
  if (!log_date || !title) {
    throw new Error("log_date, title 필수");
  }
  const [result] = await pool.query(
    "INSERT INTO work_logs (log_date, title, content) VALUES (?, ?, ?)",
    [log_date, title, content || ""]
  );
  return result.insertId;
}

// API: 수정
async function updateEntry(id, data) {
  const pool = getPool();
  const { log_date, title, content } = data;
  const [result] = await pool.query(
    "UPDATE work_logs SET log_date = COALESCE(?, log_date), title = COALESCE(?, title), content = COALESCE(?, content) WHERE id = ?",
    [log_date || null, title || null, content !== undefined ? content : null, id]
  );
  return result.affectedRows > 0;
}

// API: 삭제
async function deleteEntry(id) {
  const pool = getPool();
  const [result] = await pool.query("DELETE FROM work_logs WHERE id = ?", [id]);
  return result.affectedRows > 0;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || "/", `http://localhost:${PORT}`);
  const pathname = url.pathname;

  try {
    // ----- API -----
    if (pathname === "/api/entries" && req.method === "GET") {
      const list = await listEntries(Object.fromEntries(url.searchParams));
      sendJson(res, 200, { success: true, ...list });
      return;
    }

    if (pathname === "/api/entries" && req.method === "POST") {
      const body = await parseBody(req);
      const id = await createEntry(body);
      sendJson(res, 201, { success: true, id });
      return;
    }

    const matchGet = pathname.match(/^\/api\/entries\/(\d+)$/);
    if (matchGet && req.method === "GET") {
      const entry = await getEntry(matchGet[1]);
      if (!entry) {
        sendJson(res, 404, { success: false, error: "Not Found" });
        return;
      }
      sendJson(res, 200, { success: true, entry });
      return;
    }

    if (matchGet && req.method === "PUT") {
      const body = await parseBody(req);
      const ok = await updateEntry(matchGet[1], body);
      if (!ok) {
        sendJson(res, 404, { success: false, error: "Not Found" });
        return;
      }
      sendJson(res, 200, { success: true });
      return;
    }

    if (matchGet && req.method === "DELETE") {
      const ok = await deleteEntry(matchGet[1]);
      if (!ok) {
        sendJson(res, 404, { success: false, error: "Not Found" });
        return;
      }
      sendJson(res, 200, { success: true });
      return;
    }

    if (pathname === "/api/health" && req.method === "GET") {
      sendJson(res, 200, { ok: true, message: "업무일지 API" });
      return;
    }

    // ----- 정적 파일 (SPA: / -> index.html) -----
    const relativePath = pathname === "/" ? "index.html" : pathname.slice(1);
    let filePath = path.join(PUBLIC_DIR, relativePath);
    if (!path.resolve(filePath).startsWith(path.resolve(PUBLIC_DIR))) {
      sendJson(res, 404, { error: "Not Found" });
      return;
    }
    if (!fs.existsSync(filePath) || !fs.statSync(filePath).isFile()) {
      sendJson(res, 404, { error: "Not Found" });
      return;
    }
    const ext = path.extname(filePath);
    const contentType = MIME[ext] || "application/octet-stream";
    send(res, 200, fs.readFileSync(filePath), contentType);
  } catch (err) {
    console.error(err);
    sendJson(res, 500, {
      success: false,
      error: err.message || "서버 오류",
    });
  }
});

server.listen(PORT, "127.0.0.1", () => {
  console.log(`업무일지 서버: http://localhost:${PORT}`);
  console.log("  GET  /api/entries     → 목록");
  console.log("  POST /api/entries     → 작성");
  console.log("  GET  /api/entries/:id → 조회");
  console.log("  PUT  /api/entries/:id → 수정");
  console.log("  DEL  /api/entries/:id → 삭제");
});
