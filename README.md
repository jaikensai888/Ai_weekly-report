# 🤖 AI 智能周报助手

<p align="center">
  <b>一键生成智能周报 - Ai师傅儿</b>
</p>

<p align="center">
  基于 DeepSeek AI 的智能工作日志管理与周报生成工具
</p>

---

## ✨ 功能特点

| 功能 | 描述 |
|------|------|
| 📝 **日志管理** | 简洁高效的日志编辑器，支持 Markdown 格式 |
| 🔄 **任务追踪** | 支持待办事项管理，一键导入未完成任务 |
| 🤖 **AI 周报** | 基于 DeepSeek AI 智能分析日志，自动生成专业周报 |
| 📋 **模板系统** | 自定义周报模板，满足不同场景需求 |
| 👥 **多用户** | 支持用户注册登录，数据隔离 |
| 💾 **本地存储** | SQLite 数据库，数据安全永不丢失 |
| 🖥️ **桌面应用** | 支持打包为 Windows 桌面应用 |

## 🛠️ 技术栈

- **前端框架**: Next.js 14 + React 18
- **UI 样式**: Tailwind CSS
- **数据库**: Prisma ORM + SQLite
- **AI 能力**: DeepSeek API
- **桌面端**: Electron
- **语言**: TypeScript

## 📦 快速开始

### 环境要求

- Node.js 18+
- npm 或 yarn
- DeepSeek API Key ([获取地址](https://platform.deepseek.com/))

### 安装步骤

```bash
# 1. 克隆项目
git clone https://github.com/jaikensai888/Ai_weekly-report.git
cd Ai_weekly-report

# 2. 安装依赖
npm install

# 3. 配置环境变量
# 复制示例配置文件
cp config/env.example .env.local
# 编辑 .env.local，填入您的 DeepSeek API Key

# 4. 初始化数据库
npm run db:push

# 5. 启动开发服务器
npm run dev
```

启动成功后，访问 http://localhost:3000 即可使用。

### 桌面应用

```bash
# 开发模式（Web + Electron 同时运行）
npm run desktop:dev

# 构建 Windows 安装包
npm run desktop:build
```

## ⚙️ 环境变量配置

创建 `.env.local` 文件（参考 `config/env.example`）：

```env
# DeepSeek API 密钥（必填）
DEEPSEEK_API_KEY=your-deepseek-api-key
```

| 变量名 | 必填 | 说明 |
|--------|------|------|
| `DEEPSEEK_API_KEY` | ✅ | DeepSeek API 密钥，用于 AI 周报生成 |

> ⚠️ **安全提示**: 请勿将 `.env.local` 文件提交到版本控制系统

## 📁 项目结构

```
├── app/                    # Next.js 应用目录
│   ├── api/               # API 路由
│   │   ├── auth/         # 认证相关 (登录/注册/登出)
│   │   ├── logs/         # 日志 CRUD
│   │   ├── summaries/    # 周报管理
│   │   ├── summary/      # AI 周报生成
│   │   └── templates/    # 周报模板
│   ├── login/            # 登录页面
│   ├── layout.tsx        # 根布局
│   └── page.tsx          # 主页面
├── components/            # React 组件
│   ├── Editor.tsx        # 日志编辑器
│   ├── Sidebar.tsx       # 侧边栏导航
│   ├── SummaryEditor.tsx # 周报编辑器
│   ├── SummaryGenerator.tsx  # 周报生成器
│   └── TemplateManager.tsx   # 模板管理
├── config/               # 配置文件
│   ├── env.example       # 环境变量示例
│   └── 数据库表规范.md   # 数据库设计规范
├── doc/                  # 项目文档
│   └── CHANGELOG.md      # 更新日志
├── electron/             # Electron 主进程
│   └── main.js
├── lib/                  # 工具库
│   ├── api.ts           # API 客户端
│   ├── auth.ts          # 认证工具
│   ├── prisma.ts        # 数据库客户端
│   ├── types.ts         # 类型定义
│   └── utils.ts         # 通用工具函数
├── prisma/              # Prisma 数据库
│   └── schema.prisma    # 数据库模型定义
├── package.json
├── tailwind.config.js
└── tsconfig.json
```

## 📖 使用指南

### 1. 用户注册与登录

首次使用需要注册账号，支持多用户数据隔离。

### 2. 日志管理

- **创建日志**: 点击侧边栏 "新建日志" 按钮
- **编辑日志**: 在侧边栏选择日志，支持 Markdown 格式
- **删除日志**: 悬停日志项，点击删除按钮（软删除）

### 3. 生成 AI 周报

1. 在侧边栏勾选要汇总的日志
2. 点击 "生成周报" 按钮
3. 可选择使用自定义模板
4. AI 将自动分析并生成专业周报
5. 可保存周报或直接复制使用

### 4. 周报模板

- 支持创建自定义周报模板
- 设置默认模板，每次生成自动应用
- 模板使用 Markdown 格式

## 🗄️ 数据库说明

项目使用 SQLite 数据库，支持以下数据模型：

| 模型 | 说明 |
|------|------|
| `User` | 用户信息 |
| `LogEntry` | 工作日志条目 |
| `Summary` | 生成的周报 |
| `SummaryTemplate` | 周报模板 |

详细设计规范请参考 `config/数据库表规范.md`

### 数据库命令

```bash
# 同步数据库结构
npm run db:push

# 打开数据库管理界面
npm run db:studio
```

## 🔧 常用命令

| 命令 | 说明 |
|------|------|
| `npm run dev` | 启动开发服务器 |
| `npm run build` | 构建生产版本 |
| `npm run start` | 启动生产服务器 |
| `npm run db:push` | 同步数据库结构 |
| `npm run db:studio` | 打开 Prisma Studio |
| `npm run desktop:dev` | 开发模式（含 Electron） |
| `npm run desktop:build` | 构建桌面安装包 |

## ❓ 常见问题

### Q: 如何获取 DeepSeek API Key？

访问 [DeepSeek 开放平台](https://platform.deepseek.com/)，注册账号后在控制台创建 API Key。

### Q: 数据存储在哪里？

数据存储在项目根目录的 `prisma/dev.db` SQLite 数据库文件中。

### Q: 如何备份数据？

直接复制 `prisma/dev.db` 文件即可完成备份。

### Q: 桌面应用打包失败？

确保已安装所有依赖，并且 `.next` 构建目录存在。尝试先执行 `npm run build` 再打包。

## 📝 更新日志

详见 [CHANGELOG.md](./doc/CHANGELOG.md)

## 📄 许可证

MIT License

## 🤝 贡献

欢迎提交 Issue 和 Pull Request！

---

<p align="center">
  Made with ❤️ by <a href="https://github.com/jaikensai888">jaikensai888</a>
</p>
