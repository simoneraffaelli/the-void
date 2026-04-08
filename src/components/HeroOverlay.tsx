export default function HeroOverlay() {
  return (
    <div className="absolute inset-0 flex items-center justify-center pointer-events-none z-10 select-none">
      <div className="text-center px-6">
        <h1
          className="text-3xl sm:text-5xl md:text-6xl italic tracking-tight leading-tight opacity-[0.06]"
          style={{ fontFamily: "var(--font-display), serif", color: "var(--on-surface)" }}
        >
          The Void is Our Shared Breath
        </h1>
        <p
          className="mt-3 sm:mt-4 text-[9px] sm:text-[11px] uppercase tracking-[0.35em] opacity-[0.08]"
          style={{ color: "var(--on-surface)" }}
        >
          Every stroke is permanent. Every presence is temporary.
        </p>
      </div>
    </div>
  );
}
