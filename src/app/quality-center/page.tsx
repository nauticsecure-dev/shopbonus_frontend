"use client";

import Link from "next/link";
import { useEffect, useState, type FormEvent } from "react";
import AdminStepUpModal from "@/components/AdminStepUpModal";
import { apiUrl } from "@/config/env";
import { apiRequest } from "@/lib/api";
import { useSession } from "@/store/SessionContext";

const root = "/api/v1/admin/qa";
const sections = [
  ["summary", "Overview"], ["endpoints", "Endpoints"], ["components", "Components"],
  ["runs?environment=staging", "Staging runs"], ["findings", "Findings"],
  ["schedules", "Schedules"], ["openapi.json", "API reference"],
] as const;
const methods = new Set(["get", "head", "post", "put", "patch", "delete", "options", "trace"]);

type RecordRow = {
  id: string;
  path?: string;
  method?: string;
  name?: string;
  title?: string;
  suite?: string;
  git_sha?: string;
  kind?: string;
  severity?: string;
  status?: string;
  environment?: string;
  trigger?: string;
  evidence?: { id: string; name: string }[];
};
type ApiSpec = { paths: Record<string, Record<string, { summary?: string }>> };
type Data = { data: RecordRow[] | RecordRow; meta?: { last_page: number } };

export default function QualityCenter() {
  const { session, ready } = useSession();
  const [section, setSection] = useState<string>("findings");
  const [selected, setSelected] = useState<string | null>(null);
  const [page, setPage] = useState(1);
  const [revision, setRevision] = useState(0);
  const [operationFilter, setOperationFilter] = useState("");
  const [expandedOperation, setExpandedOperation] = useState<string | null>(null);
  const [response, setResponse] = useState<{ key: string; value?: Data | ApiSpec; error?: string }>();
  const [report, setReport] = useState<FormData | null>(null);
  const user = ready ? session?.user : null;
  const fullAccess = Boolean(user && (user.role === "super_admin" || user.roles.some((role) => ["super_admin", "qa_tester"].includes(role))));
  const authorized = Boolean(user?.email_verified && (fullAccess || user.roles.includes("developer")));
  const [resource, query] = section.split("?");
  const reference = resource === "openapi.json";
  const paged = !reference && resource !== "summary" && resource !== "schedules" && (!selected || resource === "runs");
  const path = `${root}/${resource}${selected ? `/${encodeURIComponent(selected)}` : ""}${paged ? `?page=${page}${query && !selected ? `&${query}` : ""}` : ""}`;
  const key = `${user?.id}:${path}:${revision}`;
  const canRead = authorized && (fullAccess || resource === "findings");
  const current = canRead && response?.key === key ? response : undefined;

  useEffect(() => {
    if (!canRead) return;
    const controller = new AbortController();
    apiRequest<Data | ApiSpec>({ path, cache: "no-store", signal: controller.signal })
      .then((value) => setResponse({ key, value }))
      .catch((error: Error) => {
        if (!controller.signal.aborted) setResponse({ key, error: error.message });
      });
    return () => controller.abort();
  }, [canRead, key, path]);

  function select(next: string, id: string | null = null) {
    setSection(next);
    setSelected(id);
    setPage(1);
  }

  function prepareImport(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const body = new FormData(event.currentTarget);
    body.set("environment", "staging");
    body.set("executed_at", new Date(String(body.get("executed_at"))).toISOString());
    if (!body.has("mocked")) body.set("mocked", "0");
    setReport(body);
  }

  const value = current?.value;
  const data = value && "data" in value ? value.data : undefined;
  const lastPage = value && "meta" in value ? value.meta?.last_page ?? 1 : 1;
  const button = "rounded border border-current px-3 py-2 disabled:opacity-50";
  return (
    <main className="mx-auto max-w-6xl space-y-6 p-6">
      <h1 className="text-3xl font-semibold">Quality Center</h1>
      {!ready && <p role="status">Loading session…</p>}
      {ready && !user && <Link className="underline" href="/account?mode=login&next=%2Fquality-center">Sign in to Quality Center</Link>}
      {user && !authorized && <p role="alert">A verified Quality Center account is required.</p>}
      {authorized && (
        <>
          <nav aria-label="Quality Center sections" className="flex flex-wrap gap-2">
            {sections.filter(([id]) => fullAccess || id === "findings").map(([id, label]) => (
              <button key={id} className={button} aria-pressed={section === id} onClick={() => select(id)}>{label}</button>
            ))}
          </nav>
          {selected && <button className={button} onClick={() => select(section)}>Back to list</button>}
          {canRead && !current && <p role="status">Loading…</p>}
          {current?.error && <p role="alert">{current.error}</p>}
          {resource === "runs" && !selected && Array.isArray(data) && (
            <details className="rounded border p-3">
              <summary className="cursor-pointer">Import a staging execution report</summary>
              <form className="mt-3 flex flex-wrap items-end gap-4" onSubmit={prepareImport}>
                <label>JUnit XML <input className="block" type="file" name="report" accept=".xml,text/xml,application/xml" required /></label>
                <label>Deployment SHA <input className="block rounded border px-2" name="git_sha" pattern="[0-9a-f]{40}|[0-9a-f]{64}" required /></label>
                <label>Execution time (local) <input className="block rounded border px-2" type="datetime-local" name="executed_at" required /></label>
                <label>Suite <select className="block rounded border px-2" name="suite">
                  {["safe", "changed", "full", "weekly"].map((suite) => <option key={suite}>{suite}</option>)}
                </select></label>
                <label>Source <select className="block rounded border px-2" name="source">
                  {["phpunit", "postman", "browser"].map((source) => <option key={source}>{source}</option>)}
                </select></label>
                <label><input type="checkbox" name="mocked" value="1" /> Mocked</label>
                <button className={button} type="submit">Review and import</button>
              </form>
              <p className="mt-2 text-sm">Use a report from an executed staging run. Scheduled execution is managed by the staging runner.</p>
            </details>
          )}
          {Array.isArray(data) && (
            <ul className="divide-y rounded border">
              {data.length === 0 && <li className="p-3">No records.</li>}
              {data.map((row) => {
                const label = row.path ? `${row.method} ${row.path}` : row.title ?? row.name ?? row.suite ?? row.id;
                const detail = [row.severity, row.status, row.kind, row.git_sha, row.trigger].filter(Boolean).join(" · ");
                return (
                  <li key={row.id} className="flex flex-wrap items-center gap-3 p-3">
                    {["endpoints", "runs", "findings"].includes(resource)
                      ? <button className="underline" onClick={() => select(section, row.id)}>{label}</button>
                      : <strong>{label}</strong>}
                    {detail && <span>{detail}</span>}
                  </li>
                );
              })}
            </ul>
          )}
          {data && !Array.isArray(data) && (
            <>
              <pre className="overflow-x-auto rounded border p-3 text-sm">{JSON.stringify(data, null, 2)}</pre>
              {data.evidence?.length ? (
                <ul className="space-y-2">
                  {data.evidence.map((file) => (
                    <li key={file.id}><a className="underline" href={apiUrl(`${root}/evidence/${encodeURIComponent(file.id)}`)}>{file.name}</a></li>
                  ))}
                </ul>
              ) : null}
            </>
          )}
          {value && "paths" in value && (
            <section className="space-y-2" aria-label="Protected OpenAPI reference">
              <h2 className="text-xl font-semibold">OpenAPI operations</h2>
              <label className="block">
                Filter by method or path
                <input className="ml-2 rounded border px-2 py-1" type="search" value={operationFilter} onChange={(event) => setOperationFilter(event.target.value)} />
              </label>
              {Object.entries(value.paths).flatMap(([route, operations]) =>
                Object.entries(operations).filter(([method]) => methods.has(method) &&
                  `${method} ${route}`.toLowerCase().includes(operationFilter.trim().toLowerCase())).map(([method, operation]) => {
                  const operationKey = `${method} ${route}`;
                  const expanded = expandedOperation === operationKey;
                  return (
                    <div key={operationKey} className="rounded border p-3">
                      <button className="block text-left" aria-expanded={expanded} onClick={() => setExpandedOperation(expanded ? null : operationKey)}>
                        {method.toUpperCase()} {route} {operation.summary && `— ${operation.summary}`}
                      </button>
                      {expanded && <pre className="overflow-x-auto text-sm">{JSON.stringify(operation, null, 2)}</pre>}
                    </div>
                  );
                }),
              )}
            </section>
          )}
          {lastPage > 1 && (
            <div className="flex items-center gap-3">
              <button className={button} disabled={page === 1} onClick={() => setPage(page - 1)}>Previous</button>
              <span>Page {page} of {lastPage}</span>
              <button className={button} disabled={page >= lastPage} onClick={() => setPage(page + 1)}>Next</button>
            </div>
          )}
          {fullAccess && report && <AdminStepUpModal
            open
            title="Confirm staging report import"
            requireOtp={false}
            onClose={() => setReport(null)}
            onReady={async () => {
              const imported = await apiRequest<{ data: RecordRow }>({ path: `${root}/runs`, method: "POST", body: report });
              select("runs?environment=staging", imported.data.id);
              setRevision((value) => value + 1);
            }}
          />}
        </>
      )}
    </main>
  );
}
