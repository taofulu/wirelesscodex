import React from "react";
import { Handle, Position } from "reactflow";

const statusConfig = {
    pending: {
        background: "#fafafa",
        border: "2px solid #d9d9d9",
        color: "#999",
        label: "",
    },
    running: {
        background: "#fffbe6",
        border: "2px solid #faad14",
        color: "#faad14",
        label: "⏳",
    },
    success: {
        background: "#f6ffed",
        border: "2px solid #52c41a",
        color: "#52c41a",
        label: "✅",
    },
    failed: {
        background: "#fff2f0",
        border: "2px solid #ff4d4f",
        color: "#ff4d4f",
        label: "❌",
    },
    skipped: {
        background: "#f5f5f5",
        border: "2px dashed #bfbfbf",
        color: "#bfbfbf",
        label: "⏭",
    },
};

export default function CustomNode({ data, selected }) {
    const status = data.status || "pending";
    const cfg = statusConfig[status] || statusConfig.pending;
    const opacity = data.dimmed ? 0.35 : 1;

    return (
        <div
            style={{
                ...cfg,
                borderRadius: 10,
                padding: "10px 18px",
                minWidth: 120,
                textAlign: "center",
                cursor: "pointer",
                boxShadow: selected
                    ? "0 0 0 3px #1677ff55"
                    : "0 2px 8px rgba(0,0,0,0.08)",
                transition: "all 0.25s",
                userSelect: "none",
                opacity,
            }}
        >
            <Handle type="target" position={Position.Left} />

            {/* 节点类型标签 */}
            {data.kind && (
                <div style={{ fontSize: 10, color: "#aaa", marginBottom: 2 }}>
                    {data.kind}
                </div>
            )}

            {/* 节点名 + 状态图标 */}
            <div style={{ fontWeight: 600, fontSize: 14, color: cfg.color }}>
                {cfg.label} {data.label ?? data.id}
            </div>

            {data.api_status === "missing" && (
                <div style={{ fontSize: 10, color: "#ff4d4f", marginTop: 2 }}>
                    待开发
                </div>
            )}

            {/* 参数摘要 */}
            {data.params && Object.keys(data.params).length > 0 && (
                <div style={{ fontSize: 11, color: "#666", marginTop: 4 }}>
                    {Object.entries(data.params)
                        .map(([k, v]) => `${k}=${v}`)
                        .join(", ")}
                </div>
            )}

            {/* 执行耗时 */}
            {data.duration != null && (
                <div style={{ fontSize: 10, color: "#aaa", marginTop: 3 }}>
                    {data.duration}ms
                </div>
            )}

            <Handle type="source" position={Position.Right} />
        </div>
    );
}
