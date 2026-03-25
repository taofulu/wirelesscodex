from core.dag.registry import register
from core.ast.schema import NodeType


@register(NodeType.MML)
@register(NodeType.INSTRUMENT)
@register(NodeType.ASSERT)
async def _default_node_handler(node, dag_run):
    await dag_run._execute_default(node)


@register(NodeType.DELAY)
async def _delay_node_handler(node, dag_run):
    await dag_run._execute_default(node)
