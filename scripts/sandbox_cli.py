import argparse
import asyncio
import json
import sys
from pathlib import Path

# ensure project root in path
PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from core.execution.execution_agent import ExecutionAgent
from core.ast.validator import validate_ast
from core.dag.engine import DAGRun
from core.execution.component_spec import (
    list_components,
    upsert_component,
    DEFAULT_SPEC_PATH,
)

DEFAULT_DATASET = PROJECT_ROOT / "ddt" / "default_dataset.json"


def load_dataset(path: Path):
    if not path.exists():
        raise FileNotFoundError(f"dataset not found: {path}")
    return json.loads(path.read_text(encoding="utf-8"))


def list_cases(path: Path):
    data = load_dataset(path)
    cases = data.get("cases", [])
    for i, c in enumerate(cases, 1):
        meta = c.get("case_metadata", {}) or {}
        name = meta.get("name") or f"case_{i}"
        desc = meta.get("description", "")
        print(f"{i}. {name} {('- ' + desc) if desc else ''}")


async def run_task(task_json: dict):
    agent = ExecutionAgent()
    await asyncio.to_thread(agent.run, task_json)


async def run_case_by_name(path: Path, name: str):
    data = load_dataset(path)
    cases = data.get("cases", [])
    for c in cases:
        meta = c.get("case_metadata", {}) or {}
        if meta.get("name") == name:
            await run_task(c)
            return
    raise ValueError(f"case not found: {name}")


async def run_task_file(path: Path):
    if not path.exists():
        raise FileNotFoundError(f"task.json not found: {path}")
    task = json.loads(path.read_text(encoding="utf-8"))
    await run_task(task)


async def run_ast_file(path: Path):
    if not path.exists():
        raise FileNotFoundError(f"ast.json not found: {path}")
    ast = json.loads(path.read_text(encoding="utf-8"))
    ok, err, parsed = validate_ast(ast)
    if not ok or not parsed:
        raise ValueError(f"invalid AST: {err}")
    dag_run = DAGRun(parsed.nodes)
    await dag_run.run()


def main():
    parser = argparse.ArgumentParser(description="WirelessCodex Sandbox CLI")
    sub = parser.add_subparsers(dest="cmd", required=True)

    p_list = sub.add_parser("list", help="list default dataset cases")
    p_list.add_argument("--dataset", default=str(DEFAULT_DATASET))

    p_run_case = sub.add_parser("run-case", help="run a case by name from dataset")
    p_run_case.add_argument("name")
    p_run_case.add_argument("--dataset", default=str(DEFAULT_DATASET))

    p_run_task = sub.add_parser("run-task", help="run a task.json file")
    p_run_task.add_argument("path")

    p_run_ast = sub.add_parser("run-ast", help="run an ast.json file")
    p_run_ast.add_argument("path")

    p_list_comp = sub.add_parser("list-components", help="list component API specs")
    p_list_comp.add_argument("--spec", default=str(DEFAULT_SPEC_PATH))

    p_add_comp = sub.add_parser("add-component", help="add or update component API spec")
    p_add_comp.add_argument("name")
    p_add_comp.add_argument("--inputs", required=True, help="JSON string of inputs")
    p_add_comp.add_argument("--outputs", required=True, help="JSON string of outputs")
    p_add_comp.add_argument("--desc", default="", help="description")
    p_add_comp.add_argument("--spec", default=str(DEFAULT_SPEC_PATH))

    args = parser.parse_args()

    if args.cmd == "list":
        list_cases(Path(args.dataset))
        return

    if args.cmd == "run-case":
        asyncio.run(run_case_by_name(Path(args.dataset), args.name))
        return

    if args.cmd == "run-task":
        asyncio.run(run_task_file(Path(args.path)))
        return

    if args.cmd == "run-ast":
        asyncio.run(run_ast_file(Path(args.path)))
        return

    if args.cmd == "list-components":
        comps = list_components(Path(args.spec))
        if not comps:
            print("No components defined.")
            return
        for c in comps:
            print(f"- {c.get('name')}: {c.get('description','')}")
            print(f"  inputs: {json.dumps(c.get('inputs', {}), ensure_ascii=False)}")
            print(f"  outputs: {json.dumps(c.get('outputs', {}), ensure_ascii=False)}")
        return

    if args.cmd == "add-component":
        try:
            inputs = json.loads(args.inputs)
            outputs = json.loads(args.outputs)
        except json.JSONDecodeError as e:
            raise ValueError(f"invalid JSON: {e}")
        comp = upsert_component(
            name=args.name,
            inputs=inputs,
            outputs=outputs,
            description=args.desc,
            path=Path(args.spec),
        )
        action = "updated" if comp.get("_replaced") else "created"
        print(f"{action}: {comp.get('name')}")
        return


if __name__ == "__main__":
    main()
