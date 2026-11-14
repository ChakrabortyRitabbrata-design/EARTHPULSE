"""
EARTHPULSE - LangGraph Workflow Construction
"""
from langgraph.graph import StateGraph, START, END

from backend.agent.state import GlacierAgentState
from backend.agent.nodes import (
    query_understanding_node,
    input_validation_node,
    dataset_selection_node,
    data_retrieval_node,
    data_validation_node,
    analysis_tool_selection_node,
    python_numerical_analysis_node,
    result_validation_node,
    ai_report_generation_node,
    structured_response_node,
)


def _route_after_validation(state: GlacierAgentState) -> str:
    """Routes to structured_response on error, otherwise continues pipeline."""
    if state.get("status") == "validation_error":
        return "structured_response"
    return "dataset_selection"


def build_glacier_graph() -> StateGraph:
    """Builds and compiles the end-to-end EARTHPULSE cryospheric agent graph."""
    workflow = StateGraph(GlacierAgentState)

    # Register Nodes
    workflow.add_node("query_understanding", query_understanding_node)
    workflow.add_node("input_validation", input_validation_node)
    workflow.add_node("dataset_selection", dataset_selection_node)
    workflow.add_node("data_retrieval", data_retrieval_node)
    workflow.add_node("data_validation", data_validation_node)
    workflow.add_node("analysis_tool_selection", analysis_tool_selection_node)
    workflow.add_node("python_numerical_analysis", python_numerical_analysis_node)
    workflow.add_node("result_validation", result_validation_node)
    workflow.add_node("ai_report_generation", ai_report_generation_node)
    workflow.add_node("structured_response", structured_response_node)

    # Register Edges
    workflow.add_edge(START, "query_understanding")
    workflow.add_edge("query_understanding", "input_validation")

    workflow.add_conditional_edges(
        "input_validation",
        _route_after_validation,
        {
            "structured_response": "structured_response",
            "dataset_selection": "dataset_selection"
        }
    )

    workflow.add_edge("dataset_selection", "data_retrieval")
    workflow.add_edge("data_retrieval", "data_validation")
    workflow.add_edge("data_validation", "analysis_tool_selection")
    workflow.add_edge("analysis_tool_selection", "python_numerical_analysis")
    workflow.add_edge("python_numerical_analysis", "result_validation")
    workflow.add_edge("result_validation", "ai_report_generation")
    workflow.add_edge("ai_report_generation", "structured_response")
    workflow.add_edge("structured_response", END)

    return workflow.compile()


glacier_agent = build_glacier_graph()
