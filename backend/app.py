import requests
import streamlit as st

API_BASE = "http://127.0.0.1:8000"

st.title("FinSight AI")
st.subheader("Personal Finance Mentor for Students")

if "session_id" not in st.session_state:
    st.session_state.session_id = None

with st.form("questionnaire_form"):
    monthly_income = st.number_input("Monthly Income", min_value=0.0, value=1850.0)
    fixed_expenses = st.number_input("Fixed Expenses", min_value=0.0, value=1200.0)
    student_loan_balance = st.number_input("Student Loan Balance", min_value=0.0, value=8000.0)
    student_loan_rate = st.number_input("Student Loan Rate", min_value=0.0, value=6.8)
    credit_card_balance = st.number_input("Credit Card Balance", min_value=0.0, value=1400.0)
    credit_card_limit = st.number_input("Credit Card Limit", min_value=0.0, value=3000.0)
    goal = st.selectbox("Goal", ["pay_debt", "emergency_fund", "start_investing", "save_for_goal"])
    risk_comfort = st.slider("Risk Comfort", 1, 5, 3)
    time_horizon = st.selectbox("Time Horizon", ["under_1yr", "1_3yr", "3_5yr", "5plus_yr"])
    income_type = st.selectbox("Income Type", ["stable", "part_time", "freelance", "stipend"])

    submitted = st.form_submit_button("Create Session")

if submitted:
    payload = {
        "monthly_income": monthly_income,
        "fixed_expenses": fixed_expenses,
        "student_loan_balance": student_loan_balance,
        "student_loan_rate": student_loan_rate,
        "credit_card_balance": credit_card_balance,
        "credit_card_limit": credit_card_limit,
        "goal": goal,
        "risk_comfort": risk_comfort,
        "time_horizon": time_horizon,
        "income_type": income_type,
    }

    response = requests.post(f"{API_BASE}/onboard", json=payload)
    if response.ok:
        st.session_state.session_id = response.json()["session_id"]
        st.success(f"Session created: {st.session_state.session_id}")
    else:
        st.error(response.text)

uploaded_file = st.file_uploader("Upload transaction file", type=["csv", "xlsx", "xls"])

if uploaded_file and st.session_state.session_id:
    if st.button("Upload Transactions"):
        files = {
            "file": (uploaded_file.name, uploaded_file.getvalue(), uploaded_file.type)
        }
        response = requests.post(
            f"{API_BASE}/upload/{st.session_state.session_id}",
            files=files,
        )
        if response.ok:
            st.success("Transactions uploaded successfully")
            st.json(response.json())
        else:
            st.error(response.text)

if st.session_state.session_id:
    if st.button("Generate Readiness Score"):
        response = requests.post(f"{API_BASE}/score/{st.session_state.session_id}")
        if response.ok:
            data = response.json()
            st.success("Score generated")
            st.metric("Saving Score", data["saving_score"])
            st.metric("Investment Score", data["investment_score"])
            st.write("### Narratives")
            st.write(data["readiness_narrative"])
            st.write(data["investment_narrative"])
            st.write("### Gap Analysis")
            st.dataframe(data["gap_analysis"])
            st.write("### Behavioral Flags")
            st.write(data["behavioral_flags"])
        else:
            st.error(response.text)

if st.session_state.session_id:
    if st.button("Get Full Profile"):
        response = requests.get(f"{API_BASE}/profile/{st.session_state.session_id}")
        if response.ok:
            st.write("### Full User Profile")
            st.json(response.json())
        else:
            st.error(response.text)