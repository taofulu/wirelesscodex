def generate_task_json(ast: dict) -> dict:
    """
    AST → Task JSON

    输入:
    {
        "nodes": [...]
    }

    输出:
    {
        "tasks": [...]
    }
    """
    tasks = []

    for node in ast.get("nodes", []):
        task = _convert_node(node)
        if task:
            tasks.append(task)

    return {"tasks": tasks}

def _convert_node(node: dict) -> dict:
    command = node.get("command", "").upper()

    return {
        "id": node.get("id"),
        "type": _map_type(command),
        "action": command,
        "params": node.get("params", {}),
        "depends_on": node.get("depends_on", [])
    }

def _map_type(command: str) -> str:
    """
    根据 command 推断类型
    """
    if command in ["ADD_UE", "DEL_UE", "CHECK_ATTACH"]:
        return "MML"

    if command in ["DELAY", "WAIT"]:
        return "DELAY"

    if command.startswith("SET_") or command.startswith("MEASURE"):
        return "INSTRUMENT"

    if command.startswith("CLICK") or command.startswith("OPEN"):
        return "GUI"

    return "UNKNOWN"