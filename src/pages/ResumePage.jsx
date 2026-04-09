import { useEffect, useMemo, useState } from "react";
import ResumeRenderer from "../components/ResumeRenderer";
import { parseResumeMarkdown } from "../utils/parseResumeMarkdown";

function stripFrontmatter(markdown = "") {
  return markdown.replace(/^---\r?\n[\s\S]*?\r?\n---\r?\n/, "");
}

function normalizeHeadingText(value = "") {
  return value
    .replace(/<[^>]*>/g, " ")
    .replace(/`/g, "")
    .replace(/\[(.*?)\]\(.*?\)/g, "$1")
    .replace(/[~*_>#-]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function slugify(value = "") {
  const normalized = normalizeHeadingText(value)
    .toLowerCase()
    .replace(/[^a-z0-9\u4e00-\u9fa5\s-]/g, "")
    .trim()
    .replace(/\s+/g, "-");
  return normalized || "section";
}

function extractToc(markdown = "") {
  const content = stripFrontmatter(markdown);
  const lines = content.split(/\r?\n/);
  const counter = new Map();
  const toc = [];

  for (const line of lines) {
    const match = line.match(/^(#{2,3})\s+(.+)$/);
    const workHeaderMatch = line.match(
      /^<div class="work-header"><h3>(.*?)<\/h3><span class="work-meta">.*?<\/span><\/div>$/
    );

    if (!match && !workHeaderMatch) {
      continue;
    }

    const level = match ? match[1].length : 3;
    const headingRawTitle = match ? match[2] : workHeaderMatch[1];
    const titleWithoutMeta = headingRawTitle.replace(/`[^`]+`\s*$/g, "").trim();
    const titleWithoutCompany = titleWithoutMeta.replace(/\s*[（(][^（）()]+[)）]\s*$/g, "").trim();
    const title = normalizeHeadingText(titleWithoutCompany || titleWithoutMeta || headingRawTitle);
    if (!title) {
      continue;
    }

    const base = slugify(title);
    const count = counter.get(base) ?? 0;
    counter.set(base, count + 1);
    const id = count === 0 ? base : `${base}-${count + 1}`;
    toc.push({ id, title, level });
  }

  return toc;
}

function findHeadingElementByTocItem(item, usedElements) {
  const selector = item.level === 2 ? ".resume-content h2" : ".resume-content h3";
  const candidates = Array.from(document.querySelectorAll(selector));

  return (
    candidates.find((element) => {
      if (usedElements.has(element)) {
        return false;
      }
      const text = normalizeHeadingText(element.textContent ?? "");
      return text === item.title;
    }) ?? null
  );
}

function escapeHtml(value = "") {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
}

function formatSummaryText(value = "") {
  return escapeHtml(
    value
      .replace(/<[^>]*>/g, " ")
      .replace(/`/g, "")
      .replace(/\[(.*?)\]\(.*?\)/g, "$1")
      .replace(/\s+/g, " ")
      .trim()
  );
}

function splitRawHeadingTitleAndMeta(value = "") {
  const compact = value.replace(/\s+/g, " ").trim();
  const matched = compact.match(/^(.*?)`([^`]+)`\s*$/);
  if (!matched) {
    return {
      title: compact,
      meta: ""
    };
  }

  return {
    title: matched[1].trim(),
    meta: matched[2].trim()
  };
}

function trimProjectBody(lines = []) {
  let start = 0;
  let end = lines.length;

  while (start < end && (!lines[start].trim() || /^\s*---+\s*$/.test(lines[start]))) {
    start += 1;
  }
  while (end > start && (!lines[end - 1].trim() || /^\s*---+\s*$/.test(lines[end - 1]))) {
    end -= 1;
  }

  return lines.slice(start, end);
}

function isPageBreakLine(line = "") {
  return /^<div[^>]*class=["'][^"']*\bpage-break\b[^"']*["'][^>]*><\/div>\s*$/i.test(
    line.trim()
  );
}

function splitBodyAndTrailingUtility(lines = []) {
  const trailing = [];
  let end = lines.length;

  while (end > 0) {
    const current = lines[end - 1];
    const trimmed = current.trim();
    const isUtility = !trimmed || /^\s*---+\s*$/.test(current) || isPageBreakLine(current);
    if (!isUtility) {
      break;
    }
    trailing.unshift(current);
    end -= 1;
  }

  return {
    body: trimProjectBody(lines.slice(0, end)),
    trailing
  };
}

function splitHeadingTitleAndMeta(value = "") {
  const { title, meta } = splitRawHeadingTitleAndMeta(value);
  return {
    title: formatSummaryText(title),
    meta: formatSummaryText(meta)
  };
}

function splitProjectTitleAndCompany(projectTitle = "") {
  const compact = projectTitle.replace(/\s+/g, " ").trim();
  const matched = compact.match(/^(.*?)\s*[（(]([^（）()]+)[)）]\s*$/);
  if (!matched) {
    return {
      projectName: compact,
      company: ""
    };
  }

  return {
    projectName: matched[1].trim(),
    company: matched[2].trim()
  };
}

function escapeRegExp(value = "") {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildSectionCollapsibleMarkdown(markdown = "", options) {
  const { sectionTitle, detailsClass, summaryBuilder, isExpandedByDefault } = options;
  const lines = markdown.split(/\r?\n/);
  const sectionRegex = new RegExp(`^##\\s+${escapeRegExp(sectionTitle)}\\s*$`);

  let sectionStart = -1;
  for (let i = 0; i < lines.length; i += 1) {
    if (sectionRegex.test(lines[i])) {
      sectionStart = i;
      break;
    }
  }

  if (sectionStart < 0) {
    return markdown;
  }

  let sectionEnd = lines.length;
  for (let i = sectionStart + 1; i < lines.length; i += 1) {
    if (/^##\s+/.test(lines[i])) {
      sectionEnd = i;
      break;
    }
  }

  const sectionLines = lines.slice(sectionStart + 1, sectionEnd);
  const rebuiltSection = [];
  const detailsOpenAttr = isExpandedByDefault ? " open" : "";

  for (let i = 0; i < sectionLines.length; ) {
    const headingMatch = sectionLines[i].match(/^###\s+(.+)$/);
    if (!headingMatch) {
      rebuiltSection.push(sectionLines[i]);
      i += 1;
      continue;
    }

    const title = headingMatch[1].trim();
    let j = i + 1;
    while (j < sectionLines.length && !/^###\s+/.test(sectionLines[j])) {
      j += 1;
    }

    const { body: bodyLines, trailing } = splitBodyAndTrailingUtility(sectionLines.slice(i + 1, j));
    rebuiltSection.push(`<details class="${detailsClass}"${detailsOpenAttr}>`);
    rebuiltSection.push(summaryBuilder(title));
    rebuiltSection.push("");
    if (bodyLines.length > 0) {
      rebuiltSection.push(...bodyLines);
    }
    rebuiltSection.push("</details>");
    if (trailing.length > 0) {
      rebuiltSection.push(...trailing);
    }
    rebuiltSection.push("");

    i = j;
  }

  return [...lines.slice(0, sectionStart + 1), ...rebuiltSection, ...lines.slice(sectionEnd)].join("\n");
}

function ResumePage({ markdown }) {
  const { body, tooltips } = useMemo(() => parseResumeMarkdown(markdown), [markdown]);
  const toc = useMemo(() => extractToc(body), [body]);
  const [isTocVisible, setIsTocVisible] = useState(true);
  const [areSectionsExpanded, setAreSectionsExpanded] = useState(true);
  const renderedMarkdown = useMemo(() => {
    const withWorkCollapsible = buildSectionCollapsibleMarkdown(body, {
      sectionTitle: "工作经历",
      detailsClass: "work-details",
      isExpandedByDefault: areSectionsExpanded,
      summaryBuilder: (headingTitle) => {
        const { title, meta } = splitHeadingTitleAndMeta(headingTitle);
        if (!meta) {
          return `<summary class="work-summary"><h3>${title}</h3></summary>`;
        }
        return `<summary class="work-summary"><div class="work-header"><h3>${title}</h3><span class="work-meta">${meta}</span></div></summary>`;
      }
    });

    return buildSectionCollapsibleMarkdown(withWorkCollapsible, {
      sectionTitle: "项目经历",
      detailsClass: "project-details",
      isExpandedByDefault: areSectionsExpanded,
      summaryBuilder: (headingTitle) => {
        const { title, meta } = splitRawHeadingTitleAndMeta(headingTitle);
        const { projectName, company } = splitProjectTitleAndCompany(title);
        const rightMeta = [company, meta].filter(Boolean).join(" · ");
        const leftTitle = formatSummaryText(projectName || title);
        const metaHtml = rightMeta ? `<span class="project-meta">${formatSummaryText(rightMeta)}</span>` : "";
        return `<summary class="project-summary"><div class="project-header"><h3>${leftTitle}</h3>${metaHtml}</div></summary>`;
      }
    });
  }, [body, areSectionsExpanded]);

  useEffect(() => {
    const usedElements = new Set();
    for (const item of toc) {
      const matched = findHeadingElementByTocItem(item, usedElements);
      if (!matched) {
        continue;
      }

      usedElements.add(matched);
      matched.id = item.id;
    }
  }, [toc]);

  const handleTocClick = (event, item) => {
    event.preventDefault();
    const target =
      document.getElementById(item.id) ??
      findHeadingElementByTocItem(item, new Set());

    if (!target) {
      return;
    }

    target.scrollIntoView({ behavior: "smooth", block: "start" });
  };

  const handleRuntimePdfExport = () => {
    window.print();
  };

  const handleBackToTop = () => {
    window.scrollTo({ top: 0, behavior: "smooth" });
  };

  return (
    <main className={`resume-layout ${isTocVisible ? "" : "toc-hidden"}`}>
      {isTocVisible ? (
        <aside className="resume-sidebar no-print">
          <div className="sidebar-card">
            <h2 className="sidebar-title">目录</h2>
            <nav className="toc-list" aria-label="简历目录">
              {toc.map((item) => (
                <button
                  type="button"
                  key={item.id}
                  className={`toc-item toc-level-${item.level}`}
                  onClick={(event) => handleTocClick(event, item)}
                >
                  {item.title}
                </button>
              ))}
            </nav>
          </div>
        </aside>
      ) : null}

      <section className="resume-main">
        <header className="resume-toolbar no-print">
          <button
            type="button"
            className="toggle-toc-btn"
            onClick={() => setIsTocVisible((value) => !value)}
          >
            {isTocVisible ? "隐藏目录" : "显示目录"}
          </button>
          <div className="toolbar-actions">
            <button
              type="button"
              className="toggle-toc-btn"
              onClick={() => setAreSectionsExpanded((value) => !value)}
            >
              {areSectionsExpanded ? "折叠经历" : "展开经历"}
            </button>
            <button
              type="button"
              className="download-btn runtime-btn"
              onClick={handleRuntimePdfExport}
            >
              导出 PDF（浏览器）
            </button>
          </div>
        </header>
        <ResumeRenderer markdown={renderedMarkdown} tooltips={tooltips} />
      </section>
      <button
        type="button"
        className="back-to-top-btn no-print"
        onClick={handleBackToTop}
        aria-label="返回顶部"
      >
        返回顶部
      </button>
    </main>
  );
}

export default ResumePage;
