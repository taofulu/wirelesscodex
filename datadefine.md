# task.json 数据定义（最新）

本文件定义 **task.json** 的规范格式，作为执行引擎可直接消费的最终表达。

## 1. 顶层结构
- **`case_metadata`**：用例元数据（名称/版本/作者/描述）
- **`objects`**：执行资源对象声明（如 API 客户端、数据库连接、RAN 控制器等）
- **`activities`**：执行流程，分为 `setup` / `process` / `teardown`

## 2. objects 定义
`objects` 是对象数组，每个对象是组件执行的载体。
- **`object_id`** *(string, required)*：对象唯一 ID，供步骤引用
- **`object_type`** *(string, required)*：对象类型（如 `HTTP_CLIENT`、`DB_CONNECTOR`、`RAN_CONTROLLER`、`TIMER`、`todo`）

**示例**
```json
{
  "objects": [
    { "object_id": "api_client", "object_type": "HTTP_CLIENT" },
    { "object_id": "db_conn", "object_type": "DB_CONNECTOR" }
  ]
}
```

## 3. activities 行为编排
`activities` 包含三个阶段：
- **`setup`**：前置准备（初始化、预清理）
- **`process`**：核心测试逻辑（主要步骤）
- **`teardown`**：后置清理（释放资源、关闭连接）

每个阶段由 **步骤节点（Step）** 组成。

## 4. Step 节点定义
字段如下：
- **`step_id`** *(string, required)*：步骤唯一 ID
- **`object_id`** *(string, required)*：引用 `objects` 中对象 ID
- **`componentName`** *(string, required)*：组件/方法名（执行引擎调用）
- **`data`** *(object, optional)*：参数
- **`description`** *(string, optional)*：可读性描述

**示例**
```json
{
  "step_id": "post_request_1",
  "object_id": "api_client",
  "componentName": "post_request",
  "data": {
    "url": "https://api.example.com/users",
    "json": { "name": "test" }
  },
  "description": "发送一个 POST 请求创建用户"
}
```

## 5. 数据引用语法
支持 `${step_id.output_key}` 动态引用上游步骤输出。
执行引擎运行时会自动解析并注入数据。

**示例**
```json
{
  "data": {
    "user_id": "${post_request_1.data.id}"
  }
}
```

## 6. 完整示例（严格结构）
```json
{
  "case_metadata": {
    "name": "API 接口测试_20260324173735",
    "version": "1.0",
    "author": "AutoGenerator",
    "description": "Generated task.json for API 接口测试"
  },
  "objects": [
    { "object_id": "obj_1", "object_type": "todo" },
    { "object_id": "obj_2", "object_type": "todo" },
    { "object_id": "obj_3", "object_type": "todo" }
  ],
  "activities": {
    "setup": [],
    "process": [
      {
        "step_id": "connection_check_1",
        "object_id": "obj_1",
        "componentName": "connection_check",
        "data": {},
        "description": "Always-on component: connection_check"
      },
      {
        "step_id": "post_request_1",
        "object_id": "obj_2",
        "componentName": "post_request",
        "data": {
          "url": "/api/users",
          "json": "JSON Body",
          "auth": "No Auth"
        },
        "description": "Step for 请求方法: POST"
      }
    ],
    "teardown": [
      {
        "step_id": "status_code_assertion_1",
        "object_id": "obj_3",
        "componentName": "status_code_assertion",
        "data": {
          "expected_code": ">=400"
        },
        "description": "Step for 接口分析方法: 报错"
      }
    ]
  }
}
```

## 7. 兼容说明
当前执行引擎兼容旧字段 `objects_id / objects_type`，但 **标准格式以 `object_id / object_type` 为准**。

## 8. 沙盒导出规则
前端沙盒导出 `task.json` 时遵循以下约定：
- `DELAY` 节点：
  - `object_id`: `timer`
  - `componentName`: `delay`
  - `data.seconds`: 延迟秒数
- 其他节点：
  - `object_id`: `ran`
  - `componentName`: `command` 的小写形式

沙盒导出仅用于本地验证与快速组装，不影响后端接口规范。
