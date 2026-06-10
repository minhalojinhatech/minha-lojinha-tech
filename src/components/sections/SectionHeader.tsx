export function SectionHeader({
  eyebrow,
  title,
  text
}: {
  eyebrow?: string;
  title: string;
  text?: string;
}) {
  return (
    <div className="mb-7 max-w-3xl">
      {eyebrow && <p className="text-sm font-black uppercase tracking-wide text-teal">{eyebrow}</p>}
      <h2 className="mt-2 text-3xl font-black leading-tight text-ink sm:text-4xl">{title}</h2>
      {text && <p className="mt-3 text-base leading-7 text-graphite">{text}</p>}
    </div>
  );
}
