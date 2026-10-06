export interface MetricSample {
  labels?: Record<string, string>;
  value: number | bigint;
}

export interface Metric {
  name: string;
  help: string;
  samples: MetricSample[];
}

const escapeLabel = (value: string) => value.replace(/\\/g, "\\\\").replace(/"/g, '\\"').replace(/\n/g, "\\n");
const escapeHelp = (value: string) => value.replace(/\\/g, "\\\\").replace(/\n/g, "\\n");

function formatValue(value: number | bigint): string {
  if (typeof value === "bigint") return value.toString();
  return Number.isFinite(value) ? String(value) : "0";
}

function formatSample(name: string, sample: MetricSample): string {
  const pairs = Object.entries(sample.labels ?? {}).map(([key, value]) => `${key}="${escapeLabel(value)}"`);
  return `${name}${pairs.length ? `{${pairs.join(",")}}` : ""} ${formatValue(sample.value)}`;
}

/** The Prometheus text format (version 0.0.4). Every metric is a gauge; one without samples is left out. */
export function formatMetrics(metrics: Metric[]): string {
  const lines: string[] = [];
  for (const metric of metrics) {
    if (metric.samples.length === 0) continue;
    lines.push(`# HELP ${metric.name} ${escapeHelp(metric.help)}`, `# TYPE ${metric.name} gauge`);
    for (const sample of metric.samples) lines.push(formatSample(metric.name, sample));
  }
  return `${lines.join("\n")}\n`;
}
