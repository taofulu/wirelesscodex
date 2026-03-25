# WirelessCodex 规格说明（当前实现版）

## 1. 目标（Implementation-Aligned）

本版本对齐当前已实现能力（v3）：

✅ AST 建模
✅ DAG 构建 + 拓扑执行
✅ 并行执行（asyncio.Queue + worker）
✅ Execution Context（日志 + 状态 + 事件）
✅ API 层（FastAPI + WebSocket）
✅ UI（React Flow + Ant Design）
✅ 执行链路打通
✅ WebSocket 状态流（按 run_id 隔离）
✅ 前端沙盒模式（本地执行 + task.json 导出）

## 2. 当前系统真实架构

```
Frontend（React）
   ↓ REST
FastAPI（server.py）
   ↓
AST Validator
   ↓
DAGRun（engine.py）
   ↓
DAG Engine（async 并发调度）
   ↓
Executor（Node 执行）
   ↓
ExecutionContext（状态 + 日志 + run_id）
   ↓
WebSocket /ws/{run_id}
```

## 3. AST（已落地）

### 数据结构

```json
Node {
  "id": "n1",
  "type": "MML" | "INSTRUMENT" | "ASSERT" | "DELAY",
  "command": "ADD_UE",
  "params": {"ue_id": "1"},
  "depends_on": []
}
```

### Schema 定义

```python
class NodeType(str, Enum):
    MML        = "MML"
    INSTRUMENT = "INSTRUMENT"
    ASSERT     = "ASSERT"
    DELAY      = "DELAY"

class ASTNode(BaseModel):
    id:         str
    type:       NodeType
    command:    str
    params:     dict[str, Any] = {}
    depends_on: list[str]      = []
```

## 4. DAG Engine（v3 实现）

### 能力

- 拓扑排序 ✅
- 并行执行 ✅（asyncio.Queue + worker）
- 分层调度 ✅（按依赖批次）
- 非阻塞执行 ✅
- 失败传播 → SKIPPED ✅
- run_status 事件标记完成 ✅

### 执行模型

```
Ready Nodes → 并行执行
     ↓
更新 in_degree
     ↓
下一批 Ready Nodes
```

## 5. Execution Context（关键）

### 状态模型

```
PENDING → RUNNING → SUCCESS / FAILED / SKIPPED
```

### 日志结构

```json
{
  "time": "10:21:01",
  "node": "n1",
  "msg": "START MML:ADD_UE"
}
```

### 事件协议

```json
{
  "type": "status",
  "node": "n1",
  "status": "RUNNING" | "SUCCESS" | "FAILED" | "SKIPPED",
  "run_id": "..."
}
```

```json
{
  "type": "run_status",
  "status": "SUCCESS" | "FAILED",
  "run_id": "..."
}
```

## 6. Executor（执行层）

### 支持类型

- MML
- INSTRUMENT
- ASSERT
- DELAY

### 行为

- 更新状态
- 写日志
- 抛异常 → 标记 FAILED

## 7. API 层（已实现）

### 接口

- **GET /**：健康检查
- **POST /intent/parse**：自然语言 → DSL → AST
- **POST /run**：执行 AST，返回 run_id
- **POST /run_task**：执行 task.json（严格结构）
- **GET /ddt/cases**：获取默认场景
- **WS /ws/{run_id}**：按 run_id 推送状态与日志

## 8. UI（当前能力）

### DAG 面板

- 节点展示 ✅
- 边关系 ✅
- Run 按钮触发执行 ✅
- WebSocket 状态更新 ✅

### 沙盒模式

- 独立模式切换 ✅
- 本地执行（不调用后端）✅
- 导出 task.json ✅
- 导入/保存场景 ✅
- 节点复制 ✅
- 命令修改同步显示 ✅

### 节点状态 UI

颜色规范：

- 灰：pending
- 黄：running
- 绿：success
- 红：failed
- 灰：skipped

## 9. 关键设计点

### 9.1 run_id 隔离

每次执行都是独立 run，WebSocket 按 run_id 隔离，避免串流。

### 9.2 状态一致性

后端统一状态（SUCCESS 等），前端统一映射为 success，避免动画丢失。

### 9.3 nodeTypes 稳定化

将 React Flow 节点类型定义抽离到 nodeTypes.js 并冻结，避免重新创建导致警告。

### 9.4 命令字段统一

统一使用 command 字段（废弃 operation/action）。

## 10. task.json 格式

```json
{
  "case_metadata": {
    "name": "Sandbox_Task",
    "version": "1.0",
    "author": "Sandbox",
    "description": "Exported from Sandbox"
  },
  "objects": [
    {"object_id": "ran", "object_type": "RAN_CONTROLLER"},
    {"object_id": "timer", "object_type": "TIMER"}
  ],
  "activities": {
    "setup": [],
    "process": [
      {
        "step_id": "n1",
        "object_id": "ran",
        "componentName": "add_ue",
        "data": {"ue_id": "1"},
        "depends_on": []
      }
    ],
    "teardown": []
  }
}
```

## 11. 当前版本结论

目前系统已具备：

✅ "执行内核 + 可视化入口 + 沙盒模式"

下一阶段目标：

🔥 "可观测 + 可控制 + 可恢复 的执行系统"
