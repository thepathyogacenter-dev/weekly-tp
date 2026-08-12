"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

export function AdminLoginForm() {
  const router = useRouter();
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  async function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      const response = await fetch("/api/admin/login", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ password }),
      });
      if (!response.ok) {
        const result = await response.json().catch(() => null);
        setError(result?.error ?? "Unable to log in.");
        return;
      }
      router.replace("/stories");
      router.refresh();
    } catch {
      setError("Unable to log in. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <form className="admin-login-form" onSubmit={onSubmit}>
      <label htmlFor="admin-password">Password</label>
      <input
        id="admin-password"
        type="password"
        value={password}
        onChange={(event) => setPassword(event.target.value)}
        autoComplete="current-password"
        required
      />
      {error && <p className="admin-login-error" role="alert">{error}</p>}
      <button type="submit" disabled={submitting}>{submitting ? "Logging in…" : "Log in"}</button>
    </form>
  );
}
