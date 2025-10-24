# EdgeOne Pages 短网址服务（Functions + KV）

基于 EdgeOne Pages Functions 与 KV 存储构建的短网址生成器。提供完整 RESTful API，支持创建、还原与跳转。

## 功能
- 指定 URL 生成短链（支持自定义别名 slug）
- 幂等：同一 URL 多次创建返回同一短链
- 通过 `/:slug` 302 跳转到原始 URL
- 还原 API 查询原始 URL
- 跳转计数

## 接口
- POST `/api/shorten`
  - Body: `{ url: string; slug?: string }`
  - Response: `{ slug, url, shortUrl }`
  - 说明：
    - 未传 `slug` 将自动生成
    - 若该 URL 已存在，会直接返回已有短链（返回 200）
    - 若设置了API Token，请求时需要带上 `Authorization: Bearer {API Token}` 或者 `X-API-Token: {API Token}`
- GET `/api/resolve?slug=abc123`   
 或 `/api/resolve?slug=https://你的域名/abc123`   
 或 `/api/resolve?url=https://你的域名/abc123`
  - Response: `{ slug, url }` 或 `404`
- GET `/:slug`
  - 302 跳转至原始 URL
  - 同时将访问计数 `c:{slug}` 加一
- GET `/api/stats?slug=abc123`
  - Response: `{ slug, url, visits }`

## KV 键设计
- `s:{slug}` => 原始 URL（正向映射）
- `u:{url}`  => slug（反向映射，用于幂等）
- `c:{slug}` => 访问计数（字符串数字）

## 环境变量
- `DWZ_KV_BINDING`
  - 运行时使用的 KV 绑定名
  - 默认：`dwz_kv`
  - 运行时查找顺序：`globalThis[bindingName]` -> `env[bindingName]`
- `API_TOKEN`
  - API Token，设置此变量后，调用 API 时需要在header中包含`Authorization: Bearer {API Token}`或者 `X-API-Token: {API Token}`
  - 默认：无
- `ICP`
  - ICP 备案号，设置此变量后，页面底部显示备案号
  - 默认：无

## 本地开发
```bash
npm install -g edgeone
edgeone pages link # 绑定你的项目
```
去 EdgeOne 控制台查看绑定的项目，将 KV 绑定到项目上，然后执行以下命令：
```bash
edgeone pages dev
```
打开 http://localhost:8088

## 部署（EdgeOne Pages）
1）在项目中创建/绑定一个 KV 命名空间，绑定名设为 `dwz_kv`（或你自定义的名称）  
2）使用自定义绑定名时，在运行环境中设置 `DWZ_KV_BINDING=你的绑定名`   
3）部署本项目为 EdgeOne Pages 应用  

