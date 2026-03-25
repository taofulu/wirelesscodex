def graph_to_task(graph: dict) -> dict:
    nodes = graph.get("nodes", [])
    edges = graph.get("edges", [])

    # ✅ 建依赖映射
    depends_map = {}
    for e in edges:
        tgt = e["target"]
        src = e["source"]

        depends_map.setdefault(tgt, []).append(src)

    # ✅ 三个阶段
    activities = {
        "setup": [],
        "process": [],
        "teardown": []
    }

    # ✅ 转换节点 → step
    for n in nodes:
        data = n["data"]

        step = {
            "step_id": n["id"],
            "object_id": data.get("object_id"),
            "componentName": data.get("component"),
            "data": data.get("params", {})
        }

        # ✅ 加 depends_on
        if n["id"] in depends_map:
            step["depends_on"] = depends_map[n["id"]]

        stage = data.get("stage", "process")
        activities[stage].append(step)

    # ✅ 返回 task.json
    return {
        "case_metadata": {
            "name": "from_graph"
        },
        "objects": [
            {
                "objects_id": "ran",
                "objects_type": "RAN_CONTROLLER"
            }
        ],
        "activities": activities
    }