import json
from pathlib import Path
from typing import Any, Dict, List


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_DATASET = PROJECT_ROOT / "ddt" / "default_dataset.json"
DEFAULT_LIBRARY = PROJECT_ROOT / "ddt" / "api_library.json"


def _load(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {"cases": []}
    return json.loads(path.read_text(encoding="utf-8"))


def _save(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def _infer_type(component: str) -> str:
    comp = (component or "").lower()
    mml_commands = {
        "add_ue", "del_ue", "mod_ue", "show_ue", "rst_brd", "upgrade_version"
    }
    if comp == "delay":
        return "DELAY"
    if "assert" in comp:
        return "ASSERT"
    if comp in mml_commands:
        return "MML"
    return "INSTRUMENT"


def sync_api_library(
    dataset_path: Path = DEFAULT_DATASET,
    library_path: Path = DEFAULT_LIBRARY,
) -> Dict[str, Any]:
    data = _load(dataset_path)
    cases = data.get("cases", [])

    seen = set()
    apis: List[Dict[str, Any]] = []

    for case in cases:
        activities = case.get("activities", {})
        steps = (
            activities.get("setup", []) +
            activities.get("process", []) +
            activities.get("teardown", [])
        )
        for step in steps:
            comp = step.get("componentName")
            obj_id = step.get("object_id")
            key = f"{comp}|{obj_id}"
            if key in seen:
                continue
            seen.add(key)
            apis.append({
                "componentName": comp,
                "object_id": obj_id,
                "data": step.get("data", {}),
                "type": _infer_type(comp),
            })

    payload = {"apis": apis}
    _save(library_path, payload)
    return payload


def load_api_library(path: Path = DEFAULT_LIBRARY) -> Dict[str, Any]:
    if not path.exists():
        return {"apis": []}
    return json.loads(path.read_text(encoding="utf-8"))
