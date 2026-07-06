const { isAuthorized, response, uploadStore } = require("./_shared");

exports.handler = async (event) => {
  if (event.httpMethod !== "POST") {
    return response(405, { ok: false, error: "Method not allowed" });
  }

  if (!isAuthorized(event)) {
    return response(401, { ok: false, error: "管理员密码错误" });
  }

  try {
    const payload = JSON.parse(event.body || "{}");
    const match = String(payload.dataUrl || "").match(/^data:image\/(png|jpeg|jpg|webp);base64,(.+)$/);
    if (!match) throw new Error("请上传 png、jpg、jpeg 或 webp 图片");

    const ext = match[1] === "jpeg" ? "jpg" : match[1];
    const base = String(payload.filename || `album-${Date.now()}`)
      .replace(/\.[^.]+$/, "")
      .replace(/[^a-zA-Z0-9_-]/g, "-")
      .slice(0, 60) || `album-${Date.now()}`;
    const filename = `${base}-${Date.now()}.${ext}`;

    await uploadStore().set(filename, Buffer.from(match[2], "base64"), {
      metadata: { contentType: `image/${ext === "jpg" ? "jpeg" : ext}` },
    });

    return response(200, { ok: true, path: `uploads/${filename}` });
  } catch (error) {
    return response(400, { ok: false, error: error.message });
  }
};
