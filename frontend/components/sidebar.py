import streamlit as st

def sidebar_menu():
    with st.sidebar:
        st.markdown("## 📦 Navigation")
        st.write("Dashboard")
        if st.button("🚪 Logout"):
            st.session_state.logged_in = False
            st.session_state.token = None
            st.rerun()
        st.markdown("---")
        st.write("Streamlit DevOps Dashboard")
