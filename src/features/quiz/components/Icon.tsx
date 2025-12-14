interface IconProps {
  name: string;
  className?: string;
  title?: string;
}

export function Icon({ name, className = "", title }: IconProps) {
  const isWhite = className.includes("text-white");
  return (
    <img
      src={`/icons/afran-r14/${name}.svg`}
      alt={title || name}
      title={title || name}
      className={className}
      style={{ 
        display: "inline-block",
        ...(isWhite && { filter: "brightness(0) invert(1)" })
      }}
    />
  );
}
