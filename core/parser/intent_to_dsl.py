def intent_to_dsl(text: str) -> str:
    """
    将自然语言意图转换为 DSL
    示例：
    输入: "加一个UE，等2秒，检查attach"
    输出: "MML:ADD_UE; DELAY:2; ASSERT:CHECK_ATTACH"
    """
    text = text.lower()
    dsl_parts = []

    if "加一个ue" in text or "添加ue" in text or "增加ue" in text or "增加一个ue" in text:
        dsl_parts.append("MML:ADD_UE")

    import re
    delay_match = re.search(r'(?:等|等待)\s*(\d+)\s*秒(?:钟)?', text)
    if delay_match:
        seconds = delay_match.group(1)
        dsl_parts.append(f"DELAY:{seconds}")

    if "检查attach" in text or "check attach" in text:
        dsl_parts.append("ASSERT:CHECK_ATTACH")

    return "; ".join(dsl_parts)
