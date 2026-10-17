# Lessons

[endpoint] The school vLLM has no tool-call parser; tool calls go through `core/json_tools.py` (json_schema anyOf).
[endpoint] Grammar-constrained output can loop on whitespace; avoid booleans and object arrays in schemas, keep the stop sequences.
[recovery] Cancellation and timeout do not prove that an external effect stopped; preserve uncertainty and reconcile before replay.
