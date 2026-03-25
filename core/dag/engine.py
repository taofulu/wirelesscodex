import asyncio
from typing import Dict, List
from uuid import uuid4

from core.dag.state import NodeStatus
from core.dag.context import DAGContext
from core.execution.execution_agent import ExecutionAgent
from core.ast.schema import NodeType
from core.dag.registry import get_handler, auto_discover



class DAGRun:
    def __init__(self, nodes: List, objects: List[dict] | None = None):
        auto_discover()
        self.id = str(uuid4())

        self.nodes = {n.id: n for n in nodes}
        self.context = DAGContext()

        # ✅ 绑定 run_id（给 WS 用）
        self.context.run_id = self.id

        # ✅ 复用单一执行代理
        self.agent = ExecutionAgent()
        self.objects = objects or [
            {"objects_id": "ran", "objects_type": "RAN_CONTROLLER"},
            {"objects_id": "timer", "objects_type": "TIMER"},
        ]
        self.agent.init_objects(self.objects)

        self.node_states: Dict[str, str] = {
            n.id: NodeStatus.PENDING for n in nodes
        }

        self.in_degree = self._compute_in_degree()
        self.downstream = self._build_downstream()

        self.status = "PENDING"

    # ─────────────────────────────
    # 构图
    # ─────────────────────────────
    def _compute_in_degree(self) -> Dict[str, int]:
        in_degree = {nid: 0 for nid in self.nodes}

        for node in self.nodes.values():
            for dep in node.depends_on:
                in_degree[node.id] += 1

        return in_degree

    def _build_downstream(self):
        downstream = {nid: [] for nid in self.nodes}

        for node in self.nodes.values():
            for dep in node.depends_on:
                downstream[dep].append(node.id)

        return downstream

    # ─────────────────────────────
    # 运行入口（并发）
    # ─────────────────────────────
    async def run(self, max_workers: int = 4):
        self.status = "RUNNING"

        queue = asyncio.Queue()

        # ✅ 初始节点入队
        for nid, deg in self.in_degree.items():
            if deg == 0:
                await queue.put(nid)

        workers = [
            asyncio.create_task(self._worker(queue))
            for _ in range(min(max_workers, len(self.nodes)))
        ]

        await queue.join()

        for w in workers:
            w.cancel()

        # ✅ 汇总状态
        if all(s == NodeStatus.SUCCESS for s in self.node_states.values()):
            self.status = "SUCCESS"
        else:
            self.status = "FAILED"

        # ✅ 推送 run 级事件（前端用）
        self.context._emit({
            "type": "run_status",
            "run_id": self.id,
            "status": self.status
        })

    # ─────────────────────────────
    # worker
    # ─────────────────────────────
    async def _worker(self, queue: asyncio.Queue):
        while True:
            node_id = await queue.get()

            try:
                await self._execute_node(node_id)

                # ✅ 推进下游
                for nxt in self.downstream[node_id]:
                    self.in_degree[nxt] -= 1
                    if self.in_degree[nxt] == 0:
                        await queue.put(nxt)

            finally:
                queue.task_done()

    # ─────────────────────────────
    # 单节点执行
    # ─────────────────────────────
    async def _execute_node(self, node_id: str):
        node = self.nodes[node_id]

        # ✅ 上游失败 → SKIPPED
        for dep in node.depends_on:
            if self.node_states[dep] == NodeStatus.FAILED:
                self.node_states[node_id] = NodeStatus.SKIPPED
                self.context.update_status(node_id, NodeStatus.SKIPPED)
                return

        self.node_states[node_id] = NodeStatus.RUNNING
        self.context.update_status(node_id, NodeStatus.RUNNING)

        try:
            handler = get_handler(node.type)
            if handler:
                await handler(node, self)
            else:
                await self._execute_default(node)

            self.node_states[node_id] = NodeStatus.SUCCESS
            self.context.update_status(node_id, NodeStatus.SUCCESS)

        except Exception as e:
            self.node_states[node_id] = NodeStatus.FAILED
            self.context.update_status(node_id, NodeStatus.FAILED)
            self.context.log(node_id, f"Error: {str(e)}")

    async def _execute_default(self, node):
        step = self._build_step_payload(node)
        await self.agent._run_step_async(step)

    def _build_step_payload(self, node) -> dict:
        """
        把 AST 节点映射为 ExecutionAgent step 结构。
        """
        node_type_value = node.type.value if hasattr(node.type, "value") else str(node.type)
        if node_type_value == NodeType.DELAY.value:
            seconds = node.params.get("seconds") if node.params else None
            if seconds is None:
                try:
                    seconds = int(node.command)
                except Exception:
                    seconds = 1
            return {
                "step_id": node.id,
                "object_id": "timer",
                "componentName": "delay",
                "data": {"seconds": seconds},
                "depends_on": node.depends_on
            }

        return {
            "step_id": node.id,
            "object_id": "ran",
            "componentName": node.command.lower(),
            "data": node.params or {},
            "depends_on": node.depends_on
        }

