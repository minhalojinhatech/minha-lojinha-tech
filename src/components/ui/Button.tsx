import Link from "next/link";
import clsx from "clsx";

type ButtonProps = {
  children: React.ReactNode;
  href?: string;
  onClick?: () => void;
  variant?: "primary" | "secondary" | "ghost" | "dark";
  className?: string;
  type?: "button" | "submit";
};

const variants = {
  primary: "bg-teal text-white shadow-soft hover:bg-[#008f72]",
  secondary: "bg-white text-ink border border-line hover:border-teal hover:text-teal",
  ghost: "text-graphite hover:bg-white/70",
  dark: "bg-ink text-white hover:bg-graphite"
};

export function Button({
  children,
  href,
  onClick,
  variant = "primary",
  className,
  type = "button"
}: ButtonProps) {
  const classes = clsx(
    "focus-ring inline-flex min-h-11 items-center justify-center rounded-full px-5 py-2.5 text-sm font-semibold transition",
    variants[variant],
    className
  );

  if (href) {
    return (
      <Link href={href} className={classes}>
        {children}
      </Link>
    );
  }

  return (
    <button type={type} onClick={onClick} className={classes}>
      {children}
    </button>
  );
}
