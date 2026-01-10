import streamlit as st
import requests

BACKEND = "http://backend:8000/api"

def login_ui():
    st.subheader("🔐 Login")

    username = st.text_input("Username")
    password = st.text_input("Password", type="password")

    if st.button("Login"):
        r = requests.post(
            f"{BACKEND}/login",
            json={"username": username, "password": password}
        )

        if r.status_code == 200:
            st.session_state.token = r.json()["access_token"]
            st.session_state.logged_in = True
            st.success("Login successful")
            st.rerun()
        else:
            st.error("Invalid credentials")


def signup_ui():
    st.subheader("📝 Signup")

    username = st.text_input("New Username", key="su_user")
    password = st.text_input("New Password", type="password", key="su_pass")

    if st.button("Create Account"):
        r = requests.post(
            f"{BACKEND}/signup",
            json={"username": username, "password": password}
        )

        if r.status_code == 200:
            st.success("Account created. Please login.")
        else:
            try:
                error_msg = r.json().get("detail", "Signup failed")
            except Exception:
                error_msg = r.text or "Signup failed"

            st.error(error_msg)

