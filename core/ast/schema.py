# core/ast/schema.py
from __future__ import annotations
from enum import Enum
from typing import Any
from pydantic import BaseModel, field_validator


class Node(BaseModel):
    id: str
    type: NodeType
    depends_on: list[str] = []
    command: str = ""
    
class NodeType(str, Enum):
    MML        = "MML"
    INSTRUMENT = "INSTRUMENT"
    ASSERT     = "ASSERT"
    DELAY      = "DELAY"


class ASTNode(BaseModel):
    id:         str
    type:       NodeType                    # ✅ Pydantic 自动把 "MML" → NodeType.MML
    command:    str
    params:     dict[str, Any] = {}
    depends_on: list[str]      = []

    @field_validator("type", mode="before")  # ✅ 双重保险
    @classmethod
    def coerce_type(cls, v):
        if isinstance(v, NodeType):
            return v
        return NodeType(v)                  # 把 "MML" 强制转成 NodeType.MML


class AST(BaseModel):
    nodes: list[ASTNode]