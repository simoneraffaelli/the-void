export default function AmbientGlow() {
  return (
    <>
      <div
        className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[800px] h-[800px] rounded-full blur-[120px] pointer-events-none"
        style={{ background: "rgba(46, 91, 255, 0.04)" }}
      />
      <div
        className="absolute top-[20%] left-[15%] w-96 h-px rotate-45 blur-sm pointer-events-none"
        style={{ background: "linear-gradient(to right, transparent, rgba(184,195,255,0.15), transparent)" }}
      />
      <div
        className="absolute bottom-[30%] right-[10%] w-[500px] h-px -rotate-12 blur-md pointer-events-none"
        style={{ background: "linear-gradient(to right, transparent, rgba(46,91,255,0.1), transparent)" }}
      />
    </>
  );
}
