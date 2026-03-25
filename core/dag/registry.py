from __future__ import annotations

from typing import Callable, Awaitable, Dict, Any
import importlib
import pkgutil


Handler = Callable[[Any, Any], Awaitable[None]]
_REGISTRY: Dict[str, Handler] = {}
_LOADED_MODULES: set[str] = set()


def _normalize(node_type: Any) -> str:
    if hasattr(node_type, "value"):
        return str(node_type.value).upper()
    return str(node_type).upper()


def register(node_type: Any):
    """
    注册节点执行处理器。

    handler 签名：
      async def handler(node, dag_run): ...
    """
    def wrapper(fn: Handler):
        _REGISTRY[_normalize(node_type)] = fn
        return fn
    return wrapper


def get_handler(node_type: Any) -> Handler | None:
    return _REGISTRY.get(_normalize(node_type))


def registered_types() -> list[str]:
    return sorted(_REGISTRY.keys())


def clear_registry():
    _REGISTRY.clear()


def auto_discover(package: str = "core.execution.handlers", reload: bool = False):
    """
    自动发现并导入 handlers 子模块，触发 register 装饰器注册。
    """
    try:
        pkg = importlib.import_module(package)
    except Exception:
        return

    for _, modname, _ in pkgutil.iter_modules(pkg.__path__, package + "."):
        try:
            if reload and modname in _LOADED_MODULES:
                importlib.reload(importlib.import_module(modname))
            else:
                importlib.import_module(modname)
            _LOADED_MODULES.add(modname)
        except Exception:
            # 不阻断主流程，单个 handler 导入失败会被跳过
            continue


def reload_handlers(package: str = "core.execution.handlers"):
    """
    清空注册表并重新加载 handlers。
    """
    clear_registry()
    auto_discover(package=package, reload=True)
