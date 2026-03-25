from typing import List, Dict, Any

class Node:
    def __init__(self, id: str, data: Dict[str, Any]):
        self.id = id
        self.data = data  # 包含 component / params / stage


class Edge:
    def __init__(self, source: str, target: str):
        self.source = source
        self.target = target


class Graph:
    def __init__(self, nodes: List[Node], edges: List[Edge]):
        self.nodes = nodes
        self.edges = edges