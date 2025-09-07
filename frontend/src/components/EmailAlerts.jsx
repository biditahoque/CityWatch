import { useEffect, useState } from "react";
import { supabase } from "../api/supabase"; // your existing client

const CITY = "Toronto";

export default function EmailAlerts() {
  const [user, setUser] = useState(null);
  const [email, setEmail] = useState("");
  const [wantsNew, setWantsNew] = useState(true);
  const [wantsResolved, setWantsResolved] = useState(false);
  const [verified, setVerified] = useState(false);
  const [saving, setSaving] = useState(false);
  const [status, setStatus] = useState("");

  useEffect(() => {
    (async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user || null);
      const defaultEmail = user?.email ?? "";
      setEmail(defaultEmail);

      if (user) {
        const { data } = await supabase
          .from("email_subscriptions")
          .select("*")
          .eq("user_id", user.id)
          .eq("city", CITY)
          .maybeSingle();
        if (data) {
          setEmail(data.email || defaultEmail);
          setWantsNew(!!data.wants_new_issues);
          setWantsResolved(!!data.wants_resolved);
          setVerified(!!data.verified_at);
        }
      }
    })();
  }, []);

  async function savePrefs() {
    if (!user) return;
    setSaving(true);
    setStatus("");
    const { error } = await supabase.from("email_subscriptions").upsert({
      user_id: user.id,
      city: CITY,
      email,
      wants_new_issues: wantsNew,
      wants_resolved: wantsResolved,
    }, { onConflict: "user_id,city" });
    setSaving(false);
    setStatus(error ? `Save failed: ${error.message}` : "Preferences saved.");
  }

  async function sendVerify() {
    setStatus("Sending verification email...");
    const { error } = await supabase.functions.invoke("alerts", {
      method: "POST",
      body: { action: "send-verify", email, city: CITY, wantsNewIssues: wantsNew, wantsResolved },
    });
    setStatus(error ? `Failed: ${error.message}` : "Verification email sent. Check your inbox.");
  }


   // TEMP: call the diag route and show result
  async function runDiag() {
    const { data, error } = await supabase.functions.invoke("alerts", {
      method: "POST",
      body: { action: "diag" }, // our function handles this action
    });
    console.log("diag data:", data, "error:", error);
    const msg = error?.context?.error || error?.message || JSON.stringify(data);
    alert(msg);
  }


  return (
    <div className="card">
      <h3>Email alerts</h3>
      {!user && <p>Sign in to manage email alerts.</p>}

      {user && (
        <>
          <label>Email</label>
          <input value={email} onChange={(e) => setEmail(e.target.value)} />

          <div style={{ marginTop: 8 }}>
            <label><input type="checkbox" checked={wantsNew} onChange={e => setWantsNew(e.target.checked)} /> New Issues</label>
            <label style={{ marginLeft: 12 }}><input type="checkbox" checked={wantsResolved} onChange={e => setWantsResolved(e.target.checked)} /> Resolved</label>
          </div>

          <div style={{ marginTop: 8 }}>
            <button onClick={savePrefs} disabled={saving}>Save</button>
            <button onClick={sendVerify} style={{ marginLeft: 8 }}>Send verification</button>
	    <button onClick={runDiag} style={{ marginLeft: 8 }}>Run diag</button>
            {verified ? <span style={{ marginLeft: 8 }}>? Verified</span> : <span style={{ marginLeft: 8 }}>? Not verified</span>}
          </div>

          {status && <p style={{ marginTop: 8 }}>{status}</p>}
        </>
      )}
    </div>
  );
}

