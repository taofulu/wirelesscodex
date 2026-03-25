# WirelessCodex 工程详细设计文档

## 1. 项目概述

**WirelessCodex** 是一个基于 **AST + DAG** 的无线网络测试自动化框架，提供：
- 可视化 DAG 编辑器
- 意图解析 → AST
- DAG 异步并发执行
- WebSocket 实时状态推送（按 run_id 隔离）
- DDT 数据集驱动测试
- 沙盒模式（本地执行 + task.json 导出）

## 2. 技术架构

### 2.1 技术栈
- **后端**：FastAPI、Python 3.x、asyncio、WebSocket
- **前端**：React 18、React Flow、Ant Design、Vite

### 2.2 系统架构
```
┌─────────────────┐     ┌─────────────────────┐     ┌──────────────────┐
│   Web UI        │     │   API Server        │     │   DAG Engine     │
│  (React Flow)   │◄───►│   (FastAPI)         │◄───►│   DAGRun (async) │
│                 │     │                     │     │   + Context      │
│  - Node Editor  │     │  - /run (AST)        │     │   + Execution    │
│  - Intent Input │     │  - /run_task (task)  │     │                  │
│  - Scenario UI  │     │  - /ddt/cases        │     │                  │
│  - Logs + WS    │     │  - /intent/parse     │     │                  │
│  - Sandbox Mode │     │                     │     │                  │
└─────────────────┘     └─────────────────────┘     └──────────────────┘
                              │
                              ▼
                        ┌──────────────┐
                        │ AST Validator │
                        └──────────────┘
```

## 3. 核心模块

### 3.1 后端核心
- **AST 模块**：`core/ast/schema.py` + `validator.py`
- **DAG 执行**：`core/dag/engine.py`（`DAGRun` + worker queue）
- **Context 事件**：`core/dag/context.py`（状态/日志 -> WS）
- **执行代理**：`core/execution/execution_agent.py`
  - 支持 `task.json`（`objects` + `activities`）
  - 兼容 `object_id/object_type`
- **DDT 数据集**：`ddt/default_dataset.json`

### 3.2 前端核心
- **App.jsx**：主入口，Run、Intent、DDT 场景加载，Sandbox 模式切换
- **Sandbox.jsx**：前端沙盒（本地执行/导出 task.json/导入保存场景）
- **CustomNode.jsx**：节点渲染 + 状态显示
- **NodeConfigPanel.jsx**：命令/参数配置、节点复制
- **NodePalette.jsx**：拖拽节点类型
- **useASTEditor**：节点/边 + 状态更新
- **useDAGSocket**：WS 连接与重连
- **nodeTypes.js**：React Flow 节点类型稳定定义（消除警告）

## 4. API 接口设计

### 4.1 REST API
- **GET /**：健康检查
- **POST /intent/parse**：自然语言 → DSL → AST
- **POST /run**：执行 AST（返回 run_id）
- **POST /run_task**：执行 task.json（严格结构）
- **GET /ddt/cases**：获取默认场景（供 UI 下拉加载）

### 4.2 WebSocket
- **WS /ws/{run_id}**：按 run_id 推送状态与日志

### 4.3 状态事件协议
```json
{
  "type": "status",
  "node": "n1",
  "status": "RUNNING" | "SUCCESS" | "FAILED" | "SKIPPED",
  "run_id": "..."
}
```
前端映射为 `running / success / failed / skipped`。

```json
{
  "type": "run_status",
  "status": "SUCCESS" | "FAILED",
  "run_id": "..."
}
```

## 5. 数据模型

### 5.1 AST Schema（前端与 /run）
```python
class NodeType(str, Enum):
    MML        = "MML"
    INSTRUMENT = "INSTRUMENT"
    ASSERT     = "ASSERT"
    DELAY      = "DELAY"

class ASTNode(BaseModel):
    id: str
    type: NodeType
    command: str
    params: dict[str, Any] = {}
    depends_on: list[str] = []

class AST(BaseModel):
    nodes: list[ASTNode]
```

### 5.2 task.json（执行代理）
```json
{
  "case_metadata": { "name": "...", "version": "1.0", "author": "..." },
  "objects": [
    { "object_id": "obj_1", "object_type": "todo" }
  ],
  "activities": {
    "setup": [],
    "process": [
      {
        "step_id": "post_request_1",
        "object_id": "obj_1",
        "componentName": "post_request",
        "data": { "url": "/api/users" }
      }
    ],
    "teardown": []
  }
}
```

## 6. 工作流程

### 6.1 意图解析
1. UI 输入自然语言
2. `/intent/parse` 返回 AST
3. 前端渲染 DAG

### 6.2 运行 AST
1. UI 点击 Run
2. `/run` 返回 run_id
3. WS `ws/{run_id}` 接收状态
4. 监听 `run_status` 事件标记完成

### 6.3 运行 task.json
1. 直接调用 `/run_task`
2. ExecutionAgent 执行 `objects + activities`

### 6.4 DDT 场景加载
1. UI 调用 `/ddt/cases`
2. 下拉选择 → 生成 DAG 节点

### 6.5 沙盒模式
1. 切换到 Sandbox 模式
2. 拖拽建图、配置参数
3. 本地运行（不调用后端）
4. 导出 `task.json`
5. 导入/保存默认场景

## 7. 关键设计点

### 7.1 run_id 隔离
每次执行都是独立 run，WebSocket 按 run_id 隔离，避免串流。

### 7.2 DAG 并发调度
`DAGRun` 通过 `asyncio.Queue + worker` 并发执行，支持依赖推进与失败跳过。

### 7.3 状态一致性
后端统一状态（`SUCCESS` 等），前端统一映射为 `success`，避免动画丢失。

### 7.4 命令与参数对齐
NodeConfigPanel 内置常用命令，并允许保留未知命令以兼容扩展。

### 7.5 nodeTypes 稳定化
将 React Flow 节点类型定义抽离到 `nodeTypes.js` 并冻结，避免重新创建导致警告。

## 8. 目录结构
```
wirelesscodex/
├── api/
│   └── ws.py
├── core/
│   ├── ast/
│   │   ├── builder.py
│   │   ├── schema.py
│   │   └── validator.py
│   ├── dag/
│   │   ├── engine.py
│   │   ├── context.py
│   │   └── state.py
│   ├── execution/
│   │   └── execution_agent.py
│   └── parser/
│       ├── intent_to_dsl.py
│       └── dsl_parser.py
├── ddt/
│   └── default_dataset.json
├── dag-ui/
│   └── src/
│       ├── components/
│       ├── hooks/
│       ├── Sandbox.jsx
│       ├── nodeTypes.js
│       └── App.jsx
├── server.py
└── tests/
    └── ddt_runner.py
```

## 9. 当前行为与约束
- 前端状态使用：`pending / running / success / failed / skipped`
- `DELAY` 节点显示 `DELAY (Xs)`，并在后端日志显示 `delay (Xs)`
- `task.json` 使用 `object_id/object_type`，系统自动兼容旧字段
- 沙盒仅本地运行，不触发后端执行
- 沙盒支持导出 `task.json`，导入/保存默认场景
- 节点配置面板支持复制节点
- 命令修改后自动同步显示名称

## 10. 沙盒说明
- 入口：主界面工具栏 `Sandbox` 按钮
- 功能：拖拽建图、配置参数、本地运行、导出 `task.json`
- 场景能力：导入默认场景、保存回默认场景 JSON（写回）
- 交互增强：节点复制、命令修改后自动同步显示名称
- 导出规则：
  - `DELAY` → `object_id: timer` + `componentName: delay`
  - 其它节点 → `object_id: ran` + `componentName: command.lower()`

## 11. 总结

WirelessCodex 已形成一条清晰主线：  
**意图解析 → DAG 生成 → 执行 → 状态推送 → UI 展示**，  
并完成 DDT 数据集驱动的端到端场景覆盖，以及前端沙盒模式的本地执行与 task.json 导出功能。
