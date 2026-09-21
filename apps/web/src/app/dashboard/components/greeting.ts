export type GreetingKey = "morning" | "afternoon" | "evening" | "night";

/** Which greeting fits the local hour. */
export function greetingKey(hour: number): GreetingKey {
  if (hour < 5) return "night";
  if (hour < 12) return "morning";
  if (hour < 18) return "afternoon";
  if (hour < 23) return "evening";
  return "night";
}
