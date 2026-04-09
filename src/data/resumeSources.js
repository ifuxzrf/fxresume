const markdownModules = import.meta.glob("../../resumes/**/*.md", {
  eager: true,
  query: "?raw",
  import: "default"
});

const PREFIX = "../../resumes/";

function normalizeRoutePath(routePath = "") {
  return routePath.replace(/^\/+|\/+$/g, "");
}

function modulePathToRoute(modulePath) {
  return modulePath.replace(PREFIX, "").replace(/\.md$/i, "");
}

function routeToFileName(routePath = "") {
  const segments = routePath.split("/");
  return segments[segments.length - 1] || routePath;
}

const resumeEntries = Object.entries(markdownModules)
  .map(([modulePath, markdown]) => ({
    routePath: modulePathToRoute(modulePath),
    fileName: routeToFileName(modulePathToRoute(modulePath)),
    markdown
  }))
  .sort((a, b) => a.routePath.localeCompare(b.routePath, "zh-Hans-CN"));

const resumeMap = new Map(resumeEntries.map((entry) => [entry.routePath, entry]));

function getResumeByRoute(routePath = "current") {
  const normalized = normalizeRoutePath(routePath || "current");
  return resumeMap.get(normalized) ?? null;
}

const historyResumeRoutes = resumeEntries
  .filter((entry) => entry.routePath.startsWith("history/"))
  .map((entry) => entry.routePath);

const historyResumeEntries = resumeEntries.filter((entry) =>
  entry.routePath.startsWith("history/")
);

export { getResumeByRoute, historyResumeEntries, historyResumeRoutes };
