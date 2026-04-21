import { useState } from "react";
import { auth, googleProvider } from "./firebase";
import {
  signInWithPopup,
  signInWithEmailAndPassword,
  createUserWithEmailAndPassword,
} from "firebase/auth";

const inp = {
  width: "100%", padding: "11px 14px", borderRadius: 10,
  border: "1.5px solid #e2e8f0", fontSize: 14, outline: "none",
  fontFamily: "'DM Sans', sans-serif", background: "#f8fafc", color: "#1e293b",
  marginBottom: 10,
};

export default function LoginPage() {
  const [mode, setMode] = useState("login"); // "login" | "register"
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  async function handleEmail() {
    if (!email || !password) return setError("Please fill in both fields.");
    setLoading(true); setError("");
    try {
      if (mode === "login") {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        await createUserWithEmailAndPassword(auth, email, password);
      }
    } catch (e) {
      setError(e.message.replace("Firebase: ", "").replace(/\(auth.*\)\.?/, ""));
    }
    setLoading(false);
  }

  async function handleGoogle() {
    setLoading(true); setError("");
    try {
      await signInWithPopup(auth, googleProvider);
    } catch (e) {
      setError(e.message.replace("Firebase: ", "").replace(/\(auth.*\)\.?/, ""));
    }
    setLoading(false);
  }

  return (
    <div style={{
      minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center",
      background: "linear-gradient(135deg, #eef2ff 0%, #f0fdf4 100%)", padding: 16,
    }}>
      <div style={{
        background: "#fff", borderRadius: 20, padding: 32, width: "100%", maxWidth: 380,
        boxShadow: "0 20px 60px #0002",
      }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 28 }}>
          <div style={{ fontSize: 36, marginBottom: 8 }}>✅</div>
          <div style={{ fontFamily: "'DM Serif Display', serif", fontSize: 26, color: "#1e293b" }}>
            My Tasks
          </div>
          <div style={{ fontSize: 13, color: "#94a3b8", marginTop: 4 }}>
            {mode === "login" ? "Welcome back" : "Create your account"}
          </div>
        </div>

        {/* Google button */}
        <button onClick={handleGoogle} disabled={loading} style={{
          width: "100%", padding: "11px 0", borderRadius: 10, border: "1.5px solid #e2e8f0",
          background: "#fff", cursor: "pointer", fontSize: 14, fontWeight: 600,
          fontFamily: "'DM Sans', sans-serif", color: "#1e293b", marginBottom: 16,
          display: "flex", alignItems: "center", justifyContent: "center", gap: 10,
        }}>
          <svg width="18" height="18" viewBox="0 0 48 48">
            <path fill="#4285F4" d="M44.5 20H24v8.5h11.8C34.7 33.9 30.1 37 24 37c-7.2 0-13-5.8-13-13s5.8-13 13-13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 11.8 2 2 11.8 2 24s9.8 22 22 22c11 0 21-8 21-22 0-1.3-.2-2.7-.5-4z"/>
            <path fill="#34A853" d="M6.3 14.7l7 5.1C15 16.1 19.1 13 24 13c3.1 0 5.9 1.1 8.1 2.9l6.4-6.4C34.6 4.1 29.6 2 24 2 16.3 2 9.7 7.4 6.3 14.7z"/>
            <path fill="#FBBC05" d="M24 46c5.4 0 10.3-1.8 14.1-4.8l-6.5-5.3C29.6 37.6 26.9 38.5 24 38.5c-6 0-11.1-4-12.9-9.5l-7 5.4C7.8 41.8 15.4 46 24 46z"/>
            <path fill="#EA4335" d="M44.5 20H24v8.5h11.8c-.9 2.8-2.8 5.1-5.3 6.7l6.5 5.3C41.1 37.3 45 31.1 45 24c0-1.3-.2-2.7-.5-4z"/>
          </svg>
          Continue with Google
        </button>

        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
          <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
          <span style={{ fontSize: 12, color: "#94a3b8" }}>or</span>
          <div style={{ flex: 1, height: 1, background: "#e2e8f0" }} />
        </div>

        {/* Email / password */}
        <input value={email} onChange={e => setEmail(e.target.value)}
          placeholder="Email address" type="email" style={inp}
          onKeyDown={e => e.key === "Enter" && handleEmail()} />
        <input value={password} onChange={e => setPassword(e.target.value)}
          placeholder="Password" type="password" style={inp}
          onKeyDown={e => e.key === "Enter" && handleEmail()} />

        {error && (
          <div style={{ fontSize: 12, color: "#ef4444", marginBottom: 10, padding: "8px 12px",
            background: "#fef2f2", borderRadius: 8 }}>{error}</div>
        )}

        <button onClick={handleEmail} disabled={loading} style={{
          width: "100%", padding: "12px 0", borderRadius: 10, border: "none",
          background: "#6366f1", color: "#fff", fontSize: 14, fontWeight: 700,
          fontFamily: "'DM Sans', sans-serif", cursor: "pointer", marginBottom: 14,
          opacity: loading ? 0.7 : 1,
        }}>
          {loading ? "Please wait..." : mode === "login" ? "Sign In" : "Create Account"}
        </button>

        <div style={{ textAlign: "center", fontSize: 13, color: "#64748b" }}>
          {mode === "login" ? "Don't have an account? " : "Already have an account? "}
          <span onClick={() => { setMode(mode === "login" ? "register" : "login"); setError(""); }}
            style={{ color: "#6366f1", cursor: "pointer", fontWeight: 600 }}>
            {mode === "login" ? "Sign up" : "Sign in"}
          </span>
        </div>
      </div>
    </div>
  );
}
