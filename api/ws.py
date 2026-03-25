from fastapi import WebSocket


class ConnectionManager:
    def __init__(self):
        self.active_runs = {}  # run_id -> set(ws)

    async def connect(self, run_id, websocket):
        await websocket.accept()
        self.active_runs.setdefault(run_id, set()).add(websocket)

    def disconnect(self, run_id, websocket):
        if run_id in self.active_runs:
            self.active_runs[run_id].discard(websocket)

    async def emit_to_run(self, run_id, message):
        if run_id not in self.active_runs:
            return

        dead = set()

        for ws in self.active_runs[run_id]:
            try:
                await ws.send_json(message)
            except:
                dead.add(ws)

        self.active_runs[run_id] -= dead


ws_manager = ConnectionManager()