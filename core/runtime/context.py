import time


class ExecutionContext:
    def __init__(self):
        self.logs = []
        self.node_status = {}
        self.subscribers = []

    def subscribe(self, fn):
        self.subscribers.append(fn)

    def _notify(self, event):
        for fn in self.subscribers:
            fn(event)

    def log(self, node_id, message):
        entry = {
            "type": "log",
            "time": time.strftime("%H:%M:%S"),
            "node": node_id,
            "msg": message
        }
        self.logs.append(entry)
        self._notify(entry)
        print(f"[{entry['time']}] [{node_id}] {message}")

    def update_status(self, node_id, status):
        self.node_status[node_id] = status

        event = {
            "type": "status",
            "node": node_id,
            "status": status
        }

        self._notify(event)