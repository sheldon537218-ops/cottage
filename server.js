const http = require("http");
const fs = require("fs");
const path = require("path");

const root = __dirname;
const dataDir = process.env.DATA_DIR ? path.resolve(process.env.DATA_DIR) : root;
const defaultConfigPath = path.join(root, "game-config.json");
const configPath = path.join(dataDir, "game-config.json");
const uploadDir = path.join(dataDir, "uploads");
const port = Number(process.env.PORT || 4173);
const host = process.env.HOST || "0.0.0.0";
const adminPassword = process.env.ADMIN_PASSWORD || "";

const mimeTypes = {
  ".html": "text/html; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp"
};

function ensureDataFiles() {
  fs.mkdirSync(dataDir, { recursive: true });
  fs.mkdirSync(uploadDir, { recursive: true });
  if (!fs.existsSync(configPath)) {
    fs.copyFileSync(defaultConfigPath, configPath);
  }
}

function send(res, status, body, type = "text/plain; charset=utf-8") {
  res.writeHead(status, { "Content-Type": type });
  res.end(body);
}

function readBody(req) {
  return new Promise((resolve, reject) => {
    let body = "";
    req.on("data", (chunk) => {
      body += chunk;
      if (body.length > 30 * 1024 * 1024) {
        reject(new Error("请求内容太大"));
        req.destroy();
      }
    });
    req.on("end", () => resolve(body));
    req.on("error", reject);
  });
}

function parseObject(text) {
  const value = JSON.parse(text);
  if (!value || typeof value !== "object") throw new Error("内容必须是 JSON 对象");
  return value;
}

function isAuthorized(req) {
  if (!adminPassword) return true;
  return req.headers["x-admin-password"] === adminPassword;
}

function safeFilePath(urlPath) {
  const decoded = decodeURIComponent(urlPath.split("?")[0]);
  const requested = decoded === "/" ? "/index.html" : decoded;
  const filePath = path.normalize(path.join(root, requested));
  return filePath.startsWith(root) ? filePath : null;
}

function safeUploadPath(urlPath) {
  const filename = path.basename(decodeURIComponent(urlPath.replace(/^\/uploads\//, "")));
  const filePath = path.join(uploadDir, filename);
  return filePath.startsWith(uploadDir) ? filePath : null;
}

async function handleApi(req, res, url) {
  if (req.method === "GET" && url.pathname === "/api/config") {
    return send(res, 200, fs.readFileSync(configPath, "utf8"), mimeTypes[".json"]);
  }

  if (req.method === "POST" && url.pathname === "/api/config") {
    try {
      if (!isAuthorized(req)) {
        return send(res, 401, JSON.stringify({ ok: false, error: "管理员密码错误" }), mimeTypes[".json"]);
      }
      const config = parseObject(await readBody(req));
      fs.writeFileSync(configPath, JSON.stringify(config, null, 2), "utf8");
      return send(res, 200, JSON.stringify({ ok: true }), mimeTypes[".json"]);
    } catch (error) {
      return send(res, 400, JSON.stringify({ ok: false, error: error.message }), mimeTypes[".json"]);
    }
  }

  if (req.method === "POST" && url.pathname === "/api/upload-image") {
    try {
      if (!isAuthorized(req)) {
        return send(res, 401, JSON.stringify({ ok: false, error: "管理员密码错误" }), mimeTypes[".json"]);
      }
      const payload = parseObject(await readBody(req));
      const match = String(payload.dataUrl || "").match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
      if (!match) throw new Error("请上传 png、jpg、jpeg 或 webp 图片");
      const ext = match[1] === "jpeg" ? "jpg" : match[1];
      const base = String(payload.filename || `album-${Date.now()}`)
        .replace(/\.[^.]+$/, "")
        .replace(/[^a-zA-Z0-9_-]/g, "-")
        .slice(0, 60) || `album-${Date.now()}`;
      const filename = `${base}-${Date.now()}.${ext}`;
      fs.mkdirSync(uploadDir, { recursive: true });
      fs.writeFileSync(path.join(uploadDir, filename), Buffer.from(match[2], "base64"));
      return send(res, 200, JSON.stringify({ ok: true, path: `uploads/${filename}` }), mimeTypes[".json"]);
    } catch (error) {
      return send(res, 400, JSON.stringify({ ok: false, error: error.message }), mimeTypes[".json"]);
    }
  }

  return send(res, 404, JSON.stringify({ ok: false, error: "接口不存在" }), mimeTypes[".json"]);
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  if (url.pathname.startsWith("/api/")) return handleApi(req, res, url);

  if (url.pathname.startsWith("/uploads/")) {
    const uploadPath = safeUploadPath(url.pathname);
    if (!uploadPath || !fs.existsSync(uploadPath) || fs.statSync(uploadPath).isDirectory()) {
      return send(res, 404, "Not found");
    }
    const ext = path.extname(uploadPath).toLowerCase();
    res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
    return fs.createReadStream(uploadPath).pipe(res);
  }

  const filePath = safeFilePath(url.pathname);
  if (!filePath || !fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
    return send(res, 404, "Not found");
  }

  const ext = path.extname(filePath).toLowerCase();
  res.writeHead(200, { "Content-Type": mimeTypes[ext] || "application/octet-stream" });
  fs.createReadStream(filePath).pipe(res);
});

ensureDataFiles();

server.listen(port, host, () => {
  console.log(`Gift game editor is running at http://${host}:${port}`);
});
