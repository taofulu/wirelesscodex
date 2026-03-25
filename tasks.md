# WirelessCodex 任务列表（已完成版）

## Phase 1（已完成 ✅）

- ✅ AST 模型
- ✅ DAG Engine
- ✅ Executor
- ✅ Planner
- ✅ FastAPI
- ✅ React DAG UI

## 🚀 Phase 2（当前重点 ✅）

### Task 1：WebSocket 状态流（最高优先级）✅
- 🔹 **文件**：`api/ws.py`
- 🔹 **功能**：
  - 推送 node_status
  - 推送 logs
  - 按 run_id 隔离连接
- 🔹 **输出**：
  ```json
  {
    "type": "status",
    "node": "n1",
    "status": "RUNNING" | "SUCCESS" | "FAILED" | "SKIPPED",
    "run_id": "..."
  }
  ```

### Task 2：ExecutionContext → 可订阅 ✅
- 🔹 **修改**：`core/dag/context.py`
- 🔹 **能力**：
  - log hook
  - 状态变更 hook
  - 事件按 run_id 推送

### Task 3：前端状态更新 ✅
- 🔹 **文件**：`App.jsx`
- 🔹 **功能**：
  - WebSocket 连接（按 run_id）
  - 节点颜色变化
  - 监听 run_status 事件标记完成

### Task 4：节点状态 UI ✅
- 🔹 **颜色规范**：
  - 灰：pending
  - 黄：running
  - 绿：success
  - 红：failed
  - 灰：skipped

### Task 5：Execution Plan API ✅
- 🔹 **新接口**：`GET /ddt/cases`
- 🔹 **输出**：Step1 → Step2 → Step3（场景列表）

## 🚀 Phase 3（执行增强 ✅）

### Task 6：沙盒模式 ✅
- 🔹 **文件**：`Sandbox.jsx`
- 🔹 **功能**：
  - 独立模式切换
  - 本地执行（不调用后端）
  - 导出 task.json
  - 导入/保存默认场景
  - 节点复制功能
  - 命令修改同步显示名称

### Task 7：React Flow 稳定性 ✅
- 🔹 **文件**：`nodeTypes.js`
- 🔹 **功能**：
  - nodeTypes 抽离到外部文件
  - Object.freeze 冻结对象
  - 消除 nodeTypes 重新创建警告
  - 移除 useMemo 误用

### Task 8：字段统一 ✅
- 🔹 **统一**：
  - 废弃 operation/action
  - 统一使用 command 字段
  - 后端/前端/文档全部同步

## 🚀 Phase 4（Apply 完整化）

### Task 9：Apply 校验流程（待完成）
- 🔹 **接口**：`/validate`
- 🔹 **功能**：
  - AST 完整校验
  - 风险分析
  - 执行前确认

### Task 10：Risk Engine（基础版）（待完成）
- 🔹 **功能**：
  - 仪器风险检测
  - 参数异常检测
  - 执行风险提示

### Task 11：确认弹窗（前端）（待完成）
- 🔹 **UI**：
  - 风险确认弹窗
  - 执行确认弹窗
  - 取消/确认操作

## 🚀 Phase 5（体验增强）

### Task 12：日志面板 UI ✅
- 🔹 **功能**：
  - 日志列表展示
  - 日志筛选
  - 日志导出

### Task 13：执行时间统计 ✅
- 🔹 **功能**：
  - 节点执行时间
  - 总执行时间
  - 时间统计展示

### Task 14：KPI 输出（待完成）
- 🔹 **功能**：
  - 成功率统计
  - 失败率分析
  - 执行报告生成

## ✅ 优先级（已完成总结）

### 🔥 已完成
- WebSocket 状态流 ✅
- UI 状态联动 ✅
- 沙盒模式 ✅
- React Flow 稳定性 ✅
- 字段统一 ✅

### 🔥 待完成
- Retry 机制
- Fail Strategy
- Apply 完整流程
- Risk Engine
- 执行持久化

## ✅ 一句话总结

当前已完成核心功能：
**意图解析 → DAG 生成 → 执行 → 状态推送 → UI 展示 → 沙盒模式**

后续重点转向：
**可观测性（Observability）+ 控制力（Control）+ 持久化（Persistence）**
