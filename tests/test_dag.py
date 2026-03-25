from core.ast.builder import build_sample_ast
from core.planner.planner import ast_to_dag


def test_dag_execution():
    ast = build_sample_ast()
    dag = ast_to_dag(ast)

    dag.run()