function initials(name: string): string {
  const parts = name.split(/\s+/).filter(Boolean);
  if (!parts.length) return "—";
  return (parts[0][0] + (parts[1]?.[0] ?? "")).toUpperCase();
}

export function Avatar({ name, photo }: { name: string; photo?: string }) {
  if (photo) {
    return (
      <span className="avatar">
        {/* img biasa, bukan next/image: URL-nya datang dari Google Sheet dan bisa domain apa saja */}
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={photo} alt={name} loading="lazy" />
      </span>
    );
  }
  return (
    <span className="avatar" title={name} aria-hidden="true">
      {initials(name)}
    </span>
  );
}

export function AvatarStack({
  teachers,
  photos,
}: {
  teachers: string[];
  photos: Record<string, string>;
}) {
  const shown = teachers.slice(0, 2);
  if (!shown.length) return <span className="avatar" aria-hidden="true">—</span>;

  return (
    <span className="avatar-stack">
      {shown.map((t) => (
        <Avatar key={t} name={t} photo={photos[t]} />
      ))}
    </span>
  );
}
