import React from "react";
import { Card, Typography } from "antd";

const { Text } = Typography;

const PALETTE_ITEMS = [
    { kind: "MML", label: "MML 命令", color: "#1677ff", icon: "📡" },
    { kind: "INSTRUMENT", label: "仪器控制", color: "#722ed1", icon: "🔬" },
    { kind: "ASSERT", label: "断言检查", color: "#52c41a", icon: "✔️" },
    { kind: "DELAY", label: "等待延时", color: "#faad14", icon: "⏱" },
];

export default function NodePalette() {
    const onDragStart = (e, item) => {
        e.dataTransfer.setData("application/nodeKind", item.kind);
        e.dataTransfer.effectAllowed = "move";
    };

    return (
        <div
            style={{
                width: 140,
                padding: 10,
                background: "#fff",
                borderRight: "1px solid #f0f0f0",
                display: "flex",
                flexDirection: "column",
                gap: 8,
            }}
        >
            <Text type="secondary" style={{ fontSize: 11, paddingLeft: 4 }}>
                节点类型
            </Text>

            {PALETTE_ITEMS.map((item) => (
                <Card
                    key={item.kind}
                    size="small"
                    draggable
                    onDragStart={(e) => onDragStart(e, item)}
                    style={{
                        cursor: "grab",
                        borderColor: item.color + "66",
                        borderRadius: 8,
                    }}
                    styles={{ body: { padding: "6px 10px" } }}  // ✅ bodyStyle → styles.body
                >
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <span>{item.icon}</span>
                        <Text style={{ fontSize: 12, color: item.color }}>
                            {item.label}
                        </Text>
                    </div>
                </Card>
            ))}
        </div>
    );
}