from core.ast.schema import AST, ASTNode, NodeType


class DSLParser:
    """
    解析 DSL 字符串，生成 AST。
    示例：
    输入: "MML:ADD_UE; DELAY:2; ASSERT:CHECK_ATTACH"
    输出: AST 对象
    """

    def parse(self, dsl: str) -> AST:
        nodes = []
        dsl_parts = [part.strip() for part in dsl.split(';') if part.strip()]

        for i, part in enumerate(dsl_parts):
            if ':' not in part:
                continue

            node_type, operation = part.split(':', 1)
            node_id = f"n{i + 1}"

            # 确定节点类型
            if node_type.upper() == 'MML':
                type_enum = NodeType.MML
            elif node_type.upper() == 'DELAY':
                type_enum = NodeType.DELAY
            elif node_type.upper() == 'ASSERT':
                type_enum = NodeType.ASSERT
            elif node_type.upper() == 'INSTRUMENT':
                type_enum = NodeType.INSTRUMENT
            else:
                type_enum = NodeType.MML

            params = {}
            command = operation

            if type_enum == NodeType.DELAY:
                # DELAY:5 -> seconds=5
                try:
                    params["seconds"] = int(operation)
                except Exception:
                    params["seconds"] = 1
                command = "DELAY"

            node = ASTNode(
                id=node_id,
                type=type_enum,
                command=command,
                params=params,
                depends_on=[f"n{i}"] if i > 0 else []
            )
            nodes.append(node)

        return AST(nodes=nodes)


def parse_dsl(dsl: str) -> AST:
    parser = DSLParser()
    return parser.parse(dsl)
