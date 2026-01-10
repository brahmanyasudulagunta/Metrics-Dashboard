import streamlit as st
import plotly.graph_objects as go

def show_chart(data, title):
    if not data:
        st.warning(f"No data for {title}")
        return

    times = [d["t"] for d in data]
    values = [d["v"] for d in data]
    
    # Calculate stats
    min_val = min(values) if values else 0
    max_val = max(values) if values else 0
    avg_val = sum(values) / len(values) if values else 0

    fig = go.Figure()
    fig.add_trace(go.Scatter(
        x=times, 
        y=values, 
        mode="lines",
        name="Value",
        line=dict(color="rgb(31, 119, 180)", width=2),
        fill="tozeroy",
        fillcolor="rgba(31, 119, 180, 0.2)"
    ))

    fig.update_layout(
        title=title,
        xaxis_title="Time",
        yaxis_title="Value",
        height=350,
        hovermode="x unified",
        margin=dict(l=50, r=50, t=50, b=50)
    )

    # Only force 0-100 range for percentage metrics
    if "%" in title:
        fig.update_yaxes(range=[0, 100])

    st.plotly_chart(fig, use_container_width=True)
    
    # Show stats below chart
    stat_col1, stat_col2, stat_col3 = st.columns(3)
    with stat_col1:
        st.metric("Min", f"{min_val:.2f}")
    with stat_col2:
        st.metric("Avg", f"{avg_val:.2f}")
    with stat_col3:
        st.metric("Max", f"{max_val:.2f}")
