/**
 * 把 ReactFlow 的 nodes + edges 转成后端 AST JSON
 */
export function flowToAST(rfNodes, rfEdges) {
    // 用 edges 构建 depends_on 映射
    const depsMap = {};
    rfNodes.forEach((n) => { depsMap[n.id] = []; });
    rfEdges.forEach((e) => {
        if (depsMap[e.target]) {
            depsMap[e.target].push(e.source);
        }
    });

    return {
        nodes: rfNodes.map((n) => ({
            id: n.id,
            type: n.data.kind || n.data.nodeType || "MML",  // ✅ 兼容两种字段名
            command: n.data.command || "",
            params: n.data.params || {},
            depends_on: depsMap[n.id] || [],
        })),
    };
}

/**
 * 生成唯一节点 ID
 */
let counter = 1;
export function genNodeId(type) {
    return `${type.toLowerCase()}_${Date.now()}_${counter++}`;
}