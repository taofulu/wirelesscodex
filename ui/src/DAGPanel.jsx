import React, { useEffect, useState } from "react";
import ReactFlow from "reactflow";

export default function DAGPanel() {
    const [elements, setElements] = useState([]);

    useEffect(() => {
        fetch("http://127.0.0.1:8000/dag")
            .then(res => res.json())
            .then(data => {
                const nodes = data.nodes.map(n => ({
                    id: n.id,
                    data: { label: n.id },
                    position: { x: Math.random() * 300, y: Math.random() * 300 },
                    style: { background: "#ccc" }
                }));

                const edges = data.edges.map((e, i) => ({
                    id: "e" + i,
                    source: e.from,
                    target: e.to
                }));

                setElements([...nodes, ...edges]);
            });

        // ✅ WebSocket
        const ws = new WebSocket("ws://127.0.0.1:8000/ws");

        ws.onmessage = (event) => {
            const msg = JSON.parse(event.data);

            if (msg.type === "status") {
                setElements((els) =>
                    els.map((el) => {
                        if (el.id === msg.node) {
                            let color = "#ccc";
                            if (msg.status === "RUNNING") color = "yellow";
                            if (msg.status === "SUCCESS") color = "green";
                            if (msg.status === "FAILED") color = "red";

                            return { ...el, style: { background: color } };
                        }
                        return el;
                    })
                );
            }
        };

        return () => ws.close();
    }, []);

    return <div style={{ height: 500 }}><ReactFlow elements={elements} /></div>;
}