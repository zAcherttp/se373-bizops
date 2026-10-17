# Lessons

[endpoint] The school vLLM has no tool-call parser; tool calls go through `core/json_tools.py` (json_schema anyOf).
[endpoint] Grammar-constrained output can loop on whitespace; avoid booleans and object arrays in schemas, keep the stop sequences.
[recovery] Cancellation and timeout do not prove that an external effect stopped; preserve uncertainty and reconcile before replay.
[effect] Use typed failures and scoped interruption for execution mechanics; keep business replay policy explicit and preserve finalizer defects.
[dependencies] Check registry release tags and installed package APIs before choosing a framework major version.
