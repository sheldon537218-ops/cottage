const { configStore, defaultConfig, isAuthorized, response } = require("./_shared");

exports.handler = async (event) => {
  const store = configStore();

  if (event.httpMethod === "GET") {
    const config = await store.get("game-config", { type: "json" });
    return response(200, config || defaultConfig());
  }

  if (event.httpMethod === "POST") {
    if (!isAuthorized(event)) {
      return response(401, { ok: false, error: "管理员密码错误" });
    }

    try {
      const config = JSON.parse(event.body || "{}");
      await store.setJSON("game-config", config);
      return response(200, { ok: true });
    } catch (error) {
      return response(400, { ok: false, error: error.message });
    }
  }

  return response(405, { ok: false, error: "Method not allowed" });
};
