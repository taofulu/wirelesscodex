import { useCallback, useRef } from "react";
import { useNodesState, useEdgesState, addEdge } from "reactflow";
import { flowToAST, genNodeId } from "../utils/astExport";

const TYPE_COLOR = {
    MML: "#1677ff",
    INSTRUMENT: "#722ed1",
    ASSERT: "#52c41a",
};

function makeRFNode(paletteNode, position) {
    const id = genNodeId(paletteNode.type);
    return {
        id,
        type: "customNode",
        position,
        data: {
            label: paletteNode.defaultCommand,
            nodeType: paletteNode.type,
            command: paletteNode.defaultCommand,
            params: { ...paletteNode.defaultParams },
            status: "pending",
            color: TYPE_COLOR[paletteNode.type],
        },
    };
}

export default function useASTEditor(initialNodes = [], initialEdges = []) {
    const [nodes, setNodes, onNodesChange] = useNodesState(initialNodes);
    const [edges, setEdges, onEdgesChange] = useEdgesState(initialEdges);
    const reactFlowWrapper = useRef(null);
    const reactFlowInstance = useRef(null);

    // 连线
    const onConnect = useCallback(
        (params) =>
            setEdges((eds) =>
                addEdge({ ...params, animated: false, style: { stroke: "#b1b1b7" } }, eds)
            ),
        [setEdges]
    );

    // 拖拽放置
    const onDrop = useCallback(
        (event) => {
            event.preventDefault();
            const raw = event.dataTransfer.getData("application/node");
            if (!raw) return;

            const paletteNode = JSON.parse(raw);
            const bounds = reactFlowWrapper.current.getBoundingClientRect();
            const position = reactFlowInstance.current.project({
                x: event.clientX - bounds.left,
                y: event.clientY - bounds.top,
            });

            setNodes((prev) => [...prev, makeRFNode(paletteNode, position)]);
        },
        [setNodes]
    );

    const onDragOver = useCallback((e) => {
        e.preventDefault();
        e.dataTransfer.dropEffect = "move";
    }, []);

    // 更新节点配置
    const updateNodeData = useCallback((nodeId, newData) => {
        setNodes((prev) =>
            prev.map((n) =>
                n.id === nodeId
                    ? { ...n, data: { ...n.data, ...newData } }
                    : n
            )
        );
    }, [setNodes]);

    // 删除节点（同时删相关边）
    const deleteNode = useCallback((nodeId) => {
        setNodes((prev) => prev.filter((n) => n.id !== nodeId));
        setEdges((prev) => prev.filter((e) => e.source !== nodeId && e.target !== nodeId));
    }, [setNodes, setEdges]);

    // 复制节点
    const duplicateNode = useCallback((node) => {
        if (!node) return;
        const baseType = node.data?.nodeType || "node";
        const newId = genNodeId(baseType);
        const pos = node.position || { x: 0, y: 0 };
        const offset = { x: pos.x + 40, y: pos.y + 40 };
        const newNode = {
            ...node,
            id: newId,
            position: offset,
            data: {
                ...node.data,
                status: "pending",
            },
        };
        setNodes((prev) => [...prev, newNode]);
    }, [setNodes]);

    // 导出 AST JSON
    const exportAST = useCallback(() => {
        return flowToAST(nodes, edges);
    }, [nodes, edges]);

    // 重置所有节点状态（Run 前调用）
    const resetStatus = useCallback(() => {
        setNodes((prev) =>
            prev.map((n) => ({
                ...n,
                data: { ...n.data, status: "pending", duration: undefined },
            }))
        );
        setEdges((prev) =>
            prev.map((e) => ({
                ...e,
                animated: false,
                style: { stroke: "#b1b1b7" },
            }))
        );
    }, [setNodes, setEdges]);

    // 更新节点运行状态（WS 回调用）
    const updateNodeStatus = useCallback((nodeId, status, extra = {}) => {
        setNodes((prev) =>
            prev.map((n) =>
                n.id === nodeId
                    ? { ...n, data: { ...n.data, status, ...extra } }
                    : n
            )
        );
        if (status === "running") {
            setEdges((prev) =>
                prev.map((e) =>
                    e.target === nodeId
                        ? { ...e, animated: true, style: { stroke: "#faad14", strokeWidth: 2 } }
                        : e
                )
            );
        }
        if (status === "success") {
            setEdges((prev) =>
                prev.map((e) =>
                    e.target === nodeId
                        ? { ...e, animated: false, style: { stroke: "#52c41a", strokeWidth: 2 } }
                        : e
                )
            );
        }
    }, [setNodes, setEdges]);

    return {
        nodes, edges, setNodes,   // ✅ 加这个
        setEdges,
        onNodesChange, onEdgesChange,
        onConnect, onDrop, onDragOver,
        reactFlowWrapper, reactFlowInstance,
        updateNodeData, deleteNode, duplicateNode,
        exportAST, resetStatus, updateNodeStatus,
    };
}
