/** A quiet static backdrop shared by legacy form surfaces. */
export function BackgroundLights() {
  return <div aria-hidden="true" className="pointer-events-none absolute inset-0 -z-10 bg-background" />;
}
