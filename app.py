"""OPERION v2 - SQLite + login + smart seating. Run: streamlit run app.py"""
import hashlib, random, sqlite3
from contextlib import closing
from datetime import datetime, timedelta
import pandas as pd
import streamlit as st

st.set_page_config("OPERION", "🎓", layout="wide")
st.markdown("""<style>
.seat{display:inline-block;width:58px;margin:4px;padding:7px 0;text-align:center;border-radius:8px;
font-size:12px;font-weight:600;border:1px solid #d9dee8;background:#fff;color:#1c2333}
.Present{background:#dcfce7;border-color:#22c55e}.Absent{background:#fee2e2;border-color:#ef4444}
.Alert{background:#fef9c3;border-color:#eab308}.Pending{background:#f4f6fa}
.row{white-space:nowrap}.lg span{margin-right:14px;font-size:13px}
.card{border:1px solid #e3e7ef;border-radius:10px;padding:12px 16px;background:#fff}
</style>""", unsafe_allow_html=True)

DB = "operion.db"
HALLS = {"Hall A-101": (5, 8), "Hall B-204": (5, 8), "Hall C-310": (5, 8)}
BRANCHES = ["CSE", "ECE", "ME", "CE"]
NAMES = ["Aarav","Diya","Kabir","Meera","Rohan","Sana","Vihaan","Isha","Neha","Arjun"]
now = lambda f="%d %b %H:%M": datetime.now().strftime(f)

# ---------- database ----------
def run(sql, a=()):
    with closing(sqlite3.connect(DB)) as c:
        c.execute(sql, a); c.commit()
def table(sql, a=()):
    with closing(sqlite3.connect(DB)) as c:
        return pd.read_sql_query(sql, c, params=a)
def hp(pw):
    return hashlib.pbkdf2_hmac("sha256", pw.encode(), b"operion-salt", 50_000).hex()

def seating(students):
    """Interleave branches, rotate each row -> no same-branch neighbours (left/right/front/back)."""
    groups = {b: list(g.index) for b, g in students.groupby("branch")}
    seq = []
    while any(groups.values()):
        for b in groups:
            if groups[b]: seq.append(groups[b].pop(0))
    out, k = [], 0
    for h, (r, c) in HALLS.items():
        block = seq[k:k + r * c]; k += r * c
        for i in range(r):
            row = block[i*c:(i+1)*c]; row = row[i % len(row):] + row[:i % len(row)] if row else row
            out += [(idx, h, f"{chr(65+i)}{j+1}") for j, idx in enumerate(row)]
    return out

def conflicts():
    d = table("select s.hall,s.seat,s.branch from students s")
    pos = {(x.hall, x.seat): x.branch for x in d.itertuples()}; n = 0
    for (h, s), b in pos.items():
        for nb in (f"{s[0]}{int(s[1:])+1}", f"{chr(ord(s[0])+1)}{s[1:]}"):
            n += pos.get((h, nb)) == b
    return n

def build_students():
    st_df = pd.DataFrame([dict(roll=f"22{BRANCHES[i%4]}{i//4+1:03d}", name=f"{random.choice(NAMES)} {chr(65+i%26)}.",
                               branch=BRANCHES[i % 4]) for i in range(120)])
    return st_df

def init(reset=False):
    if reset:
        for t in ["students","users","duty","alerts","cases","requests","meta"]: run(f"drop table if exists {t}")
    run("create table if not exists students(roll,name,branch,hall,seat,status)")
    run("create table if not exists users(username primary key,pw,role,display)")
    run("create table if not exists duty(username,hall,co)")
    run("create table if not exists alerts(time,kind,hall,message,level)")
    run("create table if not exists cases(type,roll,hall,filed_by,details,time)")
    run("create table if not exists requests(type,by_user,details,time)")
    run("create table if not exists meta(k primary key,v)")
    if table("select count(*) n from students").n[0] == 0:
        s = build_students()
        for idx, h, seat in seating(s):
            r = s.loc[idx]; run("insert into students values(?,?,?,?,?,?)", (r.roll, r["name"], r.branch, h, seat, "Pending"))
            run("insert or replace into users values(?,?,?,?)", (r.roll.lower(), hp(r.roll.lower()), "Student", r["name"]))
        run("insert into users values('examcell',?,'Exam Cell','Exam Cell')", (hp("cell@123"),))
        for u, nm, h, co in [("sharma","Dr. Sharma","Hall A-101","Prof. Rao"),("verma","Prof. Verma","Hall B-204","Dr. Khan")]:
            run("insert into users values(?,?,?,?)", (u, hp("fac@123"), "Faculty", nm)); run("insert into duty values(?,?,?)", (u, h, co))
        run("insert into meta values('exam_start',?)", ((datetime.now()+timedelta(minutes=45)).isoformat(),))
init()
exam_start = datetime.fromisoformat(table("select v from meta where k='exam_start'").v[0])

def alert(kind, hall, msg, level="Alert"):
    run("insert into alerts values(?,?,?,?,?)", (now("%H:%M:%S"), kind, hall, msg, level))
def setstatus(roll, status): run("update students set status=? where roll=?", (status, roll))

def seatmap(hall):
    d = table("select * from students where hall=? order by seat", (hall,)); r, c = HALLS[hall]
    d["o"] = d.seat.map(lambda s: (ord(s[0]), int(s[1:]))); d = d.sort_values("o").reset_index(drop=True)
    html = "".join('<div class="row">' + "".join(
        f'<div class="seat {x.status}" title="{x["name"]} ({x.branch})">{x.seat}<br><small>{x.roll[-6:]}</small></div>'
        for x in (d.iloc[j] for j in range(i*c, i*c+c))) + "</div>" for i in range(r))
    st.markdown(html + '<div class="lg"><span>🟩 Present</span><span>🟥 Absent</span><span>🟨 Alert</span><span>⬜ Not marked</span></div>',
                unsafe_allow_html=True)

def show(sql, empty, a=()):
    d = table(sql, a); st.dataframe(d, use_container_width=True, hide_index=True) if len(d) else st.info(empty)

# ---------- login ----------
if "user" not in st.session_state:
    st.title("🎓 OPERION")
    st.caption("Exam day automation · sign in")
    u = st.text_input("Username"); p = st.text_input("Password", type="password")
    if st.button("Sign in", type="primary"):
        r = table("select * from users where username=? and pw=?", (u.strip().lower(), hp(p)))
        if len(r): st.session_state.user = r.iloc[0].to_dict(); st.rerun()
        else: st.error("Wrong username or password.")
    st.info("Demo logins: examcell / cell@123 · sharma / fac@123 · student: roll number in lowercase as both username and password (e.g. 22cse001)")
    st.stop()

U = st.session_state.user; role = U["role"]
st.sidebar.title("🎓 OPERION"); st.sidebar.write(f"**{U['display']}**  \n{role}")
st.sidebar.caption(f"Exam starts: {exam_start:%H:%M}")
if st.sidebar.button("Sign out"): del st.session_state.user; st.rerun()
if role == "Exam Cell" and st.sidebar.button("Reset demo data"):
    init(True); st.rerun()

# ---------- EXAM CELL ----------
if role == "Exam Cell":
    st.title("Live Exam Monitor")
    @st.fragment(run_every=5)
    def monitor():
        d = table("select status,count(*) n from students group by status"); g = dict(zip(d.status, d.n))
        c = st.columns(5); c[0].metric("Students", int(d.n.sum()))
        for k, col in zip(["Present","Absent","Alert"], c[1:4]): col.metric(k, int(g.get(k, 0)))
        c[4].metric("Open alerts", int(table("select count(*) n from alerts").n[0]))
        hall = st.selectbox("Hall", list(HALLS)); seatmap(hall)
        st.subheader("Live alerts"); show("select * from alerts order by rowid desc limit 20", "No alerts yet.")
    monitor()
    t = st.tabs(["Seating", "UFM cases", "Leaves & complaints", "Feedback"])
    with t[0]:
        st.metric("Same-branch neighbours (lower is better)", conflicts())
        if st.button("Regenerate seating"):
            s = table("select roll,name,branch from students").sample(frac=1).reset_index(drop=True)
            for idx, h, seat in seating(s): run("update students set hall=?,seat=?,status='Pending' where roll=?", (h, seat, s.roll[idx]))
            st.rerun()
    with t[1]: show("select * from cases", "No UFM forms filed.")
    with t[2]: show("select * from requests where type!='Feedback'", "Nothing submitted.")
    with t[3]: show("select * from requests where type='Feedback'", "No feedback yet.")

# ---------- FACULTY ----------
elif role == "Faculty":
    hall, co = table("select hall,co from duty where username=?", (U["username"],)).iloc[0]
    d = table("select * from students where hall=?", (hall,)); st.title(f"Duty: {hall}")
    st.markdown(f'<div class="card">Hall <b>{hall}</b> · Students <b>{len(d)}</b> · Co-invigilator <b>{co}</b></div>', unsafe_allow_html=True)
    seatmap(hall)
    pick = lambda k: st.selectbox("Student", d.roll, key=k, format_func=lambda r: f"{d[d.roll==r].seat.iloc[0]} · {r} · {d[d.roll==r].name.iloc[0]}")
    t = st.tabs(["Attendance","Report issue","Suspicious / UFM","Device sensor","Leave & complaint"])
    with t[0]:
        roll = pick("a"); a, b = st.columns(2)
        if a.button("Mark present", type="primary"): setstatus(roll, "Present"); st.rerun()
        if b.button("Mark absent"): setstatus(roll, "Absent"); st.rerun()
    with t[1]:
        iss = st.selectbox("Issue", ["Wrong question paper","Question paper delayed","Answer sheets delayed"])
        if st.button("Send to Exam Cell"): alert("Logistics", hall, iss); st.success("Exam Cell notified")
    with t[2]:
        roll = pick("s"); note = st.text_input("What did you observe?"); a, b = st.columns(2)
        if a.button("Flag yellow"): setstatus(roll, "Alert"); alert("Suspicious", hall, f"{roll}: {note}"); st.rerun()
        if b.button("File UFM form"):
            run("insert into cases values('UFM',?,?,?,?,?)", (roll, hall, U["display"], note, now())); alert("UFM", hall, f"UFM filed for {roll}"); st.success("UFM filed")
    with t[3]:
        st.caption("Demo: the hardware sensor (ESP32 / RF detector) would trigger this automatically.")
        roll = pick("d"); dev = st.selectbox("Device detected", ["Mobile phone","Smart watch","Earbuds"])
        if st.button("Simulate detection"):
            setstatus(roll, "Alert"); alert("Device", hall, f"{dev} at seat of {roll}. Jammer: ACTIVE"); st.error("Device jammed, alert sent")
    with t[4]:
        kind = st.radio("Type", ["Leave","Complaint"], horizontal=True); txt = st.text_area("Details / dates")
        st.caption("Complaints are visible to the Exam Cell only.")
        if st.button("Submit"): run("insert into requests values(?,?,?,?)", (kind, U["display"], txt, now())); st.success("Submitted")

# ---------- STUDENT ----------
else:
    me = table("select * from students where lower(roll)=?", (U["username"],)).iloc[0]
    mins = (exam_start - datetime.now()).total_seconds() / 60
    st.title(f"Hello, {me['name']}")
    sim = st.toggle("Demo: pretend it is 1 hour before exam", value=mins <= 60)
    t = st.tabs(["My seat","Running late","Leave","Feedback"])
    with t[0]:
        if sim or mins <= 60: st.success(f"{me.hall}, Seat {me.seat}"); seatmap(me.hall)
        else: st.info(f"Your seat unlocks 1 hour before the exam (in {int(mins-60)} min).")
    with t[1]:
        why = st.selectbox("Reason", ["University bus delayed","Traffic","Other"]); eta = st.number_input("Expected delay (min)", 5, 60, 15)
        if st.button("Notify Exam Cell"): alert("Late arrival", me.hall, f"{me.roll}: {why}, ~{eta} min late. Consider extra time.", "Info"); st.success("Sent")
    with t[2]:
        r = st.selectbox("Type", ["Medical leave","Other leave"]); txt = st.text_area("Details")
        if st.button("Apply"): run("insert into requests values(?,?,?,?)", (r, me.roll, txt, now())); st.success("Applied")
    with t[3]:
        fb = st.text_area("Feedback (visible to Exam Cell only)")
        if st.button("Send feedback"): run("insert into requests values('Feedback',?,?,?)", (me.roll, fb, now())); st.success("Thanks!")
