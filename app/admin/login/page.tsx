import "../../stories/stories.css";
import { AdminLoginForm } from "@/components/AdminLoginForm";

export const metadata = {
  title: "Admin Login — The Path",
  description: "Secure access to The Path admin story downloads.",
};

export default function AdminLoginPage() {
  return (
    <main className="admin-login-shell">
      <section className="admin-login-card" aria-labelledby="admin-login-title">
        <p className="stories-eyebrow">The Path · Admin</p>
        <h1 id="admin-login-title">Admin login</h1>
        <p>Story downloads are for administrators only.</p>
        <AdminLoginForm />
        <a className="stories-back" href="/teachers">← Go to teacher portal</a>
      </section>
    </main>
  );
}
