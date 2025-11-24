# EdgeOne Pages 短网址服务

> 基于 EdgeOne Pages Functions 与 KV 存储构建的生产级短网址服务，提供完整的 RESTful API 和简洁的 Next.js UI 界面。

## 快速开始

> **前置要求**：请先申请并开通 EdgeOne Pages 的 KV 存储服务

### 一键部署

选择对应的站点进行部署：

**国际站**  
[![Use EdgeOne Pages to deploy](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://edgeone.ai/pages/new?repository-url=https://github.com/lm379/dwz)

**中国站**  
[![使用 EdgeOne Pages 部署](https://cdnstatic.tencentcs.com/edgeone/pages/deploy.svg)](https://console.cloud.tencent.com/edgeone/pages/new?repository-url=https://github.com/lm379/dwz)

### 手动部署

1. **Fork 仓库**：Fork 本仓库到你的 GitHub 账号
2. **绑定项目**：前往 EdgeOne Pages 后台绑定 GitHub 仓库，选择你 Fork 的仓库
3. **配置构建**：按照向导完成配置，点击部署
4. **补充配置**：如果初次部署时未绑定 KV 或环境变量，可在绑定后重新部署

### 配置说明

部署完成后，需要进行以下配置：

1. **创建 KV 命名空间**
   - 在项目设置中创建或绑定一个 KV 命名空间
   - 绑定名称设置为 `dwz_kv`（或自定义名称）

2. **配置环境变量**（可选）
   - 如使用自定义 KV 绑定名，设置 `DWZ_KV_BINDING` 环境变量
   - 如需 API 认证保护，设置 `API_TOKEN` 环境变量
   - 如需显示备案信息，设置 `ICP` 环境变量

3. **重新部署**
   - 配置完成后触发一次需要重新部署才可生效

## 核心功能

✨ **短链生成**
- 支持为任意 URL 生成短链接
- 支持自定义别名（slug）
- 幂等性保证：相同 URL 多次创建返回同一短链

🔗 **短链跳转**
- 通过 `/s/:slug` 进行 302 重定向
- 自动统计访问次数

📊 **数据查询**
- 短链还原：查询短链对应的原始 URL

## API 文档

### 创建短链

**POST** `/api/shorten`

创建新的短链接或返回已存在的短链。

**请求体**
```json
{
  "url": "https://example.com/very/long/url",
  "slug": "my-link"  // 可选，不传则自动生成
}
```

**响应**
```json
{
  "slug": "my-link",
  "url": "https://example.com/very/long/url",
  "shortUrl": "https://your.domain.com/s/my-link"
}
```

**说明**
- 未传 `slug` 时将自动生成 7 位随机字符
- 相同 URL 多次创建返回同一短链（幂等性）
- 若设置了 `API_TOKEN`，需在请求头中包含：
  - `Authorization: Bearer {API_TOKEN}` 或
  - `X-API-Token: {API_TOKEN}`

---

### 解析短链

**GET** `/api/resolve?slug={slug}`

查询短链对应的原始 URL。

**请求参数**
- `slug`: 短链别名，例如 `abc123`
- 也可传入完整短链 URL，例如 `https://your.domain.com/s/abc123`

**响应**
```json
{
  "slug": "abc123",
  "url": "https://example.com/original/url"
}
```

---

### 短链跳转

**GET** `/s/:slug`

302 重定向到原始 URL，并增加访问计数。

**示例**
```
https://your.domain.com/s/abc123 → https://example.com/original/url
```

---

## 技术架构

### KV 存储键设计

| 键模式 | 值类型 | 说明 |
|--------|--------|------|
| `s:{slug}` | String | 正向映射：短链别名 → 原始 URL |
| `u:{url}` | String | 反向映射：原始 URL → 短链别名（用于实现幂等性） |
| `c:{slug}` | String | 访问计数器：存储短链的访问次数 |

### 技术栈

- **前端 UI**：Next.js 14 + React + Tailwind CSS
- **后端 API**：EdgeOne Pages Functions（无服务器）
- **数据存储**：EdgeOne KV（键值存储）
- **开发语言**：TypeScript

## 环境变量配置

| 变量名 | 说明 | 默认值 | 必填 |
|--------|------|--------|------|
| `DWZ_KV_BINDING` | KV 命名空间的绑定名称 | `dwz_kv` | 否 |
| `API_TOKEN` | API 访问令牌，启用后需在请求头中携带 | - | 否 |
| `PASSWORD` | 创建短链所需的密码，启用后需在请求体中提供 | - | 否 |
| `NEXT_PUBLIC_PASSWORD_REQUIRED` | 设为 `true` 在 UI 中显示密码输入框（设置 PASSWORD 时也需要设置此变量） | - | 否 |
| `NEXT_PUBLIC_ANNOUNCEMENT` | 页面右上角公告内容，显示 5 秒后自动隐藏，用户可手动关闭，支持 HTML 标签 | - | 否 |
| `NEXT_PUBLIC_ANNOUNCEMENT_ENCODED` | URL 编码后的公告内容，优先级高于 `NEXT_PUBLIC_ANNOUNCEMENT`，适用于云平台限制特殊字符的场景 | - | 否 |
| `ICP` | ICP 备案号，设置后显示在页面底部 | - | 否 |

**说明**

- **DWZ_KV_BINDING**：如果你的 KV 绑定名不是 `dwz_kv`，需要设置此变量
  - 运行时查找顺序：`globalThis[bindingName]` → `env[bindingName]`
  
- **API_TOKEN**：用于保护短链创建接口，防止滥用
  - 启用后，调用 `/api/shorten` 需在请求头携带：
    - `Authorization: Bearer {API_TOKEN}` 或
    - `X-API-Token: {API_TOKEN}`
  - 同源请求（Web UI）无需提供 Token

- **PASSWORD**：用于保护短链创建，要求用户输入密码，防止滥用
  - 启用后，调用 `/api/shorten` 需在请求体中提供：
    - `{ "password": "your-password" }`
  - 本地开发环境（localhost）会自动跳过密码验证

- **NEXT_PUBLIC_PASSWORD_REQUIRED**：控制 Web UI 是否显示密码输入框
  - 设置为 `true` 时，UI 会显示密码输入框
  - 如果设置了 `PASSWORD` 环境变量，建议同时设置此变量为 `true`
  - 此变量在构建时读取，无需运行时 API 请求
  
- **ICP**：仅中国大陆用户需要，用于显示网站备案信息

## 本地开发

### 1. 安装 EdgeOne CLI

```bash
npm install -g edgeone
```

### 2. 绑定项目

```bash
edgeone pages link
```

按照提示选择或创建 EdgeOne Pages 项目。

### 3. 配置 KV

前往 [EdgeOne 控制台](https://console.cloud.tencent.com/edgeone) 查看已绑定的项目，在项目设置中绑定 KV 命名空间。

### 4. 启动开发服务器

```bash
edgeone pages dev
```

访问 http://localhost:8088 查看应用。

### 5. 开发说明

- 修改 `functions/` 目录下的文件将自动重载
- 修改 `app/` 和 `components/` 需要重启开发服务器
- 本地开发环境会自动跳过 API Token 验证

---

## 相关链接

- [EdgeOne Pages 文档](https://pages.edgeone.ai/zh/document/product-introduction)
- [EdgeOne KV 文档](https://pages.edgeone.ai/zh/document/kv-storage)
- [问题反馈](https://github.com/lm379/dwz/issues)

---

<p align="center">
  <sub>使用 EdgeOne Pages 构建 ⚡</sub>
</p>  

