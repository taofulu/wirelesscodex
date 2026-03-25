Write-Host "Initializing WirelessCodex Project..."

# 创建目录
$dirs = @(
    "core/ast",
    "core/dag",
    "core/planner",
    "core/validator",
    "core/runtime",
    "api",
    "ui",
    "tests",
    "docs",
    "scripts"
)

foreach ($dir in $dirs) {
    New-Item -ItemType Directory -Force -Path $dir | Out-Null
}

# 创建基础文件
$files = @(
    "core/ast/models.py",
    "core/ast/builder.py",
    "core/dag/engine.py",
    "core/dag/executor.py",
    "core/dag/state.py",
    "core/planner/planner.py",
    "core/validator/validator.py",
    "core/runtime/context.py",
    "api/server.py",
    "api/ws.py",
    "tests/test_dag.py",
    "tests/test_ast.py",
    "docs/spec.md",
    "docs/tasks.md",
    "docs/execution.md",
    "main.py",
    "requirements.txt",
    ".gitignore"
)

foreach ($file in $files) {
    New-Item -ItemType File -Force -Path $file | Out-Null
}

Write-Host "✅ Project structure created."