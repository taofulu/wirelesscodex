import React, { useState, useEffect } from "react";
import {
    Drawer, Form, Input, Button, Select,
    Space, Typography, Divider, Tag, Empty,
} from "antd";
import { DeleteOutlined, PlusOutlined, CopyOutlined } from "@ant-design/icons";

const { Text, Title } = Typography;
const { Option } = Select;

const MML_COMMANDS = ["ADD_UE", "DEL_UE", "MOD_UE", "SHOW_UE", "RST_BRD", "UPGRADE_VERSION"];
const INSTR_COMMANDS = [
    "SET_POWER", "SET_FREQ", "SET_BW", "GET_MEASURE",
    "PLAY_SCENARIO", "STOP_SCENARIO",
    "START_TRACKING", "STOP_TRACKING",
    "START_GUI_LOG", "STOP_GUI_LOG"
];
const ASSERT_COMMANDS = ["CHECK_ATTACH", "CHECK_POWER", "CHECK_PING", "CHECK_RSRP", "STATUS_CODE_ASSERTION"];
const DELAY_COMMANDS = ["DELAY"];

const COMMANDS_MAP = {
    MML: MML_COMMANDS,
    INSTRUMENT: INSTR_COMMANDS,
    ASSERT: ASSERT_COMMANDS,
    DELAY: DELAY_COMMANDS,
};

export default function NodeConfigPanel({ node, onUpdate, onDelete, onClose, onDuplicate }) {
    const [form] = Form.useForm();
    const [params, setParams] = useState({});

    useEffect(() => {
        if (node) {
            form.setFieldsValue({
                command: node.data.command,
                label: node.data.label,
            });
            setParams(node.data.params || {});
        }
    }, [node, form]);

    if (!node) {
        return (
            <div style={{ width: 280, padding: 24, borderLeft: "1px solid #f0f0f0" }}>
                <Empty description="点击节点进行配置" image={Empty.PRESENTED_IMAGE_SIMPLE} />
            </div>
        );
    }

    const nodeType = node.data.nodeType;
    const commands = COMMANDS_MAP[nodeType] || [];
    const commandOptions = commands.includes(node.data.command)
        ? commands
        : [node.data.command, ...commands].filter(Boolean);

    const handleSave = () => {
        const values = form.getFieldsValue();
        onUpdate(node.id, {
            command: values.command,
            label: values.label || values.command,
            params,
        });
    };

    const addParam = () => {
        setParams((prev) => ({ ...prev, [`param_${Date.now()}`]: "" }));
    };

    const updateParamKey = (oldKey, newKey) => {
        const val = params[oldKey];
        const next = { ...params };
        delete next[oldKey];
        next[newKey] = val;
        setParams(next);
    };

    const updateParamVal = (key, val) => {
        setParams((prev) => ({ ...prev, [key]: val }));
    };

    const deleteParam = (key) => {
        const next = { ...params };
        delete next[key];
        setParams(next);
    };

    const TYPE_COLOR = {
        MML: "blue", INSTRUMENT: "purple", ASSERT: "green",
    };

    return (
        <div
            style={{
                width: 280,
                padding: 16,
                borderLeft: "1px solid #f0f0f0",
                overflowY: "auto",
                background: "#fff",
            }}
        >
            <Space orientation="vertical" style={{ width: "100%" }}>
                {/* 标题 */}
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                    <Space>
                        <Tag color={TYPE_COLOR[nodeType]}>{nodeType}</Tag>
                        <Text strong style={{ fontSize: 13 }}>{node.id}</Text>
                    </Space>
                    <Space size={4}>
                        <Button
                            size="small"
                            icon={<CopyOutlined />}
                            onClick={() => onDuplicate?.(node)}
                        />
                        <Button
                            size="small"
                            danger
                            icon={<DeleteOutlined />}
                            onClick={() => onDelete(node.id)}
                        />
                    </Space>
                </div>

                <Divider style={{ margin: "8px 0" }} />

                <Form form={form} layout="vertical" size="small">
                    {/* 显示名称 */}
                    <Form.Item label="显示名称" name="label">
                        <Input placeholder={node.data.command} />
                    </Form.Item>

                    {/* 命令选择 */}
                    <Form.Item label="命令" name="command" rules={[{ required: true }]}>
                        <Select placeholder="选择命令">
                            {commandOptions.map((c) => (
                                <Option key={c} value={c}>{c}</Option>
                            ))}
                        </Select>
                    </Form.Item>
                </Form>

                {/* 参数列表 */}
                <div>
                    <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                        <Text type="secondary" style={{ fontSize: 12 }}>参数</Text>
                        <Button size="small" icon={<PlusOutlined />} onClick={addParam}>
                            添加
                        </Button>
                    </div>

                    <Space orientation="vertical" style={{ width: "100%" }}>
                        {Object.entries(params).map(([k, v]) => (
                            <Space key={k} style={{ width: "100%" }}>
                                <Input
                                    size="small"
                                    style={{ width: 90 }}
                                    value={k}
                                    onChange={(e) => updateParamKey(k, e.target.value)}
                                    placeholder="参数名"
                                />
                                <Input
                                    size="small"
                                    style={{ width: 90 }}
                                    value={v}
                                    onChange={(e) => updateParamVal(k, e.target.value)}
                                    placeholder="值"
                                />
                                <Button
                                    size="small"
                                    danger
                                    icon={<DeleteOutlined />}
                                    onClick={() => deleteParam(k)}
                                />
                            </Space>
                        ))}
                    </Space>
                </div>

                <Divider style={{ margin: "8px 0" }} />

                {/* 保存按钮 */}
                <Button type="primary" block onClick={handleSave}>
                    保存配置
                </Button>
            </Space>
        </div>
    );
}
