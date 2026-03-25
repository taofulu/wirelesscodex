# WirelessCodex 实施计划（更新版）

本计划同步当前实际实现情况，并给出下一步清单。

## 1. 已完成（里程碑）

### 1.1 执行链路统一
- ✅ `/run` 使用 AST 校验 + `DAGRun`，返回 `run_id`
- ✅ `Context` 事件推送按 `run_id` 进行 WebSocket 隔离
- ✅ `run_status` 事件支持，标记 DAG 整体完成

### 1.2 DAG 并发执行
- ✅ `DAGRun` 使用 `asyncio.Queue + worker` 并发调度
- ✅ 失败传播 → `SKIPPED`

### 1.3 前端执行统一
- ✅ 前端仅通过后端执行（弃用本地 run）
- ✅ 运行状态统一为 `pending/running/success/failed/skipped`
- ✅ 监听 `run_status` 事件标记完成

### 1.4 DSL/AST 收敛
- ✅ 意图解析与 DSL 解析收敛至 `core/parser`
- ✅ 删除根目录兼容实现
- ✅ 统一使用 `command` 字段（废弃 `operation/action`）

### 1.5 DDT 数据集与场景
- ✅ `ddt/default_dataset.json`（task.json 严格结构）
- ✅ `/ddt/cases` 支持 UI 下拉加载
- ✅ `tests/ddt_runner.py` 支持批量遍历执行

### 1.6 task.json 直执行
- ✅ `POST /run_task` 支持严格 task.json 执行
- ✅ ExecutionAgent 兼容 `object_id/object_type`

### 1.7 前端沙盒
- ✅ 新增 `Sandbox` 独立模式
- ✅ 本地执行（不调用后端）
- ✅ 导出 `task.json`
- ✅ `nodeTypes.js` 稳定节点类型定义（消除 React Flow 警告）
- ✅ 沙盒支持导入默认场景
- ✅ 沙盒支持保存默认场景（写回 JSON）
- ✅ 节点复制功能（UI 配置面板）
- ✅ 命令修改同步显示名称

### 1.8 React Flow 稳定性
- ✅ `nodeTypes` 抽离到外部文件并冻结
- ✅ 消除 `nodeTypes` 重新创建警告
- ✅ 移除 `useMemo` 相关代码

## 2. 当前问题与已修复
- ✅ 前端 `label` JSX 导致 React removeChild 异常 → 改为纯字符串
- ✅ 状态映射 `SUCCESS/done` 不一致 → 统一为 `success`
- ✅ 菜单/命令与节点类型不一致 → 场景加载自动匹配 MML/INSTRUMENT/ASSERT/DELAY
- ✅ 参数不匹配导致 `add_ue` 报错 → 接口方法增加 `**kwargs`
- ✅ React Flow `nodeTypes` 警告 → 抽离到 `nodeTypes.js`
- ✅ `operation/action` 字段混乱 → 统一为 `command`
- ✅ WebSocket 无 `run_status` 事件 → 新增事件标记完成
- ✅ `useMemo` 误用导致问题 → 移除后直接使用外部常量

## 3. 下一步优先级（建议）

### P0（高优先）
1. **前端稳定性**
   - 加入 ErrorBoundary
   - WS 断开时 UI 状态回收/提示

2. **执行超时与重试**
   - 每个节点 `timeout`
   - 失败重试策略（可选）

### P1（中优先）
1. **执行持久化**
   - run / log 入库
   - UI 回放历史 run

2. **插件化执行器**
   - node.type → handler registry

### P2（低优先）
1. **可视化调试**
   - 节点输入输出查看
   - 执行路径重放

## 4. 验收标准
- DAG 可并发执行，无死锁
- WebSocket 不串流
- AST 与 task.json 两条路径都可稳定执行
- 前端状态/动画始终一致
- 沙盒模式本地执行稳定
- task.json 导出/导入正常工作

## 5. 当前版本结论
目前系统已完成核心闭环：**意图解析 → DAG 生成 → 执行 → 状态推送 → UI 展示**，
并完成 DDT 数据集驱动的端到端场景覆盖，以及前端沙盒模式的本地执行与 task.json 导出功能。
React Flow 警告已消除，字段统一为 `command`，WebSocket 支持 `run_status` 事件。

后续重点转向稳定性与持久化。
