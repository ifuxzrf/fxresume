import { parse as parseYaml } from "yaml";

function splitFrontmatter(raw = "") {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n/);
  if (!match) {
    return { data: {}, content: raw };
  }

  let data = {};
  try {
    const parsed = parseYaml(match[1]);
    if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
      data = parsed;
    }
  } catch {
    data = {};
  }

  return { data, content: raw.slice(match[0].length) };
}

function normalizeTooltips(raw) {
  if (!raw || typeof raw !== "object" || Array.isArray(raw)) {
    return {};
  }

  const tooltips = {};
  for (const [key, value] of Object.entries(raw)) {
    if (typeof key !== "string" || !key.trim()) {
      continue;
    }
    if (typeof value !== "string") {
      continue;
    }
    const text = value.trim();
    if (text) {
      tooltips[key.trim()] = text;
    }
  }
  return tooltips;
}

export function parseResumeMarkdown(raw = "") {
  const { data, content } = splitFrontmatter(raw);
  return {
    body: content,
    frontmatter: data,
    tooltips: normalizeTooltips(data.tooltips)
  };
}
