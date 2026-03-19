export default function AppLogo({ variant = "full" }) {
  const className = variant === "icon" ? "logoSprite logoIcon" : "logoSprite logoFull";
  return (
    <div className={className} role="img" aria-label="RiskOracle logo" />
  );
}
