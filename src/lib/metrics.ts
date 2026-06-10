import type { PromMetric } from './types';

export function parsePrometheus(text: string): PromMetric[] {
  const metrics: PromMetric[] = [];
  for (const line of text.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const match = trimmed.match(/^([a-zA-Z_:][\w:]*)(\{([^}]*)\})?\s+(-?\d+(?:\.\d+)?(?:e[+-]?\d+)?)$/i);
    if (!match) continue;
    const labels: Record<string, string> = {};
    const rawLabels = match[3];
    if (rawLabels) {
      for (const label of rawLabels.split(',')) {
        const [key, rawValue] = label.split('=');
        if (!key || !rawValue) continue;
        labels[key.trim()] = rawValue.trim().replace(/^"|"$/g, '');
      }
    }
    metrics.push({ name: match[1], labels, value: Number(match[4]) });
  }
  return metrics;
}

export function metricSum(metrics: PromMetric[], name: string) {
  return metrics.filter((metric) => metric.name === name).reduce((sum, metric) => sum + metric.value, 0);
}

export function metricSeries(metrics: PromMetric[], name: string, labelKey = 'org_id') {
  return metrics
    .filter((metric) => metric.name === name)
    .map((metric) => ({
      name: metric.labels[labelKey] ?? 'global',
      value: metric.value,
    }));
}
