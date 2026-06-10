import Link from "next/link";

type SectionHeaderProps = {
  title: string;
  href?: string;
  eyebrow?: string;
  description?: string;
  linkLabel?: string;
};

export function SectionHeader({ title, href, eyebrow = "Seleção da loja", description, linkLabel = "Ver todos" }: SectionHeaderProps) {
  return (
    <div className="mb-5 flex items-end justify-between gap-4">
      <div>
        <p className="text-sm font-medium uppercase text-brand-blue">{eyebrow}</p>
        <h2 className="mt-1 text-xl font-semibold md:text-2xl">{title}</h2>
        {description ? <p className="mt-2 max-w-2xl text-sm leading-6 text-gray-600">{description}</p> : null}
      </div>
      {href ? (
        <Link className="min-w-max rounded-sm border border-line bg-white px-4 py-3 text-sm font-medium hover:border-ink" href={href}>
          {linkLabel}
        </Link>
      ) : null}
    </div>
  );
}
