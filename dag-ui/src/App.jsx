import React, { useState, useRef, useCallback, useEffect } from "react";
import ReactFlow, {
  Background, Controls, MiniMap,
} from "reactflow";
import "reactflow/dist/style.css";

import { Button, Space, Badge, Drawer, List, Tag, Typography, Tooltip, message, Input, Select } from "antd";
import {
  PlayCircleOutlined, ReloadOutlined,
  UnorderedListOutlined, ExportOutlined, ImportOutlined,
  SettingOutlined, FileTextOutlined, BarChartOutlined,
} from "@ant-design/icons";

import CustomNode from "./components/CustomNode";
import NodePalette from "./components/NodePalette";
import NodeConfigPanel from "./components/NodeConfigPanel";
import useASTEditor from "./hooks/useASTEditor";
import useDAGSocket from "./hooks/useDAGSocket";
import Sandbox from "./Sandbox";
import { NODE_TYPES } from "./nodeTypes";

// ✅ 直接在组件外部定义（最稳定）
const nodeTypes = NODE_TYPES;

const { Text } = Typography;
const { TextArea } = Input;

// ── 初始样例节点 ──────────────────────────────────────────
const INIT_NODES = [
  {
    id: "n1", type: "customNode", position: { x: 80, y: 180 },
    data: {
      label: "ADD_UE", nodeType: "MML", command: "ADD_UE",
      params: { ue_id: "1" }, status: "pending", color: "#1677ff"
    },
  },
  {
    id: "n2", type: "customNode", position: { x: 340, y: 180 },
    data: {
      label: "SET_POWER", nodeType: "INSTRUMENT", command: "SET_POWER",
      params: { power_dbm: -70 }, status: "pending", color: "#722ed1"
    },
  },
  {
    id: "n3", type: "customNode", position: { x: 600, y: 180 },
    data: {
      label: "CHECK_ATTACH", nodeType: "ASSERT", command: "CHECK_ATTACH",
      params: { expected: true }, status: "pending", color: "#52c41a"
    },
  },
];
const INIT_EDGES = [
  { id: "e1-2", source: "n1", target: "n2", animated: false, style: { stroke: "#b1b1b7" } },
  { id: "e2-3", source: "n2", target: "n3", animated: false, style: { stroke: "#b1b1b7" } },
];
// ─────────────────────────────────────────────────────────

export default function App() {
  const [mode, setMode] = useState("main");
  const {
    nodes, edges, setNodes, setEdges,
    onNodesChange, onEdgesChange,
    onConnect, onDrop, onDragOver,
    reactFlowWrapper, reactFlowInstance,
    updateNodeData, deleteNode, duplicateNode,
    exportAST, resetStatus, updateNodeStatus,
  } = useASTEditor(INIT_NODES, INIT_EDGES);

  const [running, setRunning] = useState(false);
  const [logsOpen, setLogsOpen] = useState(false);
  const [logs, setLogs] = useState([]);
  const [selectedNode, setSelectedNode] = useState(null);
  const [intentText, setIntentText] = useState("");
  const [runId, setRunId] = useState(null);
  const [ddtCases, setDdtCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const nodeStartRef = useRef({});
  const formatTime = () => {
    const now = new Date();
    const pad = (n) => String(n).padStart(2, "0");
    return `${pad(now.getHours())}:${pad(now.getMinutes())}:${pad(now.getSeconds())}`;
  };

  // ── WS 事件处理 ───────────────────────────────────────
  useDAGSocket(runId, (event) => {
    if (event.type === "status") {
      const { node } = event;

      // ✅ 后端发 SUCCESS/RUNNING/FAILED/SKIPPED，转成前端 key
      const statusMap = {
        RUNNING: "running",
        SUCCESS: "success",
        FAILED: "failed",
        SKIPPED: "skipped",
      };
      const status = statusMap[event.status] ?? "pending";

      let extra = {};
      if (status === "running") {
        nodeStartRef.current[node] = Date.now();
        const nodeInfo = nodes.find((n) => n.id === node);
        const cmd = nodeInfo?.data?.command?.toUpperCase();
        if (cmd === "DELAY") {
          const seconds = nodeInfo?.data?.params?.seconds ?? "?";
          const logKey = `${node}-delay-log`;
          if (!nodeStartRef.current[logKey]) {
            nodeStartRef.current[logKey] = true;
            setLogs((prev) => [
              ...prev,
              {
                id: Date.now() + Math.random(),
                node,
                status: "log",
                time: formatTime(),
                msg: `DELAY (${seconds}s)`,
              },
            ]);
          }
        }
      } else if (["success", "failed", "skipped"].includes(status)) {
        const start = nodeStartRef.current[node];
        if (start) extra.duration = Date.now() - start;
      }

      updateNodeStatus(node, status, extra);      // ✅ 传 extra 不是 {}
    }

    if (event.type === "run_status") {
      setRunning(false);
    }

    if (event.type === "log") {
      setLogs((prev) => [
        ...prev,
        {
          id: Date.now() + Math.random(),
          node: event.node,
          status: "log",
          time: event.time,
          msg: event.msg,
        },
      ]);
    }
  });

  useEffect(() => {
    const loadCases = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/ddt/cases");
        const data = await res.json();
        if (res.ok) {
          setDdtCases(data.cases || []);
        } else {
          message.warning(data?.detail || "加载默认场景失败");
        }
      } catch (e) {
        message.warning("加载默认场景失败");
      }
    };
    loadCases();
  }, []);

  // ── Run ──────────────────────────────────────────────
  const handleRun = async () => {
    const ast = exportAST();   // ??????

    console.log("AST:", ast);

    const res = await fetch("http://127.0.0.1:8000/run", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(ast),
    });

    const data = await res.json();
    if (!res.ok) {
      message.error(`????: ${data?.detail ?? res.status}`);
      return;
    }
    console.log("????:", data);
    if (data?.nodes) {
      console.log("Run nodes:", data.nodes);
    }

    if (data.run_id) {
      setRunId(data.run_id);
      setRunning(true);
    }
  };

  // ????
  const handleParseIntent = async () => {
    if (!intentText) {
      message.warning("?????");
      return;
    }

    const res = await fetch("http://127.0.0.1:8000/intent/parse", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ text: intentText }),
    });

    const data = await res.json();
    console.log("AST nodes:", data?.ast?.nodes);

    if (!data?.ast?.nodes) {
      console.error("????:", data);
      message.error("????");
      return;
    }

    generateDagFromIntent(data.ast.nodes);
  };

  const handleLoadCase = () => {
    const selected = ddtCases.find((c) => c.id === selectedCaseId);
    if (!selected) {
      message.warning("请选择一个默认场景");
      return;
    }
    generateDagFromIntent(selected.nodes || []);
    message.success(`已加载场景：${selected.name || selected.id}`);
  };

  const generateDagFromIntent = (nodesFromBackend) => {
    const newNodes = [];
    const newEdges = [];

    nodesFromBackend.forEach((node, index) => {
      const id = node.id || `n${index + 1}`;
      const nodeType = (node.type || "MML").toUpperCase();
      const typeColor = {
        MML: "#1677ff",
        INSTRUMENT: "#722ed1",
        ASSERT: "#52c41a",
        DELAY: "#faad14",
      }[nodeType] || "#1677ff";

      const displayLabel = nodeType === "DELAY"
        ? `DELAY (${node.params?.seconds ?? "?"}s)`
        : node.command;

      newNodes.push({
        id,
        type: "customNode",
        position: { x: 100 + index * 180, y: 200 },
        data: {
          label: displayLabel,
          nodeType,
          command: node.command,
          params: node.params || {},
          status: "pending",
          color: typeColor,
        },
      });

      // ✅ 用 depends_on 生成边
      (node.depends_on || []).forEach((dep) => {
        newEdges.push({
          id: `e-${dep}-${id}`,
          source: dep,
          target: id,
        });
      });
    });

    setNodes(newNodes);
    setEdges(newEdges);
    setSelectedNode(null);
  };

  const runDAG = async () => {
    if (!nodes.length) return;

    setRunning(true);
    setLogs([]);

    for (let i = 0; i < nodes.length; i++) {
      const node = nodes[i];

      // ✅ 高亮当前节点
      updateNodeStatus(node.id, "running");
      setLogs((prev) => [...prev, `▶ 执行 ${node.id}`]);

      try {
        // ✅ 模拟执行（你以后可以换成后端调用）
        await new Promise((res) => setTimeout(res, 1000));

        updateNodeStatus(node.id, "success");
        setLogs((prev) => [...prev, `✅ ${node.id} 完成`]);

      } catch (e) {
        updateNodeStatus(node.id, "error");
        setLogs((prev) => [...prev, `❌ ${node.id} 失败`]);
        break;
      }
    }

    setRunning(false);
  };

  // ── 导出 AST JSON ─────────────────────────────────────
  const handleExport = () => {
    const ast = exportAST();
    const blob = new Blob([JSON.stringify(ast, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "ast.json";
    a.click();
    URL.revokeObjectURL(url);
    message.success("AST 已导出");
  };

  // ── 节点点击 → 打开配置面板 ────────────────────────────
  const onNodeClick = useCallback((_, node) => {
    setSelectedNode(node);
  }, []);

  const onPaneClick = useCallback(() => {
    setSelectedNode(null);
  }, []);

  // ── 状态徽章 ─────────────────────────────────────────
  const statusCounts = nodes.reduce((acc, n) => {
    acc[n.data.status] = (acc[n.data.status] || 0) + 1;
    return acc;
  }, {});

  return mode === "sandbox" ? (
    <Sandbox onExit={() => setMode("main")} />
  ) : (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
      {/* ── Toolbar ── */}
      <div
        style={{
          height: 52,
          background: "#fff",
          borderBottom: "1px solid #f0f0f0",
          display: "flex",
          alignItems: "center",
          padding: "0 16px",
          gap: 12,
          boxShadow: "0 1px 4px rgba(0,0,0,.06)",
        }}
      >
        <span style={{ fontWeight: 700, fontSize: 16, color: "#1677ff" }}>
          🛰 WirelessCodex DAG
        </span>

        <div style={{ flex: 1 }} />

        {/* 状态徽章 */}
        <Space size={4}>
          {statusCounts.running > 0 && <Badge status="processing" text={`运行中 ${statusCounts.running}`} />}
          {statusCounts.success > 0 && <Badge status="success" text={`完成 ${statusCounts.success}`} />}
          {statusCounts.failed > 0 && <Badge status="error" text={`失败 ${statusCounts.failed}`} />}
          {statusCounts.skipped > 0 && <Badge status="default" text={`跳过 ${statusCounts.skipped}`} />}
        </Space>

        <Space>
          <Tooltip title="导出 AST JSON">
            <Button icon={<ExportOutlined />} onClick={handleExport} />
          </Tooltip>
          <Button
            onClick={async () => {
              try {
                const res = await fetch("http://127.0.0.1:8000/handlers/reload", {
                  method: "POST",
                });
                const data = await res.json();
                if (res.ok) {
                  message.success(`执行器已热加载：${(data.types || []).join(", ")}`);
                } else {
                  message.error(data?.detail || "热加载失败");
                }
              } catch (e) {
                message.error("热加载失败");
              }
            }}
          >
            热加载执行器
          </Button>
          <Button onClick={() => setMode("sandbox")}>
            Sandbox
          </Button>
          <Button
            icon={<UnorderedListOutlined />}
            onClick={() => setLogsOpen(true)}
          >
            日志 {logs.length > 0 && <Tag color="blue" style={{ marginLeft: 4 }}>{logs.length}</Tag>}
          </Button>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => { resetStatus(); setLogs([]); }}
            disabled={running}
          >
            Reset
          </Button>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            loading={running}
            disabled={running}
            onClick={handleRun}
          >
            {running ? "Running..." : "Run DAG"}
          </Button>
        </Space>
      </div>

      {/* ── Intent 输入 ── */}
      <div
        style={{
          padding: "10px 16px",
          borderBottom: "1px solid #f0f0f0",
          background: "#fafafa",
          display: "flex",
          gap: 8,
        }}
      >
        <TextArea
          placeholder="例如：加一个UE，等2秒，检查attach"
          autoSize={{ minRows: 1, maxRows: 2 }}
          value={intentText}
          onChange={(e) => setIntentText(e.target.value)}
          style={{ flex: 1 }}
        />

        <Button
          type="primary"
          onClick={handleParseIntent}
        >
          解析
        </Button>

        <Select
          placeholder="选择默认场景"
          style={{ width: 220 }}
          value={selectedCaseId}
          onChange={(v) => setSelectedCaseId(v)}
          options={ddtCases.map((c) => ({
            label: c.name || c.id,
            value: c.id,
          }))}
        />
        <Button onClick={handleLoadCase}>
          加载场景
        </Button>
      </div>

      {/* ── Main ── */}
      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        {/* 左侧节点面板 */}
        <NodePalette />

        {/* 画布 */}
        <div ref={reactFlowWrapper} style={{ flex: 1, background: "#f7f8fa" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={NODE_TYPES}
            onNodesChange={onNodesChange}
            onEdgesChange={onEdgesChange}
            onConnect={onConnect}
            onDrop={onDrop}
            onDragOver={onDragOver}
            onInit={(inst) => { reactFlowInstance.current = inst; }}
            onNodeClick={onNodeClick}
            onPaneClick={onPaneClick}
            fitView
          >
            <Background gap={16} color="#e8e8e8" />
            <Controls />
            <MiniMap nodeColor={(n) => {
              const s = n.data?.status;
              return s === "done" ? "#52c41a"
                : s === "failed" ? "#ff4d4f"
                  : s === "running" ? "#faad14"
                    : s === "skipped" ? "#bfbfbf"
                      : "#d9d9d9";
            }} />
          </ReactFlow>
        </div>

        {/* 右侧配置面板 */}
        <NodeConfigPanel
          node={selectedNode}
          onUpdate={updateNodeData}
          onDuplicate={(node) => duplicateNode(node)}
          onDelete={(id) => { deleteNode(id); setSelectedNode(null); }}
          onClose={() => setSelectedNode(null)}
        />
      </div>

      {/* ── 日志抽屉 ── */}
      <Drawer
        title={`执行日志 (${logs.length})`}
        placement="bottom"
        size="large"             // ✅ 替换 height={300}
        open={logsOpen}
        onClose={() => setLogsOpen(false)}
      >
        <List
          size="small"
          dataSource={[...logs].reverse()}
          renderItem={(item) => {
            const color = item.status === "done" ? "success"
              : item.status === "failed" ? "error"
                : item.status === "running" ? "processing"
                  : item.status === "skipped" ? "default"
                    : "blue";
            return (
              <List.Item style={{ padding: "3px 0" }}>
                <Space>
                  <Text type="secondary" style={{ fontSize: 11 }}>{item.time}</Text>
                  <Tag color={color} style={{ fontSize: 11 }}>{item.node}</Tag>
                  <Text style={{ fontSize: 12 }}>
                    {item.msg || item.status}
                  </Text>
                  {item.duration && (
                    <Text type="secondary" style={{ fontSize: 11 }}>
                      {item.duration}ms
                    </Text>
                  )}
                </Space>
              </List.Item>
            );
          }}
        />
      </Drawer>
    </div>
  );
}
