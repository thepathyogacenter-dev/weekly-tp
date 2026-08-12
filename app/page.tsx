export default async function Page() {
  return (
    <main className="portal-intro">
      <header className="portal-intro-head">
        <p className="eyebrow">The Path · Canggu</p>
        <h1>Welcome</h1>
        <p>Choose your portal to continue.</p>
      </header>

      <div className="portal-choice-grid">
        <a className="portal-choice" href="/teachers">
          <span className="portal-choice-kicker">For teachers</span>
          <strong>Teacher Portal</strong>
          <p>Download the weekly bulletin and manage your personal calendar.</p>
          <span className="portal-choice-link">Enter teacher portal →</span>
        </a>
        <a className="portal-choice portal-choice-admin" href="/admin/login">
          <span className="portal-choice-kicker">For administrators</span>
          <strong>Admin Dashboard</strong>
          <p>Create and download daily and weekly story schedules.</p>
          <span className="portal-choice-link">Admin login →</span>
        </a>
      </div>
    </main>
  );
}
