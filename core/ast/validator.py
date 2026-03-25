# core/ast/validator.py
from .schema import AST, ASTNode, NodeType


def validate_ast(data: dict) -> tuple[bool, str, AST | None]:
    """
    验证前端提交的 AST JSON，返回 (ok, error_msg, ast_obj)
    """
    try:
        nodes = []
        ids = set()

        for raw in data.get("nodes", []):
            node_id  = raw.get("id")
            node_type = raw.get("type")
            command  = raw.get("command", "")
            params   = raw.get("params", {})
            deps     = raw.get("depends_on", [])

            if not node_id:
                return False, "节点缺少 id", None

            if node_type not in [e.value for e in NodeType]:
                return False, f"节点 {node_id} 类型 '{node_type}' 不合法", None

            if not command:
                return False, f"节点 {node_id} 缺少 command", None

            if node_id in ids:
                return False, f"节点 id '{node_id}' 重复", None

            ids.add(node_id)
            nodes.append(ASTNode(
                id=node_id,
                type=NodeType(node_type),
                command=command,
                params=params,
                depends_on=deps,
            ))

        # 检查依赖引用合法性
        for node in nodes:
            for dep in node.depends_on:
                if dep not in ids:
                    return False, f"节点 {node.id} 依赖 '{dep}' 不存在", None

        return True, "", AST(nodes=nodes)

    except Exception as e:
        return False, str(e), None