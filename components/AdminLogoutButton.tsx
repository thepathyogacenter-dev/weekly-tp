"use client";

export function AdminLogoutButton() {
  async function logout() {
    await fetch("/api/admin/logout", { method: "POST" });
    window.location.assign("/admin/login");
  }

  return <button className="admin-logout" type="button" onClick={logout}>Log out</button>;
}
