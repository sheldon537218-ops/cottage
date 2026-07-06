const fs = require("fs");
const path = require("path");
const { getStore } = require("@netlify/blobs");

const jsonHeaders = {
  "Content-Type": "application/json; charset=utf-8",
};

function response(statusCode, body, headers = jsonHeaders) {
  return {
    statusCode,
    headers,
    body: typeof body === "string" ? body : JSON.stringify(body),
  };
}

function isAuthorized(event) {
  const password = process.env.ADMIN_PASSWORD || "";
  if (!password) return true;
  return event.headers["x-admin-password"] === password;
}

function defaultConfig() {
  const configPath = path.join(process.cwd(), "game-config.json");
  return JSON.parse(fs.readFileSync(configPath, "utf8"));
}

function configStore() {
  return getStore("gift-config");
}

function uploadStore() {
  return getStore("gift-uploads");
}

module.exports = {
  configStore,
  defaultConfig,
  isAuthorized,
  response,
  uploadStore,
};
