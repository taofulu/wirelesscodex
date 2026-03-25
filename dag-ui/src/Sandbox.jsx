import React, { useState, useRef, useEffect } from "react";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import "reactflow/dist/style.css";

import { Button, Space, Badge, Typography, message, Select, Input, Drawer, List, Tag } from "antd";
import { PlayCircleOutlined, ArrowLeftOutlined, ReloadOutlined, ExportOutlined } from "@ant-design/icons";

import NodePalette from "./components/NodePalette";
import NodeConfigPanel from "./components/NodeConfigPanel";
import useASTEditor from "./hooks/useASTEditor";
import { NODE_TYPES } from "./nodeTypes";

// ✅ 直接在组件外部定义
const nodeTypes = NODE_TYPES;

const { Text } = Typography;


const INIT_NODES = [
  {
    id: "n1",
    type: "customNode",
    position: { x: 80, y: 180 },
    data: {
      label: "ADD_UE",
      nodeType: "MML",
      command: "ADD_UE",
      params: { ue_id: "1" },
      status: "pending",
      color: "#1677ff",
    },
  },
  {
    id: "n2",
    type: "customNode",
    position: { x: 340, y: 180 },
    data: {
      label: "DELAY (2s)",
      nodeType: "DELAY",
      command: "DELAY",
      params: { seconds: 2 },
      status: "pending",
      color: "#faad14",
    },
  },
  {
    id: "n3",
    type: "customNode",
    position: { x: 600, y: 180 },
    data: {
      label: "CHECK_ATTACH",
      nodeType: "ASSERT",
      command: "CHECK_ATTACH",
      params: {},
      status: "pending",
      color: "#52c41a",
    },
  },
];

const INIT_EDGES = [
  { id: "e1-2", source: "n1", target: "n2", animated: false, style: { stroke: "#b1b1b7" } },
  { id: "e2-3", source: "n2", target: "n3", animated: false, style: { stroke: "#b1b1b7" } },
];

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

export default function Sandbox({ onExit }) {
  const {
    nodes, edges, setNodes, setEdges,
    onNodesChange, onEdgesChange,
    onConnect, onDrop, onDragOver,
    reactFlowWrapper, reactFlowInstance,
    updateNodeData, deleteNode, duplicateNode,
    resetStatus, updateNodeStatus,
  } = useASTEditor(INIT_NODES, INIT_EDGES);

  const [running, setRunning] = useState(false);
  const [selectedNode, setSelectedNode] = useState(null);
  const [ddtCases, setDdtCases] = useState([]);
  const [selectedCaseId, setSelectedCaseId] = useState(null);
  const [apiLibrary, setApiLibrary] = useState([]);
  const [selectedApis, setSelectedApis] = useState([]);
  const [bulkApi, setBulkApi] = useState(null);
  const [bulkKey, setBulkKey] = useState("");
  const [bulkValue, setBulkValue] = useState("");
  const [selectedTargets, setSelectedTargets] = useState([]);
  const [diffOpen, setDiffOpen] = useState(false);
  const [diffItems, setDiffItems] = useState([]);
  const [lastSnapshot, setLastSnapshot] = useState(null);
  const [rangeStart, setRangeStart] = useState(null);
  const [rangeEnd, setRangeEnd] = useState(null);
  const [intentText, setIntentText] = useState("");
  const [intentSuggestions, setIntentSuggestions] = useState([]);
  const [focusIds, setFocusIds] = useState([]);
  const nodeStartRef = useRef({});

  const normalize = (s) => String(s || "").trim().toLowerCase();
  const apiSet = new Set(apiLibrary.map((a) => normalize(a.componentName)));
  const markApiStatus = (nodeList) =>
    nodeList.map((n) => {
      const cmd = normalize(n.data?.command);
      if (!cmd) return n;
      const apiStatus = apiSet.has(cmd) ? "ok" : "missing";
      return { ...n, data: { ...n.data, api_status: apiStatus } };
    });

  const exportTaskJson = () => {
    const dependsMap = {};
    nodes.forEach((n) => { dependsMap[n.id] = []; });
    edges.forEach((e) => {
      if (dependsMap[e.target]) dependsMap[e.target].push(e.source);
    });

    const objects = [
      { object_id: "ran", object_type: "RAN_CONTROLLER" },
      { object_id: "timer", object_type: "TIMER" },
    ];

    const steps = nodes.map((n) => {
      const nodeType = n.data?.nodeType;
      const isDelay = nodeType === "DELAY";
      return {
        step_id: n.id,
        object_id: isDelay ? "timer" : "ran",
        componentName: isDelay ? "delay" : (n.data?.command || "").toLowerCase(),
        data: n.data?.params || {},
        depends_on: dependsMap[n.id] || [],
      };
    });

    const task = {
      case_metadata: {
        name: "Sandbox_Task",
        version: "1.0",
        author: "Sandbox",
        description: "Exported from Sandbox",
      },
      objects,
      activities: {
        setup: [],
        process: steps,
        teardown: [],
      },
    };

    const blob = new Blob([JSON.stringify(task, null, 2)], { type: "application/json" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "task.json";
    a.click();
    URL.revokeObjectURL(url);
    message.success("已导出 task.json");
  };

  const saveToDefaultDataset = async () => {
    const dependsMap = {};
    nodes.forEach((n) => { dependsMap[n.id] = []; });
    edges.forEach((e) => {
      if (dependsMap[e.target]) dependsMap[e.target].push(e.source);
    });

    const objects = [
      { object_id: "ran", object_type: "RAN_CONTROLLER" },
      { object_id: "timer", object_type: "TIMER" },
    ];

    const steps = nodes.map((n) => {
      const nodeType = n.data?.nodeType;
      const isDelay = nodeType === "DELAY";
      return {
        step_id: n.id,
        object_id: isDelay ? "timer" : "ran",
        componentName: isDelay ? "delay" : (n.data?.command || "").toLowerCase(),
        data: n.data?.params || {},
        depends_on: dependsMap[n.id] || [],
      };
    });

    const caseName = selectedCaseId || "Sandbox_Task";
    const task = {
      case_metadata: {
        name: caseName,
        version: "1.0",
        author: "Sandbox",
        description: "Saved from Sandbox",
      },
      objects,
      activities: {
        setup: [],
        process: steps,
        teardown: [],
      },
    };

    try {
      const res = await fetch("http://127.0.0.1:8000/ddt/cases", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ case: task }),
      });
      const data = await res.json();
      if (!res.ok) {
        message.error(data?.detail || "保存失败");
        return;
      }
      message.success(`已保存场景：${data.name}`);
      setSelectedCaseId(data.name);
      // refresh cases
      const list = await fetch("http://127.0.0.1:8000/ddt/cases");
      const listData = await list.json();
      if (list.ok) setDdtCases(listData.cases || []);
    } catch (e) {
      message.error("保存失败");
    }
  };

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
    const loadApis = async () => {
      try {
        const res = await fetch("http://127.0.0.1:8000/api-library");
        const data = await res.json();
        if (res.ok) {
          setApiLibrary(data.apis || []);
        }
      } catch (e) {
        // ignore
      }
    };
    loadCases();
    loadApis();
  }, []);

  useEffect(() => {
    if (!apiLibrary.length) return;
    setNodes((prev) => markApiStatus(prev));
  }, [apiLibrary]);

  const runLocal = async () => {
    if (!nodes.length) {
      message.warning("没有可运行节点");
      return;
    }
    setRunning(true);
    resetStatus();

    const indegree = {};
    const downstream = {};
    nodes.forEach((n) => {
      indegree[n.id] = 0;
      downstream[n.id] = [];
    });
    edges.forEach((e) => {
      indegree[e.target] += 1;
      downstream[e.source].push(e.target);
    });

    const queue = Object.keys(indegree).filter((id) => indegree[id] === 0);

    while (queue.length > 0) {
      const nodeId = queue.shift();
      const node = nodes.find((n) => n.id === nodeId);
      if (!node) continue;

      nodeStartRef.current[nodeId] = Date.now();
      updateNodeStatus(nodeId, "running");

      if (node.data.nodeType === "DELAY") {
        const seconds = Number(node.data.params?.seconds || 1);
        await sleep(seconds * 1000);
      } else {
        await sleep(400);
      }

      const duration = Date.now() - nodeStartRef.current[nodeId];
      updateNodeStatus(nodeId, "success", { duration });

      downstream[nodeId].forEach((next) => {
        indegree[next] -= 1;
        if (indegree[next] === 0) queue.push(next);
      });
    }

    setRunning(false);
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

      (node.depends_on || []).forEach((dep) => {
        newEdges.push({
          id: `e-${dep}-${id}`,
          source: dep,
          target: id,
        });
      });
    });

    setNodes(markApiStatus(newNodes));
    setEdges(newEdges);
    setSelectedNode(null);
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

  const applyBulkParam = (targets) => {
    if (!bulkApi || !bulkKey) {
      message.warning("请选择 API 并填写参数名");
      return;
    }
    const targetCommand = bulkApi.toUpperCase();
    const candidates = nodes.filter(
      (n) => (n.data?.command || "").toUpperCase() === targetCommand
    );
    if (!candidates.length) {
      message.warning("未找到匹配的节点");
      return;
    }
    if (!targets.length) {
      message.warning("请先选择要修改的节点");
      return;
    }

    const isPrompt = typeof bulkValue === "string" && bulkValue.trim().startsWith("PROMPT:");
    targets.forEach((node) => {
      const nextParams = { ...(node.data?.params || {}) };
      nextParams[bulkKey] = bulkValue;
      const nextPrompts = { ...(node.data?.param_prompts || {}) };
      if (isPrompt) {
        nextPrompts[bulkKey] = bulkValue.trim().replace(/^PROMPT:\s*/i, "");
      } else {
        delete nextPrompts[bulkKey];
      }

      let nextLabel = node.data?.label;
      if ((node.data?.nodeType || "").toUpperCase() === "DELAY" && bulkKey === "seconds") {
        nextLabel = `DELAY (${bulkValue}s)`;
      } else if (!nextLabel || nextLabel === node.data?.command) {
        nextLabel = node.data?.command;
      }

      updateNodeData(node.id, { params: nextParams, param_prompts: nextPrompts, label: nextLabel });
    });

    message.success("参数已批量更新");
  };

  const generateParamsByLLM = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/ai/fill-params", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ nodes }),
      });
      const data = await res.json();
      if (!res.ok) {
        message.error(data?.detail || "生成参数失败");
        return;
      }
      const nextNodes = data.nodes || [];
      if (!nextNodes.length) {
        message.warning("未生成任何参数");
        return;
      }
      setNodes(nextNodes);
      message.success("参数已生成");
    } catch (e) {
      message.error("生成参数失败");
    }
  };

  const handleSyncApiLibrary = async () => {
    try {
      const res = await fetch("http://127.0.0.1:8000/api-library/sync", {
        method: "POST",
      });
      const data = await res.json();
      if (!res.ok) {
        message.error(data?.detail || "同步 API 库失败");
        return;
      }
      const list = await fetch("http://127.0.0.1:8000/api-library");
      const listData = await list.json();
      if (list.ok) setApiLibrary(listData.apis || []);
      message.success(`已同步 API 库（${data.count}）`);
    } catch (e) {
      message.error("同步 API 库失败");
    }
  };

  const buildSequenceFromApis = () => {
    if (!selectedApis.length) {
      message.warning("请选择 API");
      return;
    }
    const newNodes = [];
    const newEdges = [];
    selectedApis.forEach((apiName, idx) => {
      const api = apiLibrary.find((a) => a.componentName === apiName);
      const id = `api_${idx + 1}`;
      const nodeType = (api?.type || "INSTRUMENT").toUpperCase();
      const typeColor = {
        MML: "#1677ff",
        INSTRUMENT: "#722ed1",
        ASSERT: "#52c41a",
        DELAY: "#faad14",
      }[nodeType] || "#1677ff";

      const params = api?.data || {};
      const command = (api?.componentName || "STEP").toUpperCase();
      const displayLabel = nodeType === "DELAY"
        ? `DELAY (${params?.seconds ?? "?"}s)`
        : command;

      newNodes.push({
        id,
        type: "customNode",
        position: { x: 100 + idx * 180, y: 200 },
        data: {
          label: displayLabel,
          nodeType,
          command,
          params,
          status: "pending",
          color: typeColor,
        },
      });

      if (idx > 0) {
        newEdges.push({
          id: `e-${newNodes[idx - 1].id}-${id}`,
          source: newNodes[idx - 1].id,
          target: id,
        });
      }
    });
    setNodes(markApiStatus(newNodes));
    setEdges(newEdges);
    setSelectedNode(null);
  };

  const candidateNodes = nodes.filter(
    (n) => (n.data?.command || "").toUpperCase() === (bulkApi || "").toUpperCase()
  );

  const topoOrder = () => {
    const indeg = {};
    const adj = {};
    nodes.forEach((n) => {
      indeg[n.id] = 0;
      adj[n.id] = [];
    });
    edges.forEach((e) => {
      if (indeg[e.target] != null) indeg[e.target] += 1;
      if (adj[e.source]) adj[e.source].push(e.target);
    });
    const queue = Object.keys(indeg).filter((id) => indeg[id] === 0);
    const order = [];
    while (queue.length) {
      const id = queue.shift();
      order.push(id);
      (adj[id] || []).forEach((nxt) => {
        indeg[nxt] -= 1;
        if (indeg[nxt] === 0) queue.push(nxt);
      });
    }
    return order.length ? order : nodes.map((n) => n.id);
  };

  const order = topoOrder();
  const candidateOptions = candidateNodes
    .sort((a, b) => order.indexOf(a.id) - order.indexOf(b.id))
    .map((n, idx) => ({
      label: `#${idx + 1} ${n.id} (${n.data?.command || ""})`,
      value: n.id,
    }));

  const applyRangeSelect = () => {
    if (!rangeStart || !rangeEnd) {
      message.warning("请选择起止节点");
      return;
    }
    const startIdx = order.indexOf(rangeStart);
    const endIdx = order.indexOf(rangeEnd);
    if (startIdx < 0 || endIdx < 0) {
      message.warning("起止节点不在当前拓扑中");
      return;
    }
    const [s, e] = startIdx <= endIdx ? [startIdx, endIdx] : [endIdx, startIdx];
    const slice = order.slice(s, e + 1);
    const filtered = slice.filter((id) =>
      candidateNodes.some((n) => n.id === id)
    );
    setSelectedTargets(filtered);
  };

  useEffect(() => {
    const ids = focusIds.length ? focusIds : selectedTargets;
    if (!ids.length) {
      setNodes((prev) =>
        prev.map((n) => ({
          ...n,
          data: { ...n.data, dimmed: false },
        }))
      );
      return;
    }
    setNodes((prev) =>
      prev.map((n) => ({
        ...n,
        data: { ...n.data, dimmed: !ids.includes(n.id) },
      }))
    );
  }, [selectedTargets, focusIds, setNodes]);

  const previewDiff = () => {
    if (!bulkApi || !bulkKey) {
      message.warning("请选择 API 并填写参数名");
      return;
    }
    if (!selectedTargets.length) {
      message.warning("请选择要修改的节点");
      return;
    }
    const diffs = selectedTargets.map((id) => {
      const node = nodes.find((n) => n.id === id);
      const from = node?.data?.params?.[bulkKey];
      return { id, from, to: bulkValue };
    });
    setDiffItems(diffs);
    setDiffOpen(true);
  };

  const buildIntentSuggestions = () => {
    const text = normalize(intentText);
    if (!text) {
      message.warning("请输入意图");
      return;
    }
    const ordered = order;
    const ranked = nodes
      .map((n) => {
        const cmd = normalize(n.data?.command);
        const label = normalize(n.data?.label);
        const hit = text && (cmd.includes(text) || label.includes(text));
        const score = hit ? 10 : 0;
        return {
          id: n.id,
          command: n.data?.command || "",
          label: n.data?.label || n.id,
          index: ordered.indexOf(n.id),
          reason: hit ? "匹配命令/名称" : "按拓扑层级推荐",
          score,
        };
      })
      .sort((a, b) => {
        if (b.score !== a.score) return b.score - a.score;
        return a.index - b.index;
      })
      .slice(0, 6);
    setIntentSuggestions(ranked);
    setFocusIds(ranked.map((r) => r.id));
  };

  const clearIntentFocus = () => {
    setFocusIds([]);
    setIntentSuggestions([]);
  };

  const confirmApply = () => {
    if (!lastSnapshot) {
      setLastSnapshot(nodes.map((n) => ({ ...n, data: { ...n.data } })));
    }
    const targets = selectedTargets
      .map((id) => nodes.find((n) => n.id === id))
      .filter(Boolean);
    applyBulkParam(targets);
    setDiffOpen(false);
  };

  const rollbackChanges = () => {
    if (!lastSnapshot) {
      message.warning("没有可回退的修改");
      return;
    }
    setNodes(lastSnapshot);
    setLastSnapshot(null);
    setSelectedTargets([]);
    setDiffOpen(false);
    message.success("已回退");
  };

  const handleUpdateNode = (nodeId, newData) => {
    const current = nodes.find((n) => n.id === nodeId);
    const nodeType = (newData.nodeType || current?.data?.nodeType || "").toUpperCase();
    const params = newData.params ?? current?.data?.params ?? {};
    const command = newData.command ?? current?.data?.command ?? "";
    const oldLabel = current?.data?.label;
    const oldCommand = current?.data?.command;

    if (nodeType === "DELAY") {
      const seconds = params?.seconds ?? "?";
      newData = { ...newData, label: `DELAY (${seconds}s)` };
    } else if (command && (oldLabel === oldCommand || !oldLabel)) {
      newData = { ...newData, label: command };
    }
    const apiStatus = apiSet.has(normalize(command)) ? "ok" : "missing";
    updateNodeData(nodeId, { ...newData, api_status: apiStatus });
  };

  const onNodeClick = (_, node) => setSelectedNode(node);
  const onPaneClick = () => setSelectedNode(null);

  const statusCounts = nodes.reduce((acc, n) => {
    acc[n.data.status] = (acc[n.data.status] || 0) + 1;
    return acc;
  }, {});

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100vh" }}>
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
        <Button icon={<ArrowLeftOutlined />} onClick={onExit}>
          返回
        </Button>
        <span style={{ fontWeight: 700, fontSize: 16, color: "#1677ff" }}>
          Sandbox
        </span>

        <div style={{ flex: 1 }} />

        <Space size={4}>
          {statusCounts.running > 0 && <Badge status="processing" text={`运行中 ${statusCounts.running}`} />}
          {statusCounts.success > 0 && <Badge status="success" text={`完成 ${statusCounts.success}`} />}
          {statusCounts.failed > 0 && <Badge status="error" text={`失败 ${statusCounts.failed}`} />}
          {statusCounts.skipped > 0 && <Badge status="default" text={`跳过 ${statusCounts.skipped}`} />}
        </Space>

        <Space>
          <Button
            icon={<ReloadOutlined />}
            onClick={() => resetStatus()}
            disabled={running}
          >
            Reset
          </Button>
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
          <Button icon={<ExportOutlined />} onClick={exportTaskJson}>
            导出 task.json
          </Button>
          <Button onClick={saveToDefaultDataset}>
            保存到默认场景
          </Button>
          <Select
            placeholder="选择默认场景"
            style={{ width: 200 }}
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
          <Select
            mode="multiple"
            allowClear
            placeholder="选择 API 组合"
            style={{ width: 280 }}
            value={selectedApis}
            onChange={(v) => setSelectedApis(v)}
            options={apiLibrary.map((a) => ({
              label: a.componentName,
              value: a.componentName,
            }))}
          />
          <Button onClick={buildSequenceFromApis}>
            生成时序
          </Button>
          <Button onClick={handleSyncApiLibrary}>
            同步API库
          </Button>
          <Button
            type="primary"
            icon={<PlayCircleOutlined />}
            loading={running}
            disabled={running}
            onClick={runLocal}
          >
            {running ? "Running..." : "Run Local"}
          </Button>
        </Space>
      </div>

      <div style={{ flex: 1, display: "flex", overflow: "hidden" }}>
        <NodePalette />

        <div ref={reactFlowWrapper} style={{ flex: 1, background: "#f7f8fa" }}>
          <ReactFlow
            nodes={nodes}
            edges={edges}
            nodeTypes={nodeTypes}
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
              return s === "success" ? "#52c41a"
                : s === "failed" ? "#ff4d4f"
                  : s === "running" ? "#faad14"
                    : s === "skipped" ? "#bfbfbf"
                      : "#d9d9d9";
            }} />
          </ReactFlow>
        </div>

        <NodeConfigPanel
          node={selectedNode}
          onUpdate={handleUpdateNode}
          onDuplicate={(node) => duplicateNode(node)}
          onDelete={(id) => { deleteNode(id); setSelectedNode(null); }}
          onClose={() => setSelectedNode(null)}
        />
      </div>
      <div style={{ padding: "8px 16px", background: "#fff", borderTop: "1px solid #f0f0f0" }}>
        <Space wrap>
          <Text type="secondary" style={{ fontSize: 12 }}>批量改参：</Text>
          <Select
            placeholder="选择 API"
            style={{ width: 180 }}
            value={bulkApi}
            onChange={(v) => {
              setBulkApi(v);
              setSelectedTargets([]);
            }}
            options={[...new Set(nodes.map((n) => n.data?.command).filter(Boolean))].map((c) => ({
              label: c,
              value: c,
            }))}
          />
          <Select
            mode="multiple"
            allowClear
            placeholder="选择节点(支持多选)"
            style={{ width: 260 }}
            value={selectedTargets}
            onChange={(v) => setSelectedTargets(v)}
            options={candidateOptions}
            showSearch
            filterOption={(input, option) =>
              (option?.label || "").toLowerCase().includes(input.toLowerCase())
            }
          />
          <Select
            placeholder="起点"
            style={{ width: 140 }}
            value={rangeStart}
            onChange={(v) => setRangeStart(v)}
            options={candidateOptions}
            showSearch
          />
          <Select
            placeholder="终点"
            style={{ width: 140 }}
            value={rangeEnd}
            onChange={(v) => setRangeEnd(v)}
            options={candidateOptions}
            showSearch
          />
          <Button onClick={applyRangeSelect}>选择范围</Button>
          <Input
            placeholder="参数名"
            style={{ width: 140 }}
            value={bulkKey}
            onChange={(e) => setBulkKey(e.target.value)}
          />
          <Input
            placeholder="参数值（可写 PROMPT:xxx）"
            style={{ width: 200 }}
            value={bulkValue}
            onChange={(e) => setBulkValue(e.target.value)}
          />
          <Button onClick={previewDiff}>预览</Button>
          <Button onClick={generateParamsByLLM}>生成参数</Button>
          <Button onClick={rollbackChanges}>回退</Button>
        </Space>
      </div>
      <div style={{ padding: "8px 16px", background: "#fff", borderTop: "1px solid #f0f0f0" }}>
        <Space wrap>
          <Text type="secondary" style={{ fontSize: 12 }}>意图定位：</Text>
          <Input
            placeholder="例如：升级版本后插入检查"
            style={{ width: 260 }}
            value={intentText}
            onChange={(e) => setIntentText(e.target.value)}
          />
          <Button onClick={buildIntentSuggestions}>生成候选</Button>
          <Button onClick={clearIntentFocus}>清除候选</Button>
        </Space>
        {intentSuggestions.length > 0 && (
          <List
            size="small"
            style={{ marginTop: 6 }}
            dataSource={intentSuggestions}
            renderItem={(item) => (
              <List.Item>
                <Space>
                  <Tag color="blue">{item.id}</Tag>
                  <Text>建议放在该节点之后</Text>
                  <Text type="secondary">({item.reason} / 层级 {item.index})</Text>
                  <Button
                    size="small"
                    onClick={() => {
                      setSelectedNode(nodes.find((n) => n.id === item.id) || null);
                      setFocusIds([item.id]);
                    }}
                  >
                    定位
                  </Button>
                </Space>
              </List.Item>
            )}
          />
        )}
      </div>
      <div style={{ padding: "6px 16px", background: "#fafafa", borderTop: "1px solid #f0f0f0" }}>
        <Text type="secondary" style={{ fontSize: 12 }}>
          Sandbox 仅本地模拟，不触发后端执行。
        </Text>
      </div>

      <Drawer
        title="修改预览"
        placement="right"
        open={diffOpen}
        onClose={() => setDiffOpen(false)}
        width={360}
        footer={
          <Space>
            <Button onClick={() => setDiffOpen(false)}>取消</Button>
            <Button type="primary" onClick={confirmApply}>确认应用</Button>
          </Space>
        }
      >
        <List
          size="small"
          dataSource={diffItems}
          renderItem={(item) => (
            <List.Item>
              <Space>
                <Tag color="blue">{item.id}</Tag>
                <Text>{bulkKey}: {String(item.from ?? "")} → {String(item.to ?? "")}</Text>
              </Space>
            </List.Item>
          )}
        />
      </Drawer>
    </div>
  );
}
