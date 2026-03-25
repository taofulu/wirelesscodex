import asyncio
import json
import sys
from pathlib import Path

PROJECT_ROOT = Path(__file__).resolve().parents[1]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from core.execution.execution_agent import ExecutionAgent


DATASET_PATH = PROJECT_ROOT / "ddt" / "default_dataset.json"


async def run_case(case: dict):
    meta = case.get("case_metadata", {})
    case_id = meta.get("name") or "unnamed_case"

    print(f"[DDT] Running: {case_id}")
    agent = ExecutionAgent()
    await asyncio.to_thread(agent.run, case)
    print(f"[DDT] Done: {case_id}")


async def main():
    if not DATASET_PATH.exists():
        print(f"[DDT] Dataset not found: {DATASET_PATH}")
        return

    data = json.loads(DATASET_PATH.read_text(encoding="utf-8"))
    cases = data.get("cases", [])

    for case in cases:
        await run_case(case)


if __name__ == "__main__":
    asyncio.run(main())
