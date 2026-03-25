# core/planner/planner.py
import time
import random

from core.dag.engine  import DAGEngine
from core.dag.context import DAGContext
from core.ast.schema  import AST, NodeType


def ast_to_dag(ast: AST):
    context = DAGContext()
    dag     = DAGEngine()
    dag.context = context

    for node in ast.nodes:
        dag.add_node(node.id, _make_executor(node, context))

    for node in ast.nodes:
        for dep in node.depends_on:
            dag.add_edge(dep, node.id)

    return dag, context



def _make_executor(ast_node, context: DAGContext):

    def executor(n=ast_node):              # ← n=ast_node 固定引用，关键！
        node_type = n.type.value if isinstance(n.type, NodeType) else str(n.type)
        print("DEBUG TYPE:", type(n), n.__dict__)

        context.update_status(n.id, "RUNNING")
        time.sleep(random.uniform(0.3, 1.0))

        if node_type == "MML":
            context.log(n.id, f"MML       → {n.command}")
        elif node_type == "INSTRUMENT":
            context.log(n.id, f"INSTR     → {n.command}")
        elif node_type == "ASSERT":
            context.log(n.id, f"ASSERT    → {n.command}")
        elif node_type == "DELAY":
            context.log(n.id, f"DELAY     → {n.command}")
        else:
            context.log(n.id, f"UNKNOWN   → {n.command}")

        context.update_status(n.id, "SUCCESS")

    return executor