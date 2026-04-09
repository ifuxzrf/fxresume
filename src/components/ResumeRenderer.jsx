import { useId } from "react";
import ReactMarkdown, { defaultUrlTransform } from "react-markdown";
import rehypeRaw from "rehype-raw";
import remarkGfm from "remark-gfm";

function resumeUrlTransform(value) {
  const url = String(value ?? "");
  if (url.startsWith("tt:")) {
    return url;
  }
  return defaultUrlTransform(url);
}

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

function flattenChildrenText(children) {
  if (!children) {
    return "";
  }

  if (typeof children === "string" || typeof children === "number") {
    return String(children);
  }

  if (Array.isArray(children)) {
    return children.map(flattenChildrenText).join("");
  }

  if (children.props?.children) {
    return flattenChildrenText(children.props.children);
  }

  return "";
}

function TooltipRef({ tipText, children }) {
  const tipId = useId().replace(/:/g, "");
  return (
    <span
      className="resume-tt"
      tabIndex={0}
      title={tipText}
      aria-describedby={tipId}
    >
      {children}
      <span id={tipId} className="resume-tt__pop" role="tooltip">
        {tipText}
      </span>
    </span>
  );
}

function ResumeRenderer({ markdown, tooltips = {} }) {
  const content = stripFrontmatter(markdown);
  const headingCounter = new Map();

  const createHeadingRenderer = (Tag) =>
    function HeadingRenderer({ children, ...rest }) {
      const title = flattenChildrenText(children);
      const base = slugify(title);
      const count = headingCounter.get(base) ?? 0;
      headingCounter.set(base, count + 1);
      const id = count === 0 ? base : `${base}-${count + 1}`;

      return (
        <Tag {...rest} id={id}>
          {children}
        </Tag>
      );
    };

  function LinkRenderer({ href, children, ...rest }) {
    if (typeof href === "string" && href.startsWith("tt:")) {
      const tipKey = href.slice(3).trim();
      const tipText = tipKey ? tooltips[tipKey] : "";
      if (tipText) {
        return (
          <TooltipRef tipText={tipText}>
            {children}
          </TooltipRef>
        );
      }
      return <span className="resume-tt-fallback">{children}</span>;
    }

    return (
      <a href={href} {...rest}>
        {children}
      </a>
    );
  }

  return (
    <article className="resume-content">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        rehypePlugins={[rehypeRaw]}
        urlTransform={resumeUrlTransform}
        components={{
          h2: createHeadingRenderer("h2"),
          h3: createHeadingRenderer("h3"),
          a: LinkRenderer
        }}
      >
        {content}
      </ReactMarkdown>
    </article>
  );
}

export default ResumeRenderer;
