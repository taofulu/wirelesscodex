# WirelessCodex 工程目录结构说明

## 1. 目录树

```
wirelesscodex/
├── api/                      # API 接口层
│   └── ws.py                 # WebSocket 管理器
├── core/                     # 核心业务逻辑
│   ├── ast/                  # AST 抽象语法树
│   │   ├── builder.py        # AST 构建器
│   │   ├── models.py         # 数据模型
│   │   ├── schema.py         # Schema 定义
│   │   └── validator.py      # AST 校验器
│   ├── dag/                  # DAG 执行引擎
│   │   ├── __init__.py
│   │   ├── context.py        # 执行上下文
│   │   ├── engine.py         # DAG 引擎核心
│   │   ├── executor.py       # 执行器
│   │   └── state.py          # 状态管理
│   ├── execution/            # 执行代理
│   │   └── execution_agent.py # task.json 执行代理
│   ├── parser/               # 解析器
│   │   ├── dsl_parser.py     # DSL 解析器
│   │   └── intent_to_dsl.py  # 意图转 DSL
│   ├── planner/              # 规划器
│   │   └── planner.py        # AST → DAG 转换
│   ├── runtime/              # 运行时
│   │   └── context.py        # 运行时上下文
│   └── validator/            # 验证器
│       └── validator.py      # 通用验证
├── ddt/                      # DDT 数据集
│   └── default_dataset.json  # 默认测试场景
├── dag-ui/                   # 前端可视化界面
│   ├── public/               # 静态资源
│   │   ├── favicon.svg
│   │   └── icons.svg
│   ├── src/                  # 源码
│   │   ├── assets/           # 资源文件
│   │   │   ├── hero.png
│   │   │   ├── react.svg
│   │   │   └── vite.svg
│   │   ├── components/       # React 组件
│   │   │   ├── CustomNode.jsx    # 自定义节点
│   │   │   ├── NodeConfigPanel.jsx # 配置面板
│   │   │   └── NodePalette.jsx   # 节点面板
│   │   ├── hooks/            # React Hooks
│   │   │   ├── useASTEditor.js    # AST 编辑器
│   │   │   └── useDAGSocket.js    # WebSocket
│   │   ├── utils/            # 工具函数
│   │   │   └── astExport.js  # AST 导出
│   │   ├── App.css           # 应用样式
│   │   ├── App.jsx           # 主应用
│   │   ├── Sandbox.jsx       # 沙盒模式
│   │   ├── nodeTypes.js      # 节点类型定义
│   │   ├── index.css         # 全局样式
│   │   └── main.jsx          # 入口文件
│   ├── .gitignore
│   ├── README.md             # 前端说明
│   ├── eslint.config.js      # ESLint 配置
│   ├── index.html            # HTML 模板
│   ├── package-lock.json     # 依赖锁定
│   ├── package.json          # 前端依赖
│   └── vite.config.js        # Vite 配置
├── docs/                     # 文档
│   └── execution.md          # 执行说明
├── scripts/                  # 脚本
│   └── init.ps1              # 初始化脚本
├── tests/                    # 测试
│   ├── test_ast.py           # AST 测试
│   └── ddt_runner.py         # DDT 测试运行器
├── ui/                       # 旧 UI（备用）
│   ├── src/
│   │   └── DAGPanel.jsx      # DAG 面板
│   └── package.json
├── wirelesscodex/            # 项目根目录
│   └── scripts/
│       └── init.ps1          # 初始化脚本
├── .gitignore                # Git 忽略文件
├── detailed plan.md          # 详细计划
├── detailed_design.md        # 详细设计
├── datadefine.md             # 数据定义
├── proposal.md               # 项目提案
├── spec.md                   # 规格说明
├── tasks.md                  # 任务列表
├── requirements.txt          # Python 依赖
└── server.py                 # 服务器入口
```

## 2. 目录说明

### 2.1 API 层 (`api/`)
- **ws.py**：WebSocket 管理器，负责处理实时通信，推送执行状态和日志，按 `run_id` 隔离连接

### 2.2 Core 核心层 (`core/`)

#### 2.2.1 AST 模块 (`core/ast/`)
- **builder.py**：AST 构建器，用于创建 AST 实例
- **models.py**：数据模型，定义 AST 相关的数据结构
- **schema.py**：Schema 定义，使用 Pydantic 验证 AST 结构
- **validator.py**：AST 校验器，验证 AST 的合法性

#### 2.2.2 DAG 模块 (`core/dag/`)
- **context.py**：执行上下文，管理节点状态和事件分发，支持按 `run_id` 推送事件
- **engine.py**：DAG 引擎核心，实现拓扑排序和执行逻辑，使用 `asyncio.Queue + worker` 并发调度
- **executor.py**：执行器，负责执行具体的节点任务
- **state.py**：状态管理，维护 DAG 执行状态

#### 2.2.3 解析器 (`core/parser/`)
- **dsl_parser.py**：DSL 解析器，将 DSL 转换为 AST
- **intent_to_dsl.py**：意图转 DSL，将自然语言意图转换为 DSL

#### 2.2.4 执行代理 (`core/execution/`)
- **execution_agent.py**：task.json 执行代理，支持执行严格的 task.json 结构

#### 2.2.5 规划器 (`core/planner/`)
- **planner.py**：AST → DAG 转换，将 AST 结构转换为 DAG 执行结构

#### 2.2.6 运行时 (`core/runtime/`)
- **context.py**：运行时上下文，提供运行时环境

#### 2.2.7 验证器 (`core/validator/`)
- **validator.py**：通用验证器，提供验证工具

### 2.3 前端层 (`dag-ui/`)

#### 2.3.1 组件 (`dag-ui/src/components/`)
- **CustomNode.jsx**：自定义节点组件，显示节点类型、命令和状态
- **NodeConfigPanel.jsx**：节点配置面板，用于配置节点参数，支持节点复制
- **NodePalette.jsx**：节点选择面板，用于拖拽创建新节点

#### 2.3.2 Hooks (`dag-ui/src/hooks/`)
- **useASTEditor.js**：AST 编辑器 Hook，管理节点和边的状态
- **useDAGSocket.js**：WebSocket Hook，管理 WebSocket 连接和事件处理，支持按 `run_id` 连接

#### 2.3.3 主应用 (`dag-ui/src/`)
- **App.jsx**：主应用组件，管理整体状态和布局，支持 Sandbox 模式切换
- **Sandbox.jsx**：沙盒模式组件，支持本地执行、导出 task.json、导入/保存场景
- **nodeTypes.js**：React Flow 节点类型稳定定义（消除警告）
- **main.jsx**：入口文件，渲染应用

### 2.4 测试层 (`tests/`)
- **test_ast.py**：AST 相关测试
- **ddt_runner.py**：DDT 测试运行器，支持批量遍历执行

### 2.5 文档层 (`docs/`)
- **execution.md**：执行说明文档

### 2.6 DDT 数据集 (`ddt/`)
- **default_dataset.json**：默认测试场景，task.json 严格结构

### 2.7 根目录文件
- **server.py**：服务器入口，启动 FastAPI 服务，提供所有 API 接口
- **requirements.txt**：Python 依赖文件
- **detailed_design.md**：详细设计文档
- **detailed plan.md**：详细计划文档
- **datadefine.md**：数据定义文档
- **proposal.md**：项目提案
- **spec.md**：规格说明
- **tasks.md**：任务列表

## 3. 模块关系

```
┌─────────────┐     ┌─────────────┐     ┌─────────────┐
│  前端层      │     │  API 层     │     │  Core 层    │
│  (React)    │◄────┤  (FastAPI)  │◄────┤  (Python)   │
│  - App.jsx  │     │  - server.py│     │  - engine.py │
│  - Sandbox  │     │  - ws.py    │     │  - context.py│
└─────────────┘     └─────────────┘     └─────────────┘
         ▲                  ▲                  ▲
         │                  │                  │
         └──────────────────┼──────────────────┘
                            │
                    ┌─────────────┐
                    │  测试层      │
                    │  (pytest)   │
                    └─────────────┘
```

## 4. 核心流程

### 4.1 意图解析流程
1. 用户在前端输入自然语言意图
2. 前端发送 POST 请求到 `/intent/parse`
3. API 层调用 `core/parser/intent_to_dsl.py` 将意图转换为 DSL
4. API 层调用 `core/parser/dsl_parser.py` 将 DSL 转换为 AST
5. 前端接收 AST 并生成 DAG 节点

### 4.2 DAG 执行流程
1. 用户点击 "Run DAG" 按钮
2. 前端导出 AST 并发送到 `/run`
3. API 层调用 `core/planner/planner.py` 将 AST 转换为 DAG
4. API 层调用 `core/dag/engine.py` 执行 DAG
5. 执行过程中，`core/dag/context.py` 通过 WebSocket 按 `run_id` 推送状态
6. 前端通过 `useDAGSocket.js` 接收状态并更新 UI
7. 监听 `run_status` 事件标记执行完成

### 4.3 沙盒模式流程
1. 用户切换到 Sandbox 模式
2. 拖拽建图、配置参数
3. 本地运行（不调用后端）
4. 导出 `task.json`
5. 导入/保存默认场景

## 5. 技术栈

| 类别 | 技术 | 版本 | 用途 |
|------|------|------|------|
| 后端 | Python | 3.x | 核心逻辑 |
| 后端 | FastAPI | latest | Web 框架 |
| 后端 | asyncio | 内置 | 异步执行 |
| 前端 | React | 18 | UI 框架 |
| 前端 | React Flow | latest | 流程图可视化 |
| 前端 | Ant Design | latest | UI 组件库 |
| 前端 | Vite | latest | 构建工具 |
| 前端 | JavaScript | ES6+ | 前端开发 |

## 6. 开发指南

### 6.1 后端开发
1. 安装依赖：`pip install -r requirements.txt`
2. 启动服务：`python server.py` 或 `python -m uvicorn server:app --reload`
3. 运行测试：`pytest tests/`

### 6.2 前端开发
1. 安装依赖：`cd dag-ui && npm install`
2. 启动开发服务器：`cd dag-ui && npm run dev`
3. 构建生产版本：`cd dag-ui && npm run build`

## 7. 关键特性

### 7.1 run_id 隔离
每次执行都是独立 run，WebSocket 按 `run_id` 隔离，避免串流。

### 7.2 DAG 并发调度
`DAGRun` 通过 `asyncio.Queue + worker` 并发执行，支持依赖推进与失败跳过。

### 7.3 状态一致性
后端统一状态（`SUCCESS` 等），前端统一映射为 `success`，避免动画丢失。

### 7.4 nodeTypes 稳定化
将 React Flow 节点类型定义抽离到 `nodeTypes.js` 并冻结，避免重新创建导致警告。

### 7.5 沙盒模式
支持本地执行、导出 task.json、导入/保存场景，提供独立的测试环境。

## 8. 总结

WirelessCodex 采用模块化设计，清晰分离了前端、API 层和核心逻辑层。核心功能包括：
- 自然语言意图解析
- AST 格式的测试流程表达
- DAG 执行引擎
- 实时状态推送
- 可视化编辑界面
- 沙盒模式（本地执行 + task.json 导出）

这种架构设计使得系统易于扩展和维护，同时提供了良好的用户体验。
