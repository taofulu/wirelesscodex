# Execution Flow

AST → DAG → Execution

1. 构建 AST
2. 转换为 DAG
3. DAG Engine 执行
4. 输出日志

支持：

- 顺序执行
- 依赖控制
- 可扩展并行
建议补充
执行流程图（level执行）
状态变化
日志结构
并行说明
✅ 结论：

👉 建议更新（但不阻塞开发）