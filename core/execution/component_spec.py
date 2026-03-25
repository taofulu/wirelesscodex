import json
from pathlib import Path
from typing import Any, Dict


PROJECT_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_SPEC_PATH = PROJECT_ROOT / "ddt" / "component_specs.json"


def _load(path: Path) -> Dict[str, Any]:
    if not path.exists():
        return {"components": []}
    return json.loads(path.read_text(encoding="utf-8"))


def _save(path: Path, data: Dict[str, Any]) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")


def list_components(path: Path = DEFAULT_SPEC_PATH) -> list[dict]:
    data = _load(path)
    return data.get("components", [])


def upsert_component(
    name: str,
    inputs: dict,
    outputs: dict,
    description: str = "",
    path: Path = DEFAULT_SPEC_PATH,
) -> dict:
    data = _load(path)
    comps = data.get("components", [])

    comp = {
        "name": name,
        "description": description,
        "inputs": inputs,
        "outputs": outputs,
    }

    replaced = False
    for i, c in enumerate(comps):
        if c.get("name") == name:
            comps[i] = comp
            replaced = True
            break

    if not replaced:
        comps.append(comp)

    data["components"] = comps
    _save(path, data)
    comp["_replaced"] = replaced
    return comp
