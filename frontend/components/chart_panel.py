import streamlit as st
import plotly.graph_objects as go

def show_chart(data, title):
    if not data:
        st.warning(f"No data for {title}")
        return

    times = [d["t"] for d in data]
    values = [d["v"] for d in data]

    fig = go.Figure()
    fig.add_trace(go.Scatter(x=times, y=values, mode="lines"))
    fig.update_layout(
        title=title,
        xaxis_title="Time",
        yaxis_title="Value",
        height=300
    )

    st.plotly_chart(fig, use_container_width=True)
