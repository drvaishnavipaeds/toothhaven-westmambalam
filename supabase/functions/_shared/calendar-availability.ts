/** A successful HTTP response can still contain per-calendar authorization errors. */
export function calendarBusyPeriods(response: unknown): { start: string; end: string }[] {
  const primary = (response as { calendars?: { primary?: { errors?: unknown[]; busy?: unknown } } } | null)?.calendars?.primary;
  if (!primary || (primary.errors && primary.errors.length > 0) || !Array.isArray(primary.busy)) {
    throw new Error("Clinic calendar availability could not be verified. Please contact the clinic or try again later.");
  }
  return primary.busy.map((value: unknown) => {
    const period = value as { start?: unknown; end?: unknown } | null;
    if (!period || typeof period.start !== "string" || typeof period.end !== "string" ||
      !Number.isFinite(Date.parse(period.start)) || !Number.isFinite(Date.parse(period.end)) ||
      Date.parse(period.end) <= Date.parse(period.start)) {
      throw new Error("Clinic calendar returned invalid availability. Please try again later.");
    }
    return { start: period.start, end: period.end };
  });
}