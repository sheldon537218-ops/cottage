const canvas = document.querySelector("#game");
const ctx = canvas.getContext("2d");

const room = { width: canvas.width, height: canvas.height };
const keys = new Set();
const player = {
  x: 500,
  y: 465,
  r: 28,
  speed: 3.1,
  facing: 1,
  bob: 0,
};

const table = { x: 405, y: 262, w: 150, h: 92 };
const letterSpot = { x: 445, y: 292, kind: "letter" };
const albumSpot = { x: 516, y: 295, kind: "album" };
const albumImages = [
  "assets/album/memory-1.png",
  "assets/album/memory-2.png",
  "assets/album/memory-3.png",
  "assets/album/memory-4.png",
];
let extraElements = [];

let activePhoto = 0;
let lastTime = performance.now();

const modals = {
  choice: document.querySelector("#choiceModal"),
  letter: document.querySelector("#letterModal"),
  album: document.querySelector("#albumModal"),
  editor: document.querySelector("#editorModal"),
};

const albumImage = document.querySelector("#albumImage");
const albumCaption = document.querySelector("#albumCaption");
const editorStatus = document.querySelector("#editorStatus");
let adminPassword = "";

const obstacles = [
  { x: 65, y: 74, w: 130, h: 85 },
  { x: 756, y: 95, w: 128, h: 83 },
  { x: 696, y: 362, w: 158, h: 106 },
  { x: table.x - 4, y: table.y - 4, w: table.w + 8, h: table.h + 8 },
  { x: 92, y: 396, w: 168, h: 74 },
];

function isModalOpen() {
  return Object.values(modals).some((modal) => !modal.classList.contains("hidden"));
}

function openModal(name) {
  Object.values(modals).forEach((modal) => modal.classList.add("hidden"));
  modals[name].classList.remove("hidden");
}

function closeModals() {
  Object.values(modals).forEach((modal) => modal.classList.add("hidden"));
}

function distance(a, b) {
  return Math.hypot(a.x - b.x, a.y - b.y);
}

function nearestTableItem() {
  const letterDistance = distance(player, letterSpot);
  const albumDistance = distance(player, albumSpot);
  const tableDistance = distance(player, { x: table.x + table.w / 2, y: table.y + table.h / 2 });

  if (letterDistance < 86 && letterDistance + 12 < albumDistance) return "letter";
  if (albumDistance < 86 && albumDistance + 12 < letterDistance) return "album";
  if (tableDistance < 154) return "choice";
  return null;
}

function isNearTable() {
  return nearestTableItem() !== null;
}

function canMoveTo(nextX, nextY) {
  const padding = player.r - 5;
  if (nextX < 52 || nextX > room.width - 52 || nextY < 62 || nextY > room.height - 58) return false;

  const dynamicObstacles = extraElements
    .filter((item) => item.solid)
    .map((item) => ({ x: item.x, y: item.y, w: item.w, h: item.h }));

  return ![...obstacles, ...dynamicObstacles].some((rect) => {
    const closestX = Math.max(rect.x, Math.min(nextX, rect.x + rect.w));
    const closestY = Math.max(rect.y, Math.min(nextY, rect.y + rect.h));
    return Math.hypot(nextX - closestX, nextY - closestY) < padding;
  });
}

function update() {
  if (isModalOpen()) return;

  let dx = 0;
  let dy = 0;
  if (keys.has("KeyW") || keys.has("ArrowUp")) dy -= 1;
  if (keys.has("KeyS") || keys.has("ArrowDown")) dy += 1;
  if (keys.has("KeyA") || keys.has("ArrowLeft")) dx -= 1;
  if (keys.has("KeyD") || keys.has("ArrowRight")) dx += 1;

  if (dx !== 0 || dy !== 0) {
    const len = Math.hypot(dx, dy);
    dx = (dx / len) * player.speed;
    dy = (dy / len) * player.speed;
    player.facing = dx < 0 ? -1 : dx > 0 ? 1 : player.facing;
    player.bob += 0.18;

    if (canMoveTo(player.x + dx, player.y)) player.x += dx;
    if (canMoveTo(player.x, player.y + dy)) player.y += dy;
  } else {
    player.bob *= 0.9;
  }
}

function drawRoundedRect(x, y, w, h, r) {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
}

function fillRoundedRect(x, y, w, h, r, fill, stroke) {
  drawRoundedRect(x, y, w, h, r);
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
}

function drawRoom() {
  const floorGradient = ctx.createLinearGradient(0, 80, 0, room.height);
  floorGradient.addColorStop(0, "#ffe8bf");
  floorGradient.addColorStop(1, "#f8c995");
  ctx.fillStyle = floorGradient;
  ctx.fillRect(0, 0, room.width, room.height);

  ctx.fillStyle = "#ffd8bd";
  ctx.fillRect(42, 48, room.width - 84, 512);
  ctx.fillStyle = "#fff2cf";
  ctx.fillRect(42, 48, room.width - 84, 190);
  ctx.fillStyle = "#f4b989";
  ctx.fillRect(42, 238, room.width - 84, 322);

  ctx.strokeStyle = "rgba(141, 83, 67, 0.16)";
  ctx.lineWidth = 3;
  for (let y = 260; y < 560; y += 34) {
    ctx.beginPath();
    ctx.moveTo(48, y);
    ctx.lineTo(912, y);
    ctx.stroke();
  }
  for (let x = 72; x < 920; x += 72) {
    ctx.beginPath();
    ctx.moveTo(x, 238);
    ctx.lineTo(x - 46, 560);
    ctx.stroke();
  }

  ctx.fillStyle = "#b96f46";
  ctx.fillRect(34, 42, 892, 18);
  ctx.fillRect(34, 548, 892, 18);
  ctx.fillRect(34, 42, 18, 524);
  ctx.fillRect(908, 42, 18, 524);
}

function drawFurniture() {
  extraElements.forEach(drawExtraElement);

  fillRoundedRect(74, 82, 112, 66, 8, "#99d6c2", "#579c87");
  ctx.fillStyle = "#fff9e6";
  ctx.fillRect(86, 96, 88, 32);
  ctx.fillStyle = "#60a992";
  ctx.fillRect(86, 132, 88, 8);

  fillRoundedRect(764, 92, 112, 82, 8, "#f49aaa", "#b95770");
  ctx.fillStyle = "#fff2c5";
  ctx.fillRect(779, 110, 82, 48);
  ctx.fillStyle = "#c54f65";
  ctx.fillRect(790, 161, 58, 8);

  fillRoundedRect(700, 370, 150, 84, 8, "#8bc9e5", "#4a8eae");
  ctx.fillStyle = "#f9ffff";
  ctx.fillRect(718, 388, 114, 34);
  ctx.fillStyle = "#5aa9c9";
  ctx.fillRect(718, 426, 114, 12);

  fillRoundedRect(92, 404, 168, 54, 8, "#f8df84", "#c78f37");
  ctx.fillStyle = "#ff93a9";
  ctx.beginPath();
  ctx.arc(126, 402, 24, 0, Math.PI * 2);
  ctx.arc(170, 398, 18, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(92, 47, 39, 0.18)";
  ctx.beginPath();
  ctx.ellipse(table.x + 75, table.y + 98, 94, 24, 0, 0, Math.PI * 2);
  ctx.fill();

  fillRoundedRect(table.x, table.y, table.w, table.h, 12, "#b86a42", "#7f432c");
  fillRoundedRect(table.x + 14, table.y + 12, table.w - 28, table.h - 24, 10, "#cf8153");

  ctx.fillStyle = "#7f432c";
  ctx.fillRect(table.x + 14, table.y + table.h - 4, 18, 52);
  ctx.fillRect(table.x + table.w - 32, table.y + table.h - 4, 18, 52);

  ctx.save();
  ctx.translate(letterSpot.x, letterSpot.y);
  ctx.rotate(-0.18);
  fillRoundedRect(-27, -18, 54, 36, 4, "#fff6df", "#e5a78f");
  ctx.strokeStyle = "#e5a78f";
  ctx.beginPath();
  ctx.moveTo(-24, -14);
  ctx.lineTo(0, 4);
  ctx.lineTo(24, -14);
  ctx.stroke();
  ctx.fillStyle = "#e85073";
  ctx.beginPath();
  ctx.arc(16, 10, 5, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();

  ctx.save();
  ctx.translate(albumSpot.x, albumSpot.y);
  ctx.rotate(0.12);
  fillRoundedRect(-28, -22, 56, 44, 5, "#86dcca", "#438d82");
  ctx.fillStyle = "#fff6a8";
  ctx.fillRect(-17, -12, 34, 24);
  ctx.fillStyle = "#f35d85";
  ctx.beginPath();
  ctx.arc(-7, 0, 8, 0, Math.PI * 2);
  ctx.arc(8, 0, 8, 0, Math.PI * 2);
  ctx.fill();
  ctx.restore();
}

function drawExtraElement(item) {
  const fill = item.fill || "#f4a3b8";
  const stroke = item.stroke || "rgba(80, 48, 66, 0.28)";

  if (item.type === "heart") {
    drawHeart(item.x + item.w / 2, item.y + item.h / 2, Math.min(item.w, item.h) / 2, fill, stroke);
    return;
  }

  if (item.type === "heartGarland") {
    ctx.save();
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.beginPath();
    ctx.moveTo(item.x, item.y + item.h * 0.22);
    ctx.quadraticCurveTo(item.x + item.w / 2, item.y + item.h * 0.78, item.x + item.w, item.y + item.h * 0.22);
    ctx.stroke();
    for (let i = 0; i < 5; i += 1) {
      const px = item.x + item.w * (0.12 + i * 0.19);
      const py = item.y + item.h * (0.28 + Math.sin(i / 4 * Math.PI) * 0.32);
      drawHeart(px, py + 12, 9, i % 2 === 0 ? fill : "#ffd15d", stroke);
      ctx.beginPath();
      ctx.moveTo(px, py);
      ctx.lineTo(px, py + 8);
      ctx.stroke();
    }
    ctx.restore();
    return;
  }

  if (item.type === "flowerVase") {
    drawFlowerVase(item);
    return;
  }

  if (item.type === "plant") {
    fillRoundedRect(item.x + item.w * 0.32, item.y + item.h * 0.58, item.w * 0.36, item.h * 0.35, 8, "#d98f58", "#9a5d38");
    ctx.fillStyle = fill;
    for (let i = 0; i < 5; i += 1) {
      ctx.beginPath();
      ctx.ellipse(
        item.x + item.w * (0.25 + i * 0.12),
        item.y + item.h * (0.45 - Math.sin(i) * 0.13),
        item.w * 0.18,
        item.h * 0.16,
        i * 0.5,
        0,
        Math.PI * 2
      );
      ctx.fill();
    }
    return;
  }

  if (item.type === "lamp") {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 5;
    ctx.beginPath();
    ctx.moveTo(item.x + item.w / 2, item.y + item.h * 0.34);
    ctx.lineTo(item.x + item.w / 2, item.y + item.h);
    ctx.stroke();
    fillRoundedRect(item.x + item.w * 0.18, item.y, item.w * 0.64, item.h * 0.35, 16, fill, stroke);
    return;
  }

  fillRoundedRect(item.x, item.y, item.w, item.h, 8, fill, stroke);
  ctx.fillStyle = "rgba(255, 255, 255, 0.62)";
  ctx.fillRect(item.x + item.w * 0.13, item.y + item.h * 0.22, item.w * 0.74, item.h * 0.38);
}

function drawHeart(cx, cy, size, fill, stroke) {
  ctx.save();
  ctx.translate(cx, cy);
  ctx.scale(size / 16, size / 16);
  ctx.beginPath();
  ctx.moveTo(0, 8);
  ctx.bezierCurveTo(-18, -4, -11, -17, 0, -8);
  ctx.bezierCurveTo(11, -17, 18, -4, 0, 8);
  ctx.closePath();
  ctx.fillStyle = fill;
  ctx.fill();
  if (stroke) {
    ctx.strokeStyle = stroke;
    ctx.lineWidth = 2;
    ctx.stroke();
  }
  ctx.restore();
}

function drawFlowerVase(item) {
  const cx = item.x + item.w / 2;
  const baseY = item.y + item.h * 0.72;
  ctx.save();
  ctx.strokeStyle = item.stroke || "#7da85a";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  [-18, -9, 0, 9, 18].forEach((offset, index) => {
    ctx.beginPath();
    ctx.moveTo(cx, baseY);
    ctx.quadraticCurveTo(cx + offset * 0.4, item.y + item.h * 0.42, cx + offset, item.y + item.h * (0.18 + (index % 2) * 0.08));
    ctx.stroke();
  });
  [-18, -9, 0, 9, 18].forEach((offset, index) => {
    const flowerX = cx + offset;
    const flowerY = item.y + item.h * (0.18 + (index % 2) * 0.08);
    ctx.fillStyle = index % 2 === 0 ? item.fill || "#ff7da0" : "#ffd15d";
    for (let p = 0; p < 6; p += 1) {
      ctx.beginPath();
      ctx.ellipse(flowerX + Math.cos(p) * 7, flowerY + Math.sin(p) * 7, 5, 8, p, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.fillStyle = "#fff7a7";
    ctx.beginPath();
    ctx.arc(flowerX, flowerY, 4, 0, Math.PI * 2);
    ctx.fill();
  });
  fillRoundedRect(item.x + item.w * 0.25, item.y + item.h * 0.58, item.w * 0.5, item.h * 0.32, 10, "#f2a6bd", "#b85d78");
  ctx.restore();
}

function drawPlayer() {
  const bob = Math.sin(player.bob) * 3;
  ctx.save();
  ctx.translate(player.x, player.y + bob);
  ctx.scale(player.facing, 1);

  ctx.fillStyle = "rgba(90, 35, 45, 0.18)";
  ctx.beginPath();
  ctx.ellipse(0, 34, 36, 11, 0, 0, Math.PI * 2);
  ctx.fill();

  const bodyGradient = ctx.createRadialGradient(-13, -17, 8, 0, 0, 42);
  bodyGradient.addColorStop(0, "#ff405f");
  bodyGradient.addColorStop(0.5, "#d81943");
  bodyGradient.addColorStop(1, "#8e0d2a");
  ctx.fillStyle = bodyGradient;
  ctx.beginPath();
  ctx.ellipse(0, 0, 35, 38, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "rgba(255, 255, 255, 0.2)";
  ctx.beginPath();
  ctx.ellipse(-14, -18, 10, 6, -0.55, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ffe5bf";
  ctx.beginPath();
  ctx.moveTo(-21, -17);
  ctx.bezierCurveTo(-25, -7, -23, 16, -10, 22);
  ctx.bezierCurveTo(-2, 27, 12, 26, 21, 18);
  ctx.bezierCurveTo(29, 8, 24, -9, 16, -17);
  ctx.bezierCurveTo(8, -12, 0, -11, -7, -16);
  ctx.bezierCurveTo(-12, -19, -17, -20, -21, -17);
  ctx.closePath();
  ctx.fill();

  ctx.fillStyle = "rgba(246, 128, 91, 0.3)";
  ctx.beginPath();
  ctx.ellipse(-17, 3, 7, 5, 0, 0, Math.PI * 2);
  ctx.ellipse(17, 3, 7, 5, 0, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#116a2e";
  ctx.lineWidth = 5.5;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(2, -35);
  ctx.quadraticCurveTo(7, -58, 22, -64);
  ctx.stroke();

  const leafGradient = ctx.createLinearGradient(10, -69, 37, -55);
  leafGradient.addColorStop(0, "#58d475");
  leafGradient.addColorStop(1, "#0e8a43");
  ctx.fillStyle = leafGradient;
  ctx.beginPath();
  ctx.ellipse(28, -64, 15, 8, -0.35, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(8, 98, 45, 0.75)";
  ctx.lineWidth = 1.5;
  ctx.beginPath();
  ctx.moveTo(16, -61);
  ctx.quadraticCurveTo(27, -66, 39, -67);
  ctx.stroke();

  ctx.fillStyle = "#4b2b20";
  ctx.beginPath();
  ctx.ellipse(-12, -4, 6, 8, 0, 0, Math.PI * 2);
  ctx.ellipse(12, -4, 6, 8, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(-14, -8, 2.6, 0, Math.PI * 2);
  ctx.arc(10, -8, 2.6, 0, Math.PI * 2);
  ctx.arc(-10, 0, 1.8, 0, Math.PI * 2);
  ctx.arc(15, 0, 1.8, 0, Math.PI * 2);
  ctx.fill();

  ctx.strokeStyle = "#59302b";
  ctx.lineWidth = 2.2;
  ctx.lineCap = "round";
  ctx.beginPath();
  ctx.moveTo(-6, -18);
  ctx.quadraticCurveTo(-2, -22, 0, -16);
  ctx.moveTo(6, -18);
  ctx.quadraticCurveTo(2, -22, 0, -16);
  ctx.stroke();

  const noseGradient = ctx.createRadialGradient(-3, 4, 1, 0, 7, 8);
  noseGradient.addColorStop(0, "#4c4c4c");
  noseGradient.addColorStop(1, "#0f0f12");
  ctx.fillStyle = noseGradient;
  ctx.beginPath();
  ctx.ellipse(0, 8, 8, 7, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(0, 0, 0, 0.42)";
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = "#a91132";
  ctx.beginPath();
  ctx.ellipse(-31, 8, 8, 13, -0.75, 0, Math.PI * 2);
  ctx.ellipse(31, 8, 8, 13, 0.75, 0, Math.PI * 2);
  ctx.fill();

  ctx.fillStyle = "#ba1234";
  ctx.beginPath();
  ctx.ellipse(-13, 36, 11, 8, -0.1, 0, Math.PI * 2);
  ctx.ellipse(13, 36, 11, 8, 0.1, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(255, 255, 255, 0.28)";
  ctx.beginPath();
  ctx.ellipse(-15, 32, 4, 2, -0.2, 0, Math.PI * 2);
  ctx.ellipse(11, 32, 4, 2, -0.2, 0, Math.PI * 2);
  ctx.fill();

  ctx.restore();
}

function drawInteractionPrompt() {
  if (!isNearTable() || isModalOpen()) return;

  const text = "请点击空格进行交互";
  ctx.save();
  ctx.font = "700 18px Microsoft YaHei, sans-serif";
  const width = ctx.measureText(text).width + 30;
  const x = player.x - width / 2;
  const y = player.y - player.r - 56;
  fillRoundedRect(x, y, width, 38, 18, "rgba(255, 255, 255, 0.86)", "rgba(214, 84, 110, 0.28)");
  ctx.fillStyle = "#8a3651";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(text, player.x, y + 19);
  ctx.restore();
}

function drawSparkles() {
  ctx.save();
  ctx.fillStyle = "rgba(255, 255, 255, 0.78)";
  const points = [
    [282, 104],
    [632, 130],
    [330, 430],
    [606, 430],
    [846, 254],
  ];
  points.forEach(([x, y], index) => {
    const pulse = 0.8 + Math.sin(performance.now() / 480 + index) * 0.22;
    ctx.beginPath();
    ctx.moveTo(x, y - 8 * pulse);
    ctx.lineTo(x + 5 * pulse, y);
    ctx.lineTo(x, y + 8 * pulse);
    ctx.lineTo(x - 5 * pulse, y);
    ctx.closePath();
    ctx.fill();
  });
  ctx.restore();
}

function render(now) {
  const dt = Math.min(32, now - lastTime);
  lastTime = now;
  for (let i = 0; i < Math.max(1, Math.round(dt / 16)); i += 1) update();

  ctx.clearRect(0, 0, room.width, room.height);
  drawRoom();
  drawSparkles();
  drawFurniture();
  drawPlayer();
  drawInteractionPrompt();
  requestAnimationFrame(render);
}

function interact() {
  const target = nearestTableItem();
  if (target === "letter") openModal("letter");
  if (target === "album") openAlbum();
  if (target === "choice") openModal("choice");
}

function openAlbum() {
  updateAlbum();
  openModal("album");
}

function updateAlbum() {
  albumImage.src = albumImages[activePhoto];
  albumCaption.textContent = `第 ${activePhoto + 1} 页 / 共 ${albumImages.length} 页`;
}

async function loadConfig() {
  try {
    const response = await fetch("/api/config");
    if (!response.ok) throw new Error("配置读取失败");
    const config = await response.json();
    applyConfig(config);
  } catch {
    fillEditor();
  }
}

function applyConfig(config) {
  if (config.letter) {
    document.querySelector("#letterTitle").textContent = config.letter.title || "给宝宝的一封信";
    document.querySelector("#letterBody").textContent = config.letter.body || "";
  }

  if (config.album) {
    document.querySelector("#albumTitle").textContent = config.album.title || "我们的多巴胺相册";
    if (Array.isArray(config.album.images) && config.album.images.length) {
      albumImages.splice(0, albumImages.length, ...config.album.images);
      activePhoto = Math.min(activePhoto, albumImages.length - 1);
      updateAlbum();
    }
  }

  extraElements = Array.isArray(config.room?.extraElements) ? config.room.extraElements : [];
  fillEditor();
}

function currentConfigFromPage() {
  return {
    letter: {
      title: document.querySelector("#letterTitle").textContent,
      body: document.querySelector("#letterBody").textContent.trim(),
    },
    album: {
      title: document.querySelector("#albumTitle").textContent,
      images: [...albumImages],
    },
    room: {
      extraElements,
    },
  };
}

function fillEditor() {
  const config = currentConfigFromPage();
  document.querySelector("#letterTitleInput").value = config.letter.title;
  document.querySelector("#letterBodyInput").value = config.letter.body;
  document.querySelector("#albumTitleInput").value = config.album.title;
  document.querySelector("#albumImagesInput").value = config.album.images.join("\n");
  document.querySelector("#roomElementsInput").value = JSON.stringify(config.room.extraElements, null, 2);
}

function fileToDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function getAdminHeaders() {
  if (!adminPassword) {
    adminPassword = window.prompt("请输入管理员密码") || "";
  }
  return {
    "Content-Type": "application/json",
    "X-Admin-Password": adminPassword,
  };
}

async function uploadSelectedImages() {
  const input = document.querySelector("#albumUploadInput");
  const files = [...input.files];
  if (!files.length) return;

  editorStatus.textContent = "正在上传图片...";
  const textarea = document.querySelector("#albumImagesInput");
  const paths = textarea.value.split("\n").map((line) => line.trim()).filter(Boolean);

  for (const file of files) {
    const dataUrl = await fileToDataUrl(file);
    const response = await fetch("/api/upload-image", {
      method: "POST",
      headers: getAdminHeaders(),
      body: JSON.stringify({ filename: file.name, dataUrl }),
    });
    const result = await response.json();
    if (response.status === 401) adminPassword = "";
    if (!result.ok) throw new Error(result.error || "上传失败");
    paths.push(result.path);
  }

  textarea.value = paths.join("\n");
  input.value = "";
  editorStatus.textContent = "图片已加入列表，点击保存后生效";
}

async function saveConfig() {
  try {
    const nextConfig = {
      letter: {
        title: document.querySelector("#letterTitleInput").value.trim() || "给宝宝的一封信",
        body: document.querySelector("#letterBodyInput").value.trim(),
      },
      album: {
        title: document.querySelector("#albumTitleInput").value.trim() || "我们的多巴胺相册",
        images: document.querySelector("#albumImagesInput").value.split("\n").map((line) => line.trim()).filter(Boolean),
      },
      room: {
        extraElements: JSON.parse(document.querySelector("#roomElementsInput").value || "[]"),
      },
    };

    const response = await fetch("/api/config", {
      method: "POST",
      headers: getAdminHeaders(),
      body: JSON.stringify(nextConfig),
    });
    const result = await response.json();
    if (response.status === 401) adminPassword = "";
    if (!result.ok) throw new Error(result.error || "保存失败");
    applyConfig(nextConfig);
    editorStatus.textContent = "已保存并刷新游戏";
  } catch (error) {
    editorStatus.textContent = error.message;
  }
}

function openEditorModal() {
  fillEditor();
  editorStatus.textContent = "";
  openModal("editor");
}

window.addEventListener("keydown", (event) => {
  const isTypingField = ["INPUT", "TEXTAREA"].includes(event.target?.tagName);

  if (["KeyW", "KeyA", "KeyS", "KeyD", "ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight"].includes(event.code)) {
    keys.add(event.code);
    event.preventDefault();
  }

  if (event.code === "Space") {
    event.preventDefault();
    if (!isModalOpen()) interact();
  }

  if (!isTypingField && event.code === "KeyO") {
    event.preventDefault();
    openEditorModal();
  }

  if (event.code === "Escape") closeModals();
  if (!modals.choice.classList.contains("hidden") && event.code === "Digit1") openModal("letter");
  if (!modals.choice.classList.contains("hidden") && event.code === "Digit2") openAlbum();
});

window.addEventListener("keyup", (event) => {
  keys.delete(event.code);
});

document.querySelectorAll("[data-close]").forEach((button) => {
  button.addEventListener("click", closeModals);
});

document.querySelector("#openLetter").addEventListener("click", () => openModal("letter"));
document.querySelector("#openAlbum").addEventListener("click", openAlbum);
document.querySelector("#albumUploadInput").addEventListener("change", () => {
  uploadSelectedImages().catch((error) => {
    editorStatus.textContent = error.message;
  });
});
document.querySelector("#saveConfig").addEventListener("click", saveConfig);
document.querySelector("#resetEditor").addEventListener("click", () => {
  fillEditor();
  editorStatus.textContent = "已恢复当前配置";
});
document.querySelector("#prevPhoto").addEventListener("click", () => {
  activePhoto = (activePhoto + albumImages.length - 1) % albumImages.length;
  updateAlbum();
});
document.querySelector("#nextPhoto").addEventListener("click", () => {
  activePhoto = (activePhoto + 1) % albumImages.length;
  updateAlbum();
});

updateAlbum();
loadConfig();
requestAnimationFrame(render);
