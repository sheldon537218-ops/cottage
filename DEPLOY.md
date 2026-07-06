# 公网部署说明

这个小游戏是一个 Node.js Web 应用，公开部署后任何人都可以访问网页。信件内容和相册图片仍然可以通过网页里的内容管理界面修改。

推荐平台有两条路线：

- Netlify：不用长期运行自己的 Node 服务器，使用 Netlify Functions + Netlify Blobs 保存信件和上传图片。
- Render：使用 Node Web Service + Persistent Disk。

如果 Render 要求绑定银行卡，可以优先用 Netlify。

## 运行要求

- Node.js 18 或更新版本
- Render 账号，或一个可以长期运行 Node.js 服务的公网环境
- 如果使用云平台，请确保文件系统或挂载磁盘是持久化的，否则上传的相册图片和 `game-config.json` 修改可能在重启后丢失

## 环境变量

- `PORT`: 服务器端口，云平台通常会自动提供
- `HOST`: 监听地址，公网部署建议 `0.0.0.0`
- `ADMIN_PASSWORD`: 内容管理密码。设置后，保存信件和上传图片时必须输入这个密码
- `DATA_DIR`: 持久数据目录。Render 部署时使用 `/var/data`

示例：

```bash
PORT=4173 HOST=0.0.0.0 ADMIN_PASSWORD=your-secret-password npm start
```

Windows PowerShell 示例：

```powershell
$env:PORT="4173"
$env:HOST="0.0.0.0"
$env:ADMIN_PASSWORD="your-secret-password"
$env:DATA_DIR="E:\codex\gift\.data"
npm start
```

## Render 部署步骤

1. 把整个 `E:\codex\gift` 项目上传到 GitHub 仓库。
2. 打开 Render，选择 `New` -> `Blueprint`。
3. 连接这个 GitHub 仓库。
4. Render 会读取项目里的 `render.yaml`，自动创建 Web Service 和 1GB Persistent Disk。
5. 在 Render 的环境变量里设置：

```text
ADMIN_PASSWORD=你的管理密码
```

6. 点击部署。部署完成后，Render 会给你一个公网 URL，例如：

```text
https://tc-yp-cottage.onrender.com/
```

7. 打开网页后按 `O` 进入内容管理界面。保存信件或上传图片时输入 `ADMIN_PASSWORD`。

## 本地启动

```bash
npm start
```

打开：

```text
http://127.0.0.1:4173/
```

## 公网访问

部署到公网服务器后，访问平台给你的 URL，例如：

```text
https://your-app.example.com/
```

或使用服务器公网 IP：

```text
http://your-server-ip:4173/
```

## 内容管理

打开网页后按 `O` 打开内容管理界面。

如果设置了 `ADMIN_PASSWORD`，保存信件或上传相册图片时会弹出密码输入框。

## 数据持久化

需要持久保存的内容：

- `DATA_DIR/game-config.json`
- `DATA_DIR/uploads/`

Render 的 `render.yaml` 已经把 Persistent Disk 挂载到 `/var/data`，并通过 `DATA_DIR=/var/data` 使用它。第一次启动时，程序会自动把项目里的默认 `game-config.json` 复制到持久目录。

## Netlify 部署步骤

1. 把整个 `E:\codex\gift` 项目上传到 GitHub 仓库。
2. 打开 Netlify，选择 `Add new project` -> `Import an existing project`。
3. 选择 GitHub，并选择这个仓库。
4. 构建设置保持项目里的 `netlify.toml` 即可：

```text
Publish directory: .
Functions directory: netlify/functions
```

5. 在 Netlify 的环境变量里设置：

```text
ADMIN_PASSWORD=你的管理密码
```

6. 点击 Deploy。
7. 部署完成后，Netlify 会给你一个公网网址，例如：

```text
https://your-site-name.netlify.app/
```

8. 打开网页后按 `O` 进入内容管理界面。保存信件或上传图片时输入 `ADMIN_PASSWORD`。

Netlify 版本的数据保存位置：

- 信件和相册配置：Netlify Blobs 的 `gift-config` store
- 上传图片：Netlify Blobs 的 `gift-uploads` store

注意：如果上传大图片很多，可能会受 Netlify 免费额度限制。普通几张相册图通常没问题。
