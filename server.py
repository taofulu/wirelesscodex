from core.execution.execution_agent import ExecutionAgent
from core.graph.graph_to_task import graph_to_task

from fastapi import FastAPI, WebSocket, WebSocketDisconnect, HTTPException
from fastapi.middleware.cors import CORSMiddleware
import asyncio
import json
from pathlib import Path

from core.ast.validator import validate_ast
from core.dag.engine import DAGRun
from core.dag.registry import reload_handlers, registered_types
from core.execution.api_library import sync_api_library, load_api_library, DEFAULT_LIBRARY
import os
from api.ws import ws_manager
from core.parser.intent_to_dsl import intent_to_dsl
from core.parser.dsl_parser import parse_dsl


app = FastAPI()

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.post("/run_graph")
async def run_graph(graph: dict):
    # ✅ 1. Graph → task.json
    task_json = graph_to_task(graph)

    # ✅ 2. 执行
    agent = ExecutionAgent()
    # ExecutionAgent.run is sync and may block; run it in a worker thread
    await asyncio.to_thread(agent.run, task_json)

    return {"status": "ok"}

@app.post("/run_task")
async def run_task(task_json: dict):
    agent = ExecutionAgent()
    # ExecutionAgent.run is sync and may block; run it in a worker thread
    asyncio.create_task(asyncio.to_thread(agent.run, task_json))
    return {"status": "started"}

@app.get("/")
def root():
    return {"msg": "WirelessCodex API running"}

@app.post("/intent/parse")
async def parse_intent_api(req: dict):
    text = req.get("text", "")

    dsl = intent_to_dsl(text)
    ast = parse_dsl(dsl)

    return {
        "dsl": dsl,
        "ast": {
            "nodes": [n.dict() for n in ast.nodes]
        }
    }

@app.get("/ddt/cases")
def list_ddt_cases():
    dataset_path = Path(__file__).resolve().parent / "ddt" / "default_dataset.json"
    if not dataset_path.exists():
        raise HTTPException(status_code=404, detail="ddt dataset not found")
    data = json.loads(dataset_path.read_text(encoding="utf-8"))
    cases = data.get("cases", [])

    def to_ast_nodes(task_case: dict):
        activities = task_case.get("activities", {})
        steps = (
            activities.get("setup", []) +
            activities.get("process", []) +
            activities.get("teardown", [])
        )
        mml_commands = {
            "add_ue", "del_ue", "mod_ue", "show_ue", "rst_brd", "upgrade_version"
        }
        nodes = []
        prev_id = None
        for step in steps:
            step_id = step.get("step_id")
            comp = (step.get("componentName") or "").lower()
            params = step.get("data", {})

            if comp == "delay":
                node_type = "DELAY"
                command = "DELAY"
            elif "assert" in comp:
                node_type = "ASSERT"
                command = comp.upper()
            elif comp in mml_commands:
                node_type = "MML"
                command = comp.upper()
            else:
                node_type = "INSTRUMENT"
                command = comp.upper() if comp else "STEP"

            depends_on = step.get("depends_on")
            if depends_on is None and prev_id:
                depends_on = [prev_id]
            prev_id = step_id

            nodes.append({
                "id": step_id,
                "type": node_type,
                "command": command,
                "params": params,
                "depends_on": depends_on or []
            })
        return nodes

    response_cases = []
    for idx, case in enumerate(cases):
        meta = case.get("case_metadata", {})
        response_cases.append({
            "id": meta.get("name") or f"case_{idx+1}",
            "name": meta.get("name") or f"case_{idx+1}",
            "nodes": to_ast_nodes(case),
        })

    return {"cases": response_cases}

@app.post("/ddt/cases")
def save_ddt_case(payload: dict):
    dataset_path = Path(__file__).resolve().parent / "ddt" / "default_dataset.json"
    if not dataset_path.exists():
        raise HTTPException(status_code=404, detail="ddt dataset not found")

    case = payload.get("case") if isinstance(payload, dict) else None
    if case is None:
        case = payload

    if not isinstance(case, dict):
        raise HTTPException(status_code=400, detail="invalid case payload")

    meta = case.get("case_metadata", {}) or {}
    name = meta.get("name") or "Sandbox_Task"
    meta["name"] = name
    case["case_metadata"] = meta

    data = json.loads(dataset_path.read_text(encoding="utf-8"))
    cases = data.get("cases", [])

    replaced = False
    for i, c in enumerate(cases):
        cmeta = c.get("case_metadata", {}) or {}
        if cmeta.get("name") == name:
            cases[i] = case
            replaced = True
            break

    if not replaced:
        cases.append(case)

    data["cases"] = cases
    dataset_path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")

    return {"status": "saved", "name": name, "replaced": replaced}


@app.post("/handlers/reload")
def reload_execution_handlers():
    reload_handlers()
    return {"status": "reloaded", "types": registered_types()}


@app.post("/api-library/sync")
def sync_api_library_endpoint():
    payload = sync_api_library()
    return {"status": "synced", "count": len(payload.get("apis", []))}


@app.get("/api-library")
def get_api_library():
    payload = load_api_library()
    return {"apis": payload.get("apis", [])}


@app.post("/ai/fill-params")
def fill_params(payload: dict):
    """
    根据 PROMPT 参数调用 LLM 生成真实参数。
    当前仅做占位，需配置 LLM_PROVIDER/KEY。
    """
    provider = os.getenv("LLM_PROVIDER", "").lower()
    if not provider:
        raise HTTPException(
            status_code=501,
            detail="LLM not configured. Set LLM_PROVIDER and API key, or ask to wire provider.",
        )

    # TODO: 接入具体 LLM 服务。此处仅回传原节点。
    nodes = payload.get("nodes", [])
    return {"nodes": nodes}

@app.post("/run")
async def run(ast: dict):
    ok, err, parsed = validate_ast(ast)
    if not ok or not parsed:
        raise HTTPException(status_code=400, detail=err)

    dag_run = DAGRun(parsed.nodes)

    async def _push(event: dict):
        await ws_manager.emit_to_run(dag_run.id, event)

    dag_run.context.subscribe(_push)

    # ✅ 异步执行（不阻塞）
    asyncio.create_task(dag_run.run())

    return {
        "run_id": dag_run.id,
        "status": "started",
        "nodes": [n.dict() for n in parsed.nodes]
    }

@app.websocket("/ws/{run_id}")
async def websocket_endpoint(websocket: WebSocket, run_id: str):
    await ws_manager.connect(run_id, websocket)
    try:
        while True:
            await websocket.receive_text()
    except Exception:
        ws_manager.disconnect(run_id, websocket)
