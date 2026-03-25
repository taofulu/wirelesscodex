from fastapi import FastAPI, Request

from core.parser.intent_to_dsl import intent_to_dsl
from core.parser.dsl_parser import parse_dsl

app = FastAPI()

@app.post("/intent/parse")
async def parse_intent(request: Request):
    body = await request.json()
    text = body.get("text", "")

    dsl = intent_to_dsl(text)
    ast = parse_dsl(dsl)

    return {
        "dsl": dsl,
        "ast": {
            "nodes": [n.dict() for n in ast.nodes]
        }
    }
