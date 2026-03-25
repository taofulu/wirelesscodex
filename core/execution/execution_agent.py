import asyncio
import re
import time

class ExecutionAgent:
    def __init__(self):
        self.object_registry = {}
        self.step_outputs = {}

    # =========================
    # 主入口
    # =========================
    def run(self, task_json: dict):
        self._init_objects(task_json.get("objects", []))

        activities = task_json.get("activities", {})

        for stage in ["setup", "process", "teardown"]:
            steps = activities.get(stage, [])
            for step in steps:
                self._run_step(step)

    # =========================
    # 初始化对象（公开）
    # =========================
    def init_objects(self, objects):
        """
        显式初始化对象注册表（供 DAGRun 等场景复用）。
        """
        self._init_objects(objects)

    # =========================
    # 初始化对象
    # =========================
    def _init_objects(self, objects):
        for obj in objects:
            obj_id = obj.get("objects_id") or obj.get("object_id")
            obj_type = obj.get("objects_type") or obj.get("object_type")

            instance = self._create_object(obj_type)

            self.object_registry[obj_id] = instance

    def _create_object(self, obj_type: str):
        # 👉 这里可以接真实系统
        if obj_type is None:
            return GenericObject()
        if obj_type == "HTTP_CLIENT":
            return HttpClient()
        if obj_type == "DB_CONNECTOR":
            return Database()
        if obj_type == "RAN_CONTROLLER":
            return RanController()
        if obj_type == "TIMER":
            return Timer()
        if str(obj_type).lower() == "todo":
            return ApiClientMock()
        return GenericObject()

    # =========================
    # 执行 step
    # =========================
    def _run_step(self, step: dict):
        step_id = step["step_id"]
        obj_id = step["object_id"]
        component = step["componentName"]
        data = step.get("data", {})

        if component == "delay":
            seconds = data.get("seconds", "?")
            print(f"[RUN] {step_id} -> delay ({seconds}s)")
        else:
            print(f"[RUN] {step_id} -> {component}")

        # 解析变量引用
        data = self._resolve_refs(data)

        obj = self.object_registry.get(obj_id)

        if not obj:
            raise Exception(f"Object not found: {obj_id}")

        result = self._invoke(obj, component, data)

        # 保存输出
        self.step_outputs[step_id] = result or {}

    # =========================
    # 异步执行 step（供 DAG 并发）
    # =========================
    async def _run_step_async(self, step: dict):
        step_id = step["step_id"]
        obj_id = step["object_id"]
        component = step["componentName"]
        data = step.get("data", {})

        if component == "delay":
            seconds = data.get("seconds", "?")
            print(f"[RUN] {step_id} -> delay ({seconds}s)")
        else:
            print(f"[RUN] {step_id} -> {component}")

        # 解析变量引用
        data = self._resolve_refs(data)

        obj = self.object_registry.get(obj_id)
        if not obj:
            raise Exception(f"Object not found: {obj_id}")

        result = await self._invoke_async(obj, component, data)

        # 保存输出
        self.step_outputs[step_id] = result or {}
        return result

    async def _invoke_async(self, obj, component: str, data: dict):
        if not hasattr(obj, component):
            raise Exception(f"{obj} has no method {component}")

        fn = getattr(obj, component)

        if asyncio.iscoroutinefunction(fn):
            return await fn(**data)

        loop = asyncio.get_running_loop()
        return await loop.run_in_executor(None, lambda: fn(**data))

    # =========================
    # 调用组件
    # =========================
    def _invoke(self, obj, component: str, data: dict):
        if hasattr(obj, component):
            fn = getattr(obj, component)
            return fn(**data)
        raise Exception(f"{obj} has no method {component}")

    # =========================
    # 变量替换 ${step.output}
    # =========================
    def _resolve_refs(self, data: dict):
        def resolve(value):
            if isinstance(value, str):
                # 匹配 ${...} 形式的变量，注意花括号转义
                matches = re.findall(r"\$\{(.*?)\}", value)
                for m in matches:
                    # m 的格式应为 "step_id.key"
                    if "." not in m:
                        continue
                    step_id, key = m.split(".", 1)
                    val = self.step_outputs.get(step_id, {}).get(key)
                    value = value.replace(f"${{{m}}}", str(val))
            return value

        # 对字典的每个值应用解析
        return {k: resolve(v) for k, v in data.items()}


# =========================
# Mock Objects（先跑通用）
# =========================
class HttpClient:
    def post_request(self, url, json=None):
        print(f"[HTTP] POST {url} {json}")
        return {"status": 200, "data": {"id": 123}}


class Database:
    def query(self, sql):
        print(f"[DB] {sql}")
        return {"rows": []}


class RanController:
    def add_ue(self, ue_id=None, **kwargs):
        print(f"[RAN] ADD UE {ue_id if ue_id is not None else ''}".strip())
        return {"ue_id": ue_id or "ue_1"}

    def check_attach(self, **kwargs):
        print("[RAN] CHECK ATTACH")
        return {"attached": True}

    def set_power(self, power_dbm=None, **kwargs):
        print(f"[RAN] SET POWER {power_dbm}")
        return {"ok": True}

    # ---------- Extended Ops (DDT stubs) ----------
    def upgrade_version(self, target_version: str = "", package: str = "", **kwargs):
        print(f"[RAN] UPGRADE VERSION {target_version} ({package})")
        return {"ok": True, "version": target_version}

    def play_scenario(self, scenario_file: str = "", **kwargs):
        print(f"[RAN] PLAY SCENARIO {scenario_file}")
        return {"ok": True}

    def stop_scenario(self, **kwargs):
        print("[RAN] STOP SCENARIO")
        return {"ok": True}

    def start_tracking(self, cell_id: str = "", **kwargs):
        print(f"[RAN] START TRACKING {cell_id}")
        return {"ok": True}

    def stop_tracking(self, **kwargs):
        print("[RAN] STOP TRACKING")
        return {"ok": True}

    def start_gui_log(self, log_path: str = "", **kwargs):
        print(f"[RAN] START GUI LOG {log_path}")
        return {"ok": True}

    def stop_gui_log(self, **kwargs):
        print("[RAN] STOP GUI LOG")
        return {"ok": True}


class Timer:
    def delay(self, seconds: int):
        print(f"[TIMER] sleep {seconds}s")
        time.sleep(seconds)
        return {"slept": seconds}


class GenericObject:
    pass


class ApiClientMock:
    def connection_check(self):
        print("[API] CONNECTION CHECK")
        return {"ok": True}

    def post_request(self, url, json=None, auth=None):
        print(f"[API] POST {url} json={json} auth={auth}")
        return {"status": 200, "data": {"id": 123}}

    def status_code_assertion(self, expected_code):
        print(f"[API] STATUS CODE ASSERTION {expected_code}")
        return {"ok": True}
