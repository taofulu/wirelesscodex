from core.ast.builder import build_sample_ast
from core.validator.validator import validate_ast


def test_ast_valid():
    ast = build_sample_ast()
    assert validate_ast(ast)