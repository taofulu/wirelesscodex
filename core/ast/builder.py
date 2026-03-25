from core.ast.schema import AST, ASTNode, NodeType



def build_sample_ast():
    return AST(nodes=[
        ASTNode(id="n1", type=NodeType.MML, command="ADD_UE"),
        ASTNode(id="n2", type="INSTRUMENT", command="SET_POWER", depends_on=["n1"]),
        ASTNode(id="n3", type="ASSERT", command="CHECK_ATTACH", depends_on=["n2"]),
    ])
