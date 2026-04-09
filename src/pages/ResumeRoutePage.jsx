import { Link, Navigate, useParams } from "react-router-dom";
import { getResumeByRoute, historyResumeEntries, historyResumeRoutes } from "../data/resumeSources";
import ResumePage from "./ResumePage";

function safeDecode(value = "") {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function ResumeRoutePage() {
  const params = useParams();
  const rawPath = params["*"] ?? "";
  const normalizedPath = safeDecode(rawPath).replace(/^\/+|\/+$/g, "");

  if (!normalizedPath) {
    return <Navigate to="/resume/current" replace />;
  }

  if (normalizedPath === "history") {
    return (
      <main className="resume-layout toc-hidden">
        <section className="resume-main">
          <article className="resume-content">
            <h2>历史简历索引</h2>
            <p>
              你可以直接点击下面的历史简历，也可以手动输入
              <code>#/resume/history/文件名</code> 访问。
            </p>
            {historyResumeEntries.length > 0 ? (
              <ul>
                {historyResumeEntries.map((entry) => (
                  <li key={entry.routePath}>
                    <Link to={`/resume/${entry.routePath}`}>
                      {entry.fileName}
                    </Link>
                    <span>（#/resume/{entry.routePath}）</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p>当前没有历史简历文件，请先在 `resumes/history/` 下新增 `.md` 文件。</p>
            )}
            <p>
              <Link to="/resume/current">返回当前简历</Link>
            </p>
          </article>
        </section>
      </main>
    );
  }

  const resume = getResumeByRoute(normalizedPath);
  if (!resume) {
    return (
      <main className="resume-layout toc-hidden">
        <section className="resume-main">
          <article className="resume-content">
            <h2>未找到该简历</h2>
            <p>你输入的路由不存在：`#/resume/{normalizedPath}`</p>
            <p>可以先返回当前简历，再手动输入历史路由。</p>
            <p>
              <Link to="/resume/current">返回当前简历</Link>
            </p>
            {historyResumeRoutes.length > 0 ? (
              <>
                <h3>可用历史路由示例</h3>
                <ul>
                  {historyResumeRoutes.slice(0, 8).map((route) => (
                    <li key={route}>
                      <code>#/resume/{route}</code>
                    </li>
                  ))}
                </ul>
              </>
            ) : (
              <p>当前没有历史简历文件，请先在 `resumes/history/` 下新增 `.md` 文件。</p>
            )}
          </article>
        </section>
      </main>
    );
  }

  return <ResumePage markdown={resume.markdown} />;
}

export default ResumeRoutePage;
