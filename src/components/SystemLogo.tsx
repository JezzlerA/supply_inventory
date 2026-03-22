import { cn } from "@/lib/utils";

type LogoVariant = "navbar" | "sidebar" | "login" | "print";

interface SystemLogoProps extends React.HTMLAttributes<HTMLDivElement> {
  variant?: LogoVariant;
}

const sizeClasses: Record<LogoVariant, string> = {
  navbar: "w-10 h-10 md:w-12 md:h-12",
  sidebar: "w-12 h-12",
  login: "w-24 h-24 md:w-32 md:h-32",
  print: "w-14 h-14",
};

export const SystemLogo: React.FC<SystemLogoProps> = ({ variant = "navbar", className, ...props }) => {
  const sizeClass = sizeClasses[variant];

  return (
    <div
      className={cn(
        "logo-container relative flex items-center justify-center overflow-hidden rounded-full bg-white/90 shadow-md",
        "animate-logo-fade-in",
        sizeClass,
        className,
      )}
      title="Negros Oriental State University"
      {...props}
    >
      <img
        src="/norsu-logo.png"
        alt="Negros Oriental State University"
        className="w-full h-full object-contain"
        loading="lazy"
      />
    </div>
  );
};

export default SystemLogo;

