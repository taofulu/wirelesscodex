# WirelessCodex

## 项目介绍

WirelessCodex 是一个基于 AST + DAG 的无线网络测试自动化框架，提供：
- 可视化 DAG 编辑器
- 意图解析 → AST
- DAG 异步并发执行
- WebSocket 实时状态推送（按 run_id 隔离）
- DDT 数据集驱动测试
- 沙盒模式（本地执行 + task.json 导出）

## 技术栈

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 后端 | Python | 3.x | 核心逻辑 |
| 后端 | FastAPI | latest | Web 框架 |
| 后端 | asyncio | 内置 | 异步执行 |
| 前端 | React | 19 | UI 框架 |
| 前端 | React Flow | 11 | 流程图可视化 |
| 前端 | Ant Design | 6 | UI 组件库 |
| 前端 | Vite | 5 | 构建工具 |

## 安装指南

### 1. 后端依赖安装

```bash
# 进入项目根目录
cd wirelesscodex

# 安装 Python 依赖
pip install -r requirements.txt
```

### 2. 前端依赖安装

```bash
# 进入前端目录
cd wirelesscodex/dag-ui

# 安装 npm 依赖
npm install
```

## 使用指南

### 1. 启动后端服务器

```bash
# 进入项目根目录
cd wirelesscodex

# 启动 FastAPI 服务器
python -m uvicorn server:app --reload

# 或使用 python server.py
# python server.py
```

服务器默认运行在 `http://127.0.0.1:8000`

### 2. 启动前端开发服务器

```bash
# 进入前端目录
cd wirelesscodex/dag-ui

# 启动 Vite 开发服务器
npm run dev
```

前端默认运行在 `http://127.0.0.1:5173`

### 3. 构建前端生产版本

```bash
# 进入前端目录
cd wirelesscodex/dag-ui

# 构建生产版本
npm run build
```

构建产物将生成在 `dist` 目录。

## 项目结构

```
wirelesscodex/
├── api/                      # API 接口层
│   └── ws.py                 # WebSocket 管理器
├── core/                     # 核心业务逻辑
│   ├── ast/                  # AST 抽象语法树
│   │   ├── schema.py         # Schema 定义
│   │   └── validator.py      # AST 校验器
│   ├── dag/                  # DAG 执行引擎
│   │   ├── context.py        # 执行上下文
│   │   ├── engine.py         # DAG 引擎核心
│   │   └── state.py          # 状态管理
│   ├── execution/            # 执行代理
│   │   └── execution_agent.py # task.json 执行代理
│   └── parser/               # 解析器
│       ├── dsl_parser.py     # DSL 解析器
│       └── intent_to_dsl.py  # 意图转 DSL
├── ddt/                      # DDT 数据集
│   └── default_dataset.json  # 默认测试场景
├── dag-ui/                   # 前端可视化界面
│   ├── public/               # 静态资源
│   ├── src/                  # 源码
│   │   ├── components/       # React 组件
│   │   ├── hooks/            # React Hooks
│   │   ├── App.jsx           # 主应用
│   │   ├── Sandbox.jsx       # 沙盒模式
│   │   └── nodeTypes.js      # 节点类型定义
│   ├── package.json          # 前端依赖
│   └── vite.config.js        # Vite 配置
├── server.py                 # 服务器入口
├── requirements.txt          # Python 依赖
└── README.md                 # 项目说明
```

## 核心功能

### 1. 意图解析
- 输入自然语言意图
- 转换为 DSL
- 生成 AST
- 渲染为 DAG 图形

### 2. DAG 执行
- 支持并发执行
- 依赖管理
- 失败传播（SKIPPED）
- 实时状态推送

### 3. 沙盒模式
- 本地执行（不调用后端）
- 导出 task.json
- 导入/保存场景
- 节点复制功能

### 4. WebSocket 状态流
- 按 run_id 隔离
- 实时状态更新
- 日志推送
- run_status 事件标记完成

## API 接口

### REST API
- **GET /**：健康检查
- **POST /intent/parse**：自然语言 → DSL → AST
- **POST /run**：执行 AST（返回 run_id）
- **POST /run_task**：执行 task.json（严格结构）
- **GET /ddt/cases**：获取默认场景

### WebSocket
- **WS /ws/{run_id}**：按 run_id 推送状态与日志

## 开发流程

### 后端开发
1. 安装依赖：`pip install -r requirements.txt`
2. 启动服务：`python -m uvicorn server:app --reload`
3. 运行测试：`pytest tests/`

### 前端开发
1. 安装依赖：`cd dag-ui && npm install`
2. 启动开发服务器：`cd dag-ui && npm run dev`
3. 构建生产版本：`cd dag-ui && npm run build`
4. 代码检查：`cd dag-ui && npm run lint`

## 注意事项

1. 确保 Python 版本 ≥ 3.7
2. 确保 Node.js 版本 ≥ 16
3. 后端服务器默认端口：8000
4. 前端开发服务器默认端口：5173
5. WebSocket 连接地址：`ws://127.0.0.1:8000/ws/{run_id}`

## 相关文档

- **detailed_design.md**：详细设计文档
- **detailed plan.md**：详细计划文档
- **project_structure.md**：项目结构文档
- **spec.md**：规格说明文档
- **tasks.md**：任务列表文档
- **proposal.md**：项目提案

## 许可证

MIT License
