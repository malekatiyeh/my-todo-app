import { useState, useEffect } from "react";
import { onAuthStateChanged, signOut } from "firebase/auth";
import { doc, getDoc, setDoc } from "firebase/firestore";
import { auth, db } from "./firebase";
import LoginPage from "./LoginPage";

// ─── Constants ────────────────────────────────────────────────
const DAYS = ["Sunday","Monday","Tuesday","Wednesday","Thursday","Friday","Saturday"];
const MONTHS = ["Jan","Feb","Mar","Apr","May","Jun","Jul","Aug","Sep","Oct","Nov","Dec"];
const MONTHS_FULL = ["January","February","March","April","May","June","July","August","September","October","November","December"];

function todayKey() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}
function formatDateKey(key) {
  const [y,m,d] = key.split("-");
  const date = new Date(+y,+m-1,+d);
  return `${DAYS[date.getDay()]}, ${MONTHS[+m-1]} ${+d}, ${y}`;
}
function uid() { return Math.random().toString(36).slice(2,9); }

// ─── Firestore helpers ────────────────────────────────────────
async function loadUserData(uid) {
  try {
    const ref = doc(db, "users", uid);
    const snap = await getDoc(ref);
    return snap.exists() ? snap.data() : {};
  } catch { return {}; }
}

async function saveUserData(uid, data) {
  try {
    const ref = doc(db, "users", uid);
    await setDoc(ref, data, { merge: true });
  } catch (e) { console.error("Save error:", e); }
}

// ─── Build daily task list ────────────────────────────────────
function buildDailyTasks(recurring, weekly, monthly, yearly, extraToday) {
  const now = new Date();
  const dayName = DAYS[now.getDay()];
  const date = now.getDate();
  const month = now.getMonth() + 1;
  const tasks = [];
  recurring.forEach(t => tasks.push({...t, source:"recurring", done:false}));
  (weekly[dayName]||[]).forEach(t => tasks.push({...t, source:"weekly", done:false}));
  (monthly[date]||[]).forEach(t => tasks.push({...t, source:"monthly", done:false}));
  (monthly["undated"]||[]).forEach(t => tasks.push({...t, source:"monthly", done:false}));
  const yKey = `${month}-${date}`;
  (yearly[yKey]||[]).forEach(t => tasks.push({...t, source:"yearly", done:false}));
  (yearly["undated"]||[]).forEach(t => tasks.push({...t, source:"yearly", done:false}));
  (extraToday||[]).forEach(t => tasks.push(t));
  return tasks;
}

// ─── Styles ───────────────────────────────────────────────────
const inp = {
  width:"100%", boxSizing:"border-box", padding:"9px 12px", borderRadius:9,
  border:"1.5px solid #e2e8f0", fontSize:14, fontFamily:"'DM Sans',sans-serif",
  color:"#1e293b", marginBottom:10, outline:"none", background:"#f8fafc",
};
const lbl = {
  fontSize:12, fontWeight:600, color:"#94a3b8", display:"block",
  marginBottom:4, textTransform:"uppercase", letterSpacing:0.5,
};
const btn = {
  padding:"10px 18px", borderRadius:10, border:"none", cursor:"pointer",
  fontSize:14, fontWeight:600, fontFamily:"'DM Sans',sans-serif",
};

// ─── Badge ────────────────────────────────────────────────────
function Badge({ label, color }) {
  const colors = {recurring:"#f59e0b",weekly:"#6366f1",monthly:"#10b981",yearly:"#ec4899",manual:"#64748b"};
  const c = colors[color]||"#64748b";
  return (
    <span style={{fontSize:10,fontWeight:700,letterSpacing:1,textTransform:"uppercase",
      padding:"2px 7px",borderRadius:99,background:c+"22",color:c,border:`1px solid ${c}44`}}>
      {label}
    </span>
  );
}

// ─── TaskRow ──────────────────────────────────────────────────
function TaskRow({ task, onToggle, onDelete }) {
  return (
    <div style={{display:"flex",alignItems:"center",gap:10,padding:"10px 14px",
      borderRadius:10,background:task.done?"#f1f5f9":"#fff",border:"1px solid #e2e8f0",
      marginBottom:6,opacity:task.done?0.6:1,transition:"all 0.2s"}}>
      <button onClick={onToggle} style={{width:22,height:22,borderRadius:6,
        border:task.done?"2px solid #6366f1":"2px solid #cbd5e1",
        background:task.done?"#6366f1":"transparent",cursor:"pointer",flexShrink:0,
        display:"flex",alignItems:"center",justifyContent:"center"}}>
        {task.done && <span style={{color:"#fff",fontSize:13}}>✓</span>}
      </button>
      <div style={{flex:1,minWidth:0}}>
        <div style={{fontSize:14,fontWeight:500,color:"#1e293b",
          textDecoration:task.done?"line-through":"none"}}>{task.text}</div>
        <div style={{display:"flex",gap:5,marginTop:3,flexWrap:"wrap",alignItems:"center"}}>
          <Badge label={task.source} color={task.source} />
          {task.time && <span style={{fontSize:11,color:"#94a3b8"}}>⏰ {task.time}</span>}
        </div>
      </div>
      {task.source === "manual" && (
        <button onClick={onDelete} style={{background:"none",border:"none",cursor:"pointer",color:"#94a3b8",fontSize:18,padding:2}}>×</button>
      )}
    </div>
  );
}

// ─── AddTaskModal ─────────────────────────────────────────────
function AddTaskModal({ onClose, onAdd }) {
  const [text,setText] = useState("");
  const [time,setTime] = useState("");
  const [scope,setScope] = useState("today");
  const [weekDay,setWeekDay] = useState("Monday");
  const [monthDateType,setMonthDateType] = useState("specific");
  const [monthDate,setMonthDate] = useState(1);
  const [yearDateType,setYearDateType] = useState("specific");
  const [yearMonth,setYearMonth] = useState(1);
  const [yearDay,setYearDay] = useState(1);

  function handleAdd() {
    if (!text.trim()) return;
    onAdd({text:text.trim(),time,scope,weekDay,monthDate,monthDateType,yearMonth,yearDay,yearDateType,id:uid()});
    onClose();
  }

  const tBtn = (active, accent) => ({
    flex:1, padding:"8px 0", borderRadius:9, border:"1.5px solid",
    borderColor:active?accent:"#e2e8f0", background:active?accent+"18":"#f8fafc",
    color:active?accent:"#64748b", cursor:"pointer", fontSize:13, fontWeight:600,
    fontFamily:"'DM Sans',sans-serif",
  });

  return (
    <div style={{position:"fixed",inset:0,background:"#0008",zIndex:100,
      display:"flex",alignItems:"center",justifyContent:"center",padding:16}} onClick={onClose}>
      <div onClick={e=>e.stopPropagation()} style={{background:"#fff",borderRadius:18,padding:28,
        width:"100%",maxWidth:360,boxShadow:"0 20px 60px #0003",maxHeight:"90vh",overflowY:"auto"}}>
        <h3 style={{margin:"0 0 18px",fontSize:18,color:"#1e293b"}}>Add Task</h3>

        <input value={text} onChange={e=>setText(e.target.value)}
          placeholder="Task description..." style={inp} autoFocus
          onKeyDown={e=>e.key==="Enter"&&handleAdd()} />

        <label style={lbl}>Time (optional)</label>
        <input type="time" value={time} onChange={e=>setTime(e.target.value)} style={inp} />

        <label style={lbl}>Schedule</label>
        <select value={scope} onChange={e=>setScope(e.target.value)} style={inp}>
          <option value="today">Today only</option>
          <option value="recurring">Every day (Recurring)</option>
          <option value="weekly">Weekly (pick a day)</option>
          <option value="monthly">Monthly</option>
          <option value="yearly">Yearly</option>
        </select>

        {scope==="weekly"&&(<>
          <label style={lbl}>Day of week</label>
          <select value={weekDay} onChange={e=>setWeekDay(e.target.value)} style={inp}>
            {DAYS.map(d=><option key={d}>{d}</option>)}
          </select>
        </>)}

        {scope==="monthly"&&(<>
          <label style={lbl}>When in the month?</label>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <button style={tBtn(monthDateType==="specific","#10b981")} onClick={()=>setMonthDateType("specific")}>📅 On a date</button>
            <button style={tBtn(monthDateType==="undated","#10b981")} onClick={()=>setMonthDateType("undated")}>📋 No date</button>
          </div>
          {monthDateType==="specific"?(<>
            <label style={lbl}>Day of month</label>
            <select value={monthDate} onChange={e=>setMonthDate(+e.target.value)} style={inp}>
              {Array.from({length:31},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </>):(
            <p style={{fontSize:12,color:"#94a3b8",margin:"0 0 12px",lineHeight:1.6,
              background:"#f0fdf4",borderRadius:8,padding:"8px 12px"}}>
              Appears in monthly list with no specific date, and also shows every day.
            </p>
          )}
        </>)}

        {scope==="yearly"&&(<>
          <label style={lbl}>When in the year?</label>
          <div style={{display:"flex",gap:8,marginBottom:12}}>
            <button style={tBtn(yearDateType==="specific","#ec4899")} onClick={()=>setYearDateType("specific")}>📅 On a date</button>
            <button style={tBtn(yearDateType==="undated","#ec4899")} onClick={()=>setYearDateType("undated")}>📋 No date</button>
          </div>
          {yearDateType==="specific"?(<>
            <label style={lbl}>Month</label>
            <select value={yearMonth} onChange={e=>setYearMonth(+e.target.value)} style={inp}>
              {MONTHS.map((m,i)=><option key={m} value={i+1}>{m}</option>)}
            </select>
            <label style={lbl}>Day</label>
            <select value={yearDay} onChange={e=>setYearDay(+e.target.value)} style={inp}>
              {Array.from({length:31},(_,i)=>i+1).map(d=><option key={d} value={d}>{d}</option>)}
            </select>
          </>):(
            <p style={{fontSize:12,color:"#94a3b8",margin:"0 0 12px",lineHeight:1.6,
              background:"#fdf2f8",borderRadius:8,padding:"8px 12px"}}>
              Appears in yearly list with no specific date, and also shows every day.
            </p>
          )}
        </>)}

        <div style={{display:"flex",gap:10,marginTop:20}}>
          <button onClick={onClose} style={{...btn,background:"#f1f5f9",color:"#64748b",flex:1}}>Cancel</button>
          <button onClick={handleAdd} style={{...btn,background:"#6366f1",color:"#fff",flex:2}}>Add Task</button>
        </div>
      </div>
    </div>
  );
}

// ─── Calendar History ─────────────────────────────────────────
function CalendarHistory({ history }) {
  const now = new Date();
  const [calYear,setCalYear] = useState(now.getFullYear());
  const [calMonth,setCalMonth] = useState(now.getMonth());
  const [selectedDay,setSelectedDay] = useState(null);

  function getKey(y,m,d) {
    return `${y}-${String(m+1).padStart(2,"0")}-${String(d).padStart(2,"0")}`;
  }
  const firstDow = new Date(calYear,calMonth,1).getDay();
  const daysInMonth = new Date(calYear,calMonth+1,0).getDate();
  const cells = [];
  for(let i=0;i<firstDow;i++) cells.push(null);
  for(let d=1;d<=daysInMonth;d++) cells.push(d);

  const todayStr = todayKey();

  function pct(key) {
    const t=history[key]; if(!t||!t.length) return null;
    return Math.round((t.filter(x=>x.done).length/t.length)*100);
  }
  function dotColor(p) {
    if(p===null) return null;
    if(p===100) return "#10b981"; if(p>=50) return "#f59e0b"; return "#f87171";
  }

  const selKey = selectedDay?getKey(calYear,calMonth,selectedDay):null;
  const selTasks = selKey?(history[selKey]||[]):[];
  const selPct = selKey?pct(selKey):null;

  return (
    <div>
      <div style={{display:"flex",alignItems:"center",justifyContent:"space-between",marginBottom:16}}>
        <button onClick={()=>{if(calMonth===0){setCalMonth(11);setCalYear(y=>y-1);}else setCalMonth(m=>m-1);setSelectedDay(null);}}
          style={{...btn,background:"#f1f5f9",color:"#64748b",padding:"6px 16px",fontSize:18}}>‹</button>
        <span style={{fontWeight:700,fontSize:17,color:"#1e293b",fontFamily:"'DM Serif Display',serif"}}>
          {MONTHS_FULL[calMonth]} {calYear}
        </span>
        <button onClick={()=>{if(calMonth===11){setCalMonth(0);setCalYear(y=>y+1);}else setCalMonth(m=>m+1);setSelectedDay(null);}}
          style={{...btn,background:"#f1f5f9",color:"#64748b",padding:"6px 16px",fontSize:18}}>›</button>
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:2,marginBottom:4}}>
        {["Su","Mo","Tu","We","Th","Fr","Sa"].map(d=>(
          <div key={d} style={{textAlign:"center",fontSize:11,fontWeight:700,
            color:"#94a3b8",padding:"4px 0",textTransform:"uppercase",letterSpacing:0.5}}>{d}</div>
        ))}
      </div>

      <div style={{display:"grid",gridTemplateColumns:"repeat(7,1fr)",gap:3}}>
        {cells.map((d,i)=>{
          if(!d) return <div key={`e${i}`}/>;
          const key=getKey(calYear,calMonth,d);
          const p=pct(key);
          const isToday=key===todayStr;
          const isSel=d===selectedDay;
          return(
            <button key={key} onClick={()=>setSelectedDay(isSel?null:d)} style={{
              border:"none",cursor:"pointer",borderRadius:10,padding:"7px 2px",
              display:"flex",flexDirection:"column",alignItems:"center",gap:4,
              background:isSel?"#eef2ff":isToday?"#f0fdf4":"transparent",
              outline:isSel?"2px solid #6366f1":isToday?"2px solid #10b981":"none",
              transition:"all 0.15s",
            }}>
              <span style={{fontSize:13,fontWeight:isToday?700:400,
                color:isToday?"#10b981":isSel?"#6366f1":"#334155"}}>{d}</span>
              <div style={{width:6,height:6,borderRadius:"50%",background:dotColor(p)||"transparent"}}/>
            </button>
          );
        })}
      </div>

      <div style={{display:"flex",gap:14,marginTop:14,justifyContent:"center"}}>
        {[["#10b981","All done"],["#f59e0b","Partial"],["#f87171","Few done"]].map(([c,l])=>(
          <div key={l} style={{display:"flex",alignItems:"center",gap:5,fontSize:11,color:"#64748b"}}>
            <div style={{width:8,height:8,borderRadius:"50%",background:c}}/>{l}
          </div>
        ))}
      </div>

      {selectedDay&&(
        <div style={{marginTop:22,background:"#fff",borderRadius:14,padding:16,border:"1px solid #e2e8f0"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
            <div style={{fontSize:14,fontWeight:700,color:"#1e293b"}}>{formatDateKey(selKey)}</div>
            {selPct!==null&&(
              <div style={{fontSize:12,fontWeight:600,color:dotColor(selPct),
                background:dotColor(selPct)+"18",padding:"3px 10px",borderRadius:99}}>
                {selPct}% done
              </div>
            )}
          </div>
          {selTasks.length===0?(
            <div style={{fontSize:13,color:"#cbd5e1",padding:"8px 0"}}>No tasks recorded for this day.</div>
          ):(
            selTasks.map((t,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:10,padding:"8px 14px",
                borderRadius:10,background:t.done?"#f0fdf4":"#f8fafc",border:"1px solid #e2e8f0",marginBottom:5}}>
                <span style={{fontSize:15}}>{t.done?"✅":"⬜"}</span>
                <span style={{flex:1,fontSize:13,color:"#1e293b",textDecoration:t.done?"line-through":"none"}}>{t.text}</span>
                {t.time&&<span style={{fontSize:11,color:"#94a3b8"}}>⏰ {t.time}</span>}
              </div>
            ))
          )}
        </div>
      )}
    </div>
  );
}

// ─── Notes Tab ───────────────────────────────────────────────
function NotesTab({ uid }) {
  const [notes, setNotes] = useState([]);
  const [loaded, setLoaded] = useState(false);
  const [showForm, setShowForm] = useState(false);
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [viewing, setViewing] = useState(null);

  useEffect(()=>{
    (async()=>{
      const data = await loadUserData(uid);
      setNotes(data.notes||[]);
      setLoaded(true);
    })();
  },[uid]);

  async function saveNotes(updated) {
    setNotes(updated);
    await saveUserData(uid, { notes: updated });
  }

  function handleAdd() {
    if (!title.trim()) return;
    const note = { id:uid(), title:title.trim(), body:body.trim(), createdAt: new Date().toISOString() };
    saveNotes([note, ...notes]);
    setTitle(""); setBody(""); setShowForm(false);
  }

  function handleDelete(id) {
    saveNotes(notes.filter(n=>n.id!==id));
    if (viewing?.id===id) setViewing(null);
  }

  function formatDate(iso) {
    const d = new Date(iso);
    return `${MONTHS[d.getMonth()]} ${d.getDate()}, ${d.getFullYear()}`;
  }

  if (!loaded) return <div style={{fontSize:13,color:"#94a3b8",padding:"20px 0"}}>Loading notes...</div>;

  if (viewing) return (
    <div>
      <button onClick={()=>setViewing(null)} style={{...btn,background:"#f1f5f9",color:"#64748b",padding:"7px 14px",fontSize:13,marginBottom:16}}>
        ← Back
      </button>
      <div style={{background:"#fff",borderRadius:14,padding:20,border:"1px solid #e2e8f0"}}>
        <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
          <div style={{fontFamily:"'DM Serif Display',serif",fontSize:22,color:"#1e293b",flex:1,marginRight:12}}>
            {viewing.title}
          </div>
          <button onClick={()=>handleDelete(viewing.id)} style={{
            background:"#fef2f2",border:"1px solid #fecaca",color:"#ef4444",
            borderRadius:8,padding:"5px 10px",cursor:"pointer",fontSize:12,fontWeight:600,
            fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap",
          }}>Delete</button>
        </div>
        <div style={{fontSize:11,color:"#94a3b8",marginBottom:16}}>{formatDate(viewing.createdAt)}</div>
        <div style={{fontSize:14,color:"#334155",lineHeight:1.7,whiteSpace:"pre-wrap"}}>{viewing.body||<span style={{color:"#cbd5e1"}}>No content.</span>}</div>
      </div>
    </div>
  );

  return (
    <div>
      {showForm ? (
        <div style={{background:"#fff",borderRadius:14,padding:20,border:"1px solid #e2e8f0",marginBottom:20}}>
          <h3 style={{margin:"0 0 16px",fontSize:16,color:"#1e293b"}}>New Note</h3>
          <input value={title} onChange={e=>setTitle(e.target.value)}
            placeholder="Title..." style={{...inp}} autoFocus />
          <textarea value={body} onChange={e=>setBody(e.target.value)}
            placeholder="Write your note here..."
            rows={6} style={{...inp,resize:"vertical",lineHeight:1.6}} />
          <div style={{display:"flex",gap:10,marginTop:8}}>
            <button onClick={()=>{setShowForm(false);setTitle("");setBody("");}}
              style={{...btn,background:"#f1f5f9",color:"#64748b",flex:1}}>Cancel</button>
            <button onClick={handleAdd}
              style={{...btn,background:"#6366f1",color:"#fff",flex:2}}>Save Note</button>
          </div>
        </div>
      ) : (
        <button onClick={()=>setShowForm(true)} style={{
          ...btn,background:"#6366f1",color:"#fff",width:"100%",marginBottom:20,padding:"11px 0",
        }}>+ New Note</button>
      )}

      {notes.length===0&&!showForm&&(
        <div style={{textAlign:"center",color:"#94a3b8",padding:"40px 0",fontSize:14}}>
          No notes yet. Tap "+ New Note" to create one.
        </div>
      )}

      {notes.map(note=>(
        <div key={note.id} onClick={()=>setViewing(note)} style={{
          background:"#fff",borderRadius:12,padding:"14px 16px",border:"1px solid #e2e8f0",
          marginBottom:10,cursor:"pointer",transition:"box-shadow 0.15s",
        }}
          onMouseEnter={e=>e.currentTarget.style.boxShadow="0 4px 16px #0001"}
          onMouseLeave={e=>e.currentTarget.style.boxShadow="none"}
        >
          <div style={{fontSize:15,fontWeight:600,color:"#1e293b",marginBottom:4}}>{note.title}</div>
          <div style={{fontSize:12,color:"#94a3b8",marginBottom:6}}>{formatDate(note.createdAt)}</div>
          {note.body&&(
            <div style={{fontSize:13,color:"#64748b",
              overflow:"hidden",display:"-webkit-box",WebkitLineClamp:2,
              WebkitBoxOrient:"vertical",lineHeight:1.5}}>
              {note.body}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

// ─── Main TodoApp (shown after login) ────────────────────────
function TodoApp({ user }) {
  const [tab,setTab] = useState("today");
  const [tasks,setTasks] = useState([]);
  const [recurring,setRecurring] = useState([]);
  const [weekly,setWeekly] = useState({});
  const [monthly,setMonthly] = useState({});
  const [yearly,setYearly] = useState({});
  const [dailyExtra,setDailyExtra] = useState([]);
  const [history,setHistory] = useState({});
  const [showModal,setShowModal] = useState(false);
  const [loaded,setLoaded] = useState(false);
  const [saving,setSaving] = useState(false);

  // Load from Firestore on mount
useEffect(()=>{
  (async()=>{
    const data = await loadUserData(user.uid);
    const rr=data.recurring||[];
    const ww=data.weekly||{};
    const mm=data.monthly||{};
    const yy=data.yearly||{};
    const hh=data.history||{};
    const todayDraft=(data.dailyDrafts||{})[todayKey()]||{};
    const dd=todayDraft.extra||[];
    const doneLookup=todayDraft.doneLookup||{};

    setRecurring(rr);setWeekly(ww);setMonthly(mm);setYearly(yy);
    setHistory(hh);setDailyExtra(dd);

    const built=buildDailyTasks(rr,ww,mm,yy,dd);
    const restored=built.map(t=>({...t, done: doneLookup[t.id]===true}));
    setTasks(restored);
    setLoaded(true);
  })();
},[user.uid]);

// Save to Firestore when data changes (debounced)
useEffect(()=>{
  if(!loaded) return;
  setSaving(true);
  const doneLookup={};
  tasks.forEach(t=>{ if(t.done) doneLookup[t.id]=true; });
  const snap=tasks.map(t=>({text:t.text,done:t.done,source:t.source,time:t.time||""}));
  const newH={...history,[todayKey()]:snap};
  setHistory(newH);
  const timer=setTimeout(async()=>{
    await saveUserData(user.uid,{
      recurring, weekly, monthly, yearly,
      history: newH,
      dailyDrafts:{[todayKey()]:{extra:dailyExtra, doneLookup}},
    });
    setSaving(false);
  },800);
  return ()=>clearTimeout(timer);
},[tasks,dailyExtra,loaded]);

  function rebuild(rr,ww,mm,yy,dd,cur){
    const built=buildDailyTasks(rr,ww,mm,yy,dd);
    return built.map(t=>{ const e=cur.find(c=>c.id===t.id); return e?{...t,done:e.done}:t; });
  }
  function toggleTask(id){ setTasks(p=>p.map(t=>t.id===id?{...t,done:!t.done}:t)); }
  function deleteManual(id){
    setDailyExtra(p=>p.filter(t=>t.id!==id));
    setTasks(p=>p.filter(t=>t.id!==id));
  }

  async function handleAdd({text,time,scope,weekDay,monthDate,monthDateType,yearMonth,yearDay,yearDateType,id}){
    if(scope==="today"){
      const t={id,text,time,source:"manual",done:false};
      setDailyExtra(p=>[...p,t]); setTasks(p=>[...p,t]);
    } else if(scope==="recurring"){
      const nr=[...recurring,{id,text,time}]; setRecurring(nr);
      setTasks(rebuild(nr,weekly,monthly,yearly,dailyExtra,tasks));
    } else if(scope==="weekly"){
      const nw={...weekly,[weekDay]:[...(weekly[weekDay]||[]),{id,text,time}]};
      setWeekly(nw); setTasks(rebuild(recurring,nw,monthly,yearly,dailyExtra,tasks));
    } else if(scope==="monthly"){
      const mk=monthDateType==="undated"?"undated":monthDate;
      const nm={...monthly,[mk]:[...(monthly[mk]||[]),{id,text,time}]};
      setMonthly(nm); setTasks(rebuild(recurring,weekly,nm,yearly,dailyExtra,tasks));
    } else if(scope==="yearly"){
      const yk=yearDateType==="undated"?"undated":`${yearMonth}-${yearDay}`;
      const ny={...yearly,[yk]:[...(yearly[yk]||[]),{id,text,time}]};
      setYearly(ny); setTasks(rebuild(recurring,weekly,monthly,ny,dailyExtra,tasks));
    }
  }

  function deleteFromList(scope,id,key){
    if(scope==="recurring"){
      const nr=recurring.filter(t=>t.id!==id); setRecurring(nr);
      setTasks(rebuild(nr,weekly,monthly,yearly,dailyExtra,tasks));
    } else if(scope==="weekly"){
      const nw={...weekly,[key]:(weekly[key]||[]).filter(t=>t.id!==id)};
      setWeekly(nw); setTasks(rebuild(recurring,nw,monthly,yearly,dailyExtra,tasks));
    } else if(scope==="monthly"){
      const nm={...monthly,[key]:(monthly[key]||[]).filter(t=>t.id!==id)};
      setMonthly(nm); setTasks(rebuild(recurring,weekly,nm,yearly,dailyExtra,tasks));
    } else if(scope==="yearly"){
      const ny={...yearly,[key]:(yearly[key]||[]).filter(t=>t.id!==id)};
      setYearly(ny); setTasks(rebuild(recurring,weekly,monthly,ny,dailyExtra,tasks));
    }
  }

  function ListItem({t,scope,listKey}){
    return(
      <div style={{display:"flex",alignItems:"center",gap:10,padding:"9px 14px",
        borderRadius:10,background:"#fff",border:"1px solid #e2e8f0",marginBottom:6}}>
        <span style={{flex:1,fontSize:14,color:"#1e293b"}}>{t.text}</span>
        {t.time&&<span style={{fontSize:12,color:"#94a3b8"}}>⏰ {t.time}</span>}
        <button onClick={()=>deleteFromList(scope,t.id,listKey)} style={{
          background:"none",border:"none",cursor:"pointer",color:"#94a3b8",fontSize:18}}>×</button>
      </div>
    );
  }

  const done=tasks.filter(t=>t.done).length;
  const total=tasks.length;
  const pct=total?Math.round((done/total)*100):0;

  if(!loaded) return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
      background:"linear-gradient(135deg,#eef2ff 0%,#f0fdf4 100%)"}}>
      <div style={{fontSize:14,color:"#94a3b8"}}>Loading your tasks...</div>
    </div>
  );

  return(
    <div style={{minHeight:"100vh",background:"linear-gradient(135deg,#eef2ff 0%,#f0fdf4 100%)",paddingBottom:60}}>
      {/* Header */}
      <div style={{background:"#fff",borderBottom:"1px solid #e2e8f0",padding:"16px 20px 0",position:"sticky",top:0,zIndex:10}}>
        <div style={{maxWidth:600,margin:"0 auto"}}>
          <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:14}}>
            <div>
              <div style={{fontFamily:"'DM Serif Display',serif",fontSize:24,color:"#1e293b",lineHeight:1.1}}>My Tasks</div>
              <div style={{fontSize:12,color:"#94a3b8",marginTop:3,display:"flex",alignItems:"center",gap:6}}>
                {formatDateKey(todayKey())}
                {saving&&<span style={{fontSize:11,color:"#a5b4fc"}}>• saving...</span>}
              </div>
            </div>
            <div style={{display:"flex",gap:8,alignItems:"center"}}>
              <button onClick={()=>setShowModal(true)} style={{...btn,background:"#6366f1",color:"#fff",padding:"8px 16px",fontSize:13}}>
                + Add
              </button>
              <button onClick={()=>signOut(auth)} title="Sign out" style={{
                ...btn,background:"#f1f5f9",color:"#64748b",padding:"8px 12px",fontSize:13}}>
                ⎋
              </button>
            </div>
          </div>
          <div style={{display:"flex",borderBottom:"2px solid #f1f5f9",overflowX:"auto",WebkitOverflowScrolling:"touch"}}>
            {["today","weekly","monthly","yearly","history","notes"].map(t=>(
              <button key={t} onClick={()=>setTab(t)} style={{
                background:"none",border:"none",cursor:"pointer",padding:"8px 14px",
                fontSize:13,fontWeight:600,fontFamily:"'DM Sans',sans-serif",whiteSpace:"nowrap",
                color:tab===t?"#6366f1":"#94a3b8",
                borderBottom:tab===t?"2px solid #6366f1":"2px solid transparent",marginBottom:-2,
                textTransform:"capitalize",
              }}>{t}</button>
            ))}
          </div>
        </div>
      </div>

      <div style={{maxWidth:600,margin:"0 auto",padding:"20px 16px"}}>

        {/* TODAY */}
        {tab==="today"&&(
          <div>
            <div style={{background:"#fff",borderRadius:14,padding:"16px 18px",marginBottom:18,border:"1px solid #e2e8f0"}}>
              <div style={{display:"flex",justifyContent:"space-between",marginBottom:8}}>
                <span style={{fontSize:13,fontWeight:600,color:"#64748b"}}>Today's progress</span>
                <span style={{fontSize:13,fontWeight:700,color:"#6366f1"}}>{done}/{total} done</span>
              </div>
              <div style={{height:8,background:"#f1f5f9",borderRadius:99,overflow:"hidden"}}>
                <div style={{height:"100%",width:`${pct}%`,background:"linear-gradient(90deg,#6366f1,#8b5cf6)",
                  borderRadius:99,transition:"width 0.4s ease"}}/>
              </div>
              <div style={{fontSize:11,color:"#94a3b8",marginTop:5}}>{pct}% complete</div>
            </div>
            {tasks.length===0&&(
              <div style={{textAlign:"center",color:"#94a3b8",padding:"40px 0",fontSize:14}}>
                No tasks today. Tap "+ Add" to get started.
              </div>
            )}
            {[...tasks].sort((a,b)=>{
              if(a.time&&b.time) return a.time.localeCompare(b.time);
              if(a.time) return -1; if(b.time) return 1; return 0;
            }).map(t=>(
              <TaskRow key={t.id} task={t} onToggle={()=>toggleTask(t.id)} onDelete={()=>deleteManual(t.id)}/>
            ))}
          </div>
        )}

        {tab==="weekly"&&(
  <div>
    <div style={{marginBottom:24}}>
      <div style={{fontSize:13,fontWeight:700,color:"#f59e0b",marginBottom:7,textTransform:"uppercase",letterSpacing:1}}>🔁 Recurring (every day)</div>
      {recurring.length===0
        ?<div style={{fontSize:13,color:"#cbd5e1",paddingLeft:4}}>No recurring tasks</div>
        :recurring.map(t=><ListItem key={t.id} t={t} scope="recurring" listKey={null}/>)
      }
    </div>
    <p style={{fontSize:13,color:"#94a3b8",marginTop:0}}>Appears automatically on the chosen day.</p>
    {DAYS.map(day=>(
      <div key={day} style={{marginBottom:18}}>
        <div style={{fontSize:13,fontWeight:700,color:"#6366f1",marginBottom:7,textTransform:"uppercase",letterSpacing:1}}>{day}</div>
        {(weekly[day]||[]).length===0
          ?<div style={{fontSize:13,color:"#cbd5e1",paddingLeft:4}}>No tasks</div>
          :(weekly[day]||[]).map(t=><ListItem key={t.id} t={t} scope="weekly" listKey={day}/>)
        }
      </div>
    ))}
  </div>
)}

        {/* MONTHLY */}
        {tab==="monthly"&&(
          <div>
            <p style={{fontSize:13,color:"#94a3b8",marginTop:0}}>Appears on a specific date each month, or every day if no date set.</p>
            {(monthly["undated"]||[]).length>0&&(
              <div style={{marginBottom:18}}>
                <div style={{fontSize:13,fontWeight:700,color:"#10b981",marginBottom:7,textTransform:"uppercase",letterSpacing:1}}>📋 No specific date</div>
                {(monthly["undated"]||[]).map(t=><ListItem key={t.id} t={t} scope="monthly" listKey="undated"/>)}
              </div>
            )}
            {Array.from({length:31},(_,i)=>i+1).map(date=>{
              const dt=monthly[date]||[]; if(!dt.length) return null;
              return(
                <div key={date} style={{marginBottom:18}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#10b981",marginBottom:7,textTransform:"uppercase",letterSpacing:1}}>Day {date}</div>
                  {dt.map(t=><ListItem key={t.id} t={t} scope="monthly" listKey={date}/>)}
                </div>
              );
            })}
            {Object.keys(monthly).length===0&&<div style={{fontSize:13,color:"#cbd5e1"}}>No monthly tasks yet.</div>}
          </div>
        )}

        {/* YEARLY */}
        {tab==="yearly"&&(
          <div>
            <p style={{fontSize:13,color:"#94a3b8",marginTop:0}}>Appears once a year, or every day if no date set.</p>
            {(yearly["undated"]||[]).length>0&&(
              <div style={{marginBottom:18}}>
                <div style={{fontSize:13,fontWeight:700,color:"#ec4899",marginBottom:7,textTransform:"uppercase",letterSpacing:1}}>📋 No specific date</div>
                {(yearly["undated"]||[]).map(t=><ListItem key={t.id} t={t} scope="yearly" listKey="undated"/>)}
              </div>
            )}
            {Object.entries(yearly).filter(([k])=>k!=="undated").map(([key,tList])=>{
              const[m,d]=key.split("-");
              return(
                <div key={key} style={{marginBottom:18}}>
                  <div style={{fontSize:13,fontWeight:700,color:"#ec4899",marginBottom:7,textTransform:"uppercase",letterSpacing:1}}>{MONTHS[+m-1]} {d}</div>
                  {tList.map(t=><ListItem key={t.id} t={t} scope="yearly" listKey={key}/>)}
                </div>
              );
            })}
            {Object.keys(yearly).length===0&&<div style={{fontSize:13,color:"#cbd5e1"}}>No yearly tasks yet.</div>}
          </div>
        )}

        {tab==="history"&&<CalendarHistory history={history}/>}

{tab==="notes"&&(
  <NotesTab uid={user.uid} />
)}
      </div>

      {showModal&&<AddTaskModal onClose={()=>setShowModal(false)} onAdd={handleAdd}/>}
    </div>
  );
}

// ─── Root App with Auth ───────────────────────────────────────
export default function App() {
  const [user, setUser] = useState(undefined); // undefined = loading

  useEffect(()=>{
    const unsub = onAuthStateChanged(auth, u => setUser(u||null));
    return unsub;
  },[]);

  if(user===undefined) return(
    <div style={{minHeight:"100vh",display:"flex",alignItems:"center",justifyContent:"center",
      background:"linear-gradient(135deg,#eef2ff 0%,#f0fdf4 100%)"}}>
      <div style={{fontSize:14,color:"#94a3b8"}}>Loading...</div>
    </div>
  );

  if(!user) return <LoginPage/>;
  return <TodoApp user={user}/>;
}
