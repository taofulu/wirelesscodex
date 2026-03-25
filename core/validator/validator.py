def validate_ast(ast):
    ids = set()

    for node in ast.nodes:
        if node.id in ids:
            raise ValueError("Duplicate node id")
        ids.add(node.id)

    return True