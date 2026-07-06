const { response, uploadStore } = require("./_shared");

const mimeTypes = {
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".webp": "image/webp",
};

exports.handler = async (event) => {
  const key = decodeURIComponent((event.path || "").split("/").pop() || "");
  if (!key || key.includes("/") || key.includes("\\")) {
    return response(404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
  }

  const data = await uploadStore().get(key, { type: "arrayBuffer" });
  if (!data) {
    return response(404, "Not found", { "Content-Type": "text/plain; charset=utf-8" });
  }

  const ext = key.slice(key.lastIndexOf(".")).toLowerCase();
  return {
    statusCode: 200,
    headers: {
      "Content-Type": mimeTypes[ext] || "application/octet-stream",
      "Cache-Control": "public, max-age=31536000, immutable",
    },
    body: Buffer.from(data).toString("base64"),
    isBase64Encoded: true,
  };
};
