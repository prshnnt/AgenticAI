from .websearch import websearch
from .scratchpad import (
    scratchpad_view,
    scratchpad_add_todo,
    scratchpad_update_todo,
    scratchpad_delete_todo,
    scratchpad_update_notes
)

def get_tools():
    return [
        websearch,
        scratchpad_view,
        scratchpad_add_todo,
        scratchpad_update_todo,
        scratchpad_delete_todo,
        scratchpad_update_notes
    ]