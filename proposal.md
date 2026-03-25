# WirelessCodex 项目提案（v3 更新版）

## 1. 项目名称

RadioTwin Wireless Codex V3.0

## 2. 背景与问题

当前无线测试存在核心问题：

测试设计高度依赖人工经验，MML / GUI / 仪器操作割裂，测试步骤复杂且顺序强依赖（易出错），无法规模化复用测试资产，缺乏自动验证闭环。

## 3. 目标

构建一个：

✅ 基于 AST + DAG 的无线测试智能体系统

实现：

自然语言 → 测试生成 → 执行 → 验证 → 学习闭环，多模态统一（MML / GUI / Instrument），测试流程图化（DAG），支持复杂依赖，模板驱动 + Expert 进化

## 4. 核心创新

✅ 1. Unified AST
统一表达：MML、GUI、Instrument

✅ 2. DAG 执行模型
解决：多步骤依赖、顺序问题、并行执行

✅ 3. 渐进式生成（Progressive）
避免一次性生成错误：骨架 → 约束 → 填充 → 校验 → 修复

✅ 4. Template + Expert 双驱动
结构来自 Template，经验来自 Expert KB

## 5. 成功标准（Success Criteria）

✅ 能自动生成 pytest + MML + GUI + Instrument（已实现）
✅ 能构建 DAG 并正确执行（已实现）
✅ 测试成功率 > 90%（待验证）
✅ 能自动修复 MML 错误（待实现）
✅ Expert KB 可持续增长（待实现）

## 6. 当前版本总结

目前系统已形成一条清晰主线：
**意图解析 → DAG 生成 → 执行 → 状态推送 → UI 展示 → 沙盒模式

并完成 DDT 数据集驱动的端到端场景覆盖。

## 7. 已实现能力

### 7.1 后端能力
- ✅ AST 建模
- ✅ DAG 构建 + 拓扑执行
- ✅ 并行执行（asyncio.Queue + worker）
- ✅ Execution Context（日志 + 状态 + 事件）
- ✅ API 层（FastAPI + WebSocket）
- ✅ 执行链路打通
- ✅ WebSocket 状态流（按 run_id 隔离）
- ✅ run_status 事件标记完成

### 7.2 前端能力
- ✅ UI（React Flow + Ant Design）
- ✅ 沙盒模式（本地执行 + task.json 导出）
- ✅ 导入/保存场景
- ✅ 节点复制
- ✅ React Flow 稳定性（nodeTypes 稳定化）
- ✅ 字段统一（command 字段）

### 7.3 数据模型
- ✅ task.json 严格格式
- ✅ AST Schema 定义
- ✅ WebSocket 事件协议

## 8. 下一步方向

### 8.1 高优先级（P0）
1. 前端稳定性
   - 加入 ErrorBoundary
   - WS 断开时 UI 状态回收/提示

2. 执行超时与重试
   - 每个节点 timeout
   - 失败重试策略（可选）

### 8.2 中优先级（P1）
1. 执行持久化
   - run / log 入库
   - UI 回放历史 run

2. 插件化执行器
   - node.type → handler registry

### 8.3 低优先级（P2）
1. 可视化调试
   - 节点输入输出查看
   - 执行路径重放

## 9. 结论

WirelessCodex 已形成一条清晰主线：
**意图解析 → DAG 生成 → 执行 → 状态推送 → UI 展示 → 沙盒模式

并完成 DDT 数据集驱动的端到端场景覆盖。

后续重点转向：
**可观测性（Observability）+ 控制力（Control）+ 持久化（Persistence）
