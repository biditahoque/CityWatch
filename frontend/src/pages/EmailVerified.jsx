// src/pages/EmailVerified.jsx
import { useLocation } from "react-router-dom";
export default function EmailVerified() {
  const ok = new URLSearchParams(useLocation().search).get("ok") === "1";
  return <div style={{ padding: 24 }}>{ok ? "Your email is verified. ??" : "Verification failed or link expired."}</div>;
}

