# core/dag/context.py
import datetime
from typing import Callable, List


class DAGContext:
    def __init__(self):
        self.node_status: dict[str, str] = {}
        self._subscribers: List[Callable] = []

    def subscribe(self, fn: Callable):
        self._subscribers.append(fn)

    def _emit(self, event: dict):
        # 添加run_id到事件中
        if hasattr(self, 'run_id'):
            event['run_id'] = self.run_id
        for fn in self._subscribers:
            try:
                # 检查是否是协程函数
                import asyncio
                if asyncio.iscoroutinefunction(fn):
                    # 如果是协程函数，创建任务
                    asyncio.create_task(fn(event))
                else:
                    # 否则直接调用
                    fn(event)
            except Exception as e:
                print(f"[context] subscriber error: {e}")

    def update_status(self, node_id: str, status: str):
        normalized = status.value if hasattr(status, "value") else status
        self.node_status[node_id] = normalized
        print(f"[{self._now()}] [{node_id}] {normalized}")
        self._emit({
            "type":   "status",
            "node":   node_id,
            "status": normalized,
            "run_id": getattr(self, "run_id", None)
        })

    def log(self, node_id: str, msg: str):
        print(f"[{self._now()}] [{node_id}] {msg}")
        self._emit({
            "type": "log",
            "node": node_id,
            "msg":  msg,
            "time": self._now(),
        })

    def _now(self) -> str:
        return datetime.datetime.now().strftime("%H:%M:%S")
