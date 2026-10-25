
import { useEffect, useState } from "react";
import {
  Activity,
  AlertTriangle,
  ArrowDownToLine,
  ArrowUpFromLine,
  BadgeCheck,
  Bell,
  BookOpen,
  Building2,
  CheckCircle2,
  ChevronRight,
  ClipboardList,
  FileSpreadsheet,
  Fingerprint,
  GraduationCap,
  LayoutDashboard,
  Menu,
  Plus,
  RefreshCw,
  Search,
  ShieldCheck,
  Trash2,
  Users,
  X,
} from "lucide-react";
import "./App.css";

const API = "http://127.0.0.1:8000";

const navItems = [
  { label: "Dashboard", icon: LayoutDashboard },
  { label: "Students", icon: Users },
  { label: "Institutions", icon: Building2 },
  { label: "Data Import", icon: FileSpreadsheet },
  { label: "Alerts & Validation", icon: AlertTriangle },
  { label: "APAAR Lookup", icon: Fingerprint },
  { label: "Audit Logs", icon: ClipboardList },
];

const emptyForm = {
  student_name: "",
  apaar_id: "",
  institution_code: "DCE001",
  program: "B.Tech CSE",
  academic_year: "2026-27",
  seat_type: "Regular",
};

function formatDate(value) {
  if (!value) return "—";
  const date = new Date(value);
  return Number.isNaN(date.getTime())
    ? value
    : date.toLocaleString("en-IN", {
        dateStyle: "medium",
        timeStyle: "short",
      });
}

function downloadCSV(students) {
  const headers = [
    "student_name",
    "apaar_id",
    "institution_code",
    "program",
    "academic_year",
    "seat_type",
  ];

  const escapeCSV = (value) =>
    `"${String(value ?? "").replaceAll('"', '""')}"`;

  const rows = students.map((student) =>
    headers.map((header) => escapeCSV(student[header])).join(",")
  );

  const csv = [headers.join(","), ...rows].join("\n");
  const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");

  link.href = url;
  link.download = "edutrace-students.csv";
  link.click();

  URL.revokeObjectURL(url);
}

export default function App() {
  const [activePage, setActivePage] = useState("Dashboard");
  const [summary, setSummary] = useState({});
  const [students, setStudents] = useState([]);
  const [institutions, setInstitutions] = useState([]);
  const [alerts, setAlerts] = useState([]);
  const [logs, setLogs] = useState([]);
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [form, setForm] = useState(emptyForm);
  const [lookupId, setLookupId] = useState("");
  const [lookupResult, setLookupResult] = useState(null);
  const [uploadMessage, setUploadMessage] = useState("");
  const [notice, setNotice] = useState("");
  const [loading, setLoading] = useState(false);
  const [apiOnline, setApiOnline] = useState(false);
  const [mobileMenu, setMobileMenu] = useState(false);

  async function request(path, options = {}) {
    const response = await fetch(`${API}${path}`, options);
    const data = await response.json().catch(() => ({}));

    if (!response.ok) {
      throw new Error(data.detail || "Request failed");
    }

    return data;
  }

  async function loadData() {
    setLoading(true);

    try {
      const [summaryData, studentData, institutionData, alertData, logData] =
        await Promise.all([
          request("/api/summary"),
          request("/api/students"),
          request("/api/institutions"),
          request("/api/alerts"),
          request("/api/audit-logs"),
        ]);

      setSummary(summaryData);
      setStudents(Array.isArray(studentData) ? studentData : studentData.students || []);
      setInstitutions(
        Array.isArray(institutionData)
          ? institutionData
          : institutionData.institutions || []
      );
      setAlerts(Array.isArray(alertData) ? alertData : alertData.alerts || []);
      setLogs(Array.isArray(logData) ? logData : logData.logs || []);
      setApiOnline(true);
    } catch (error) {
      setApiOnline(false);
      setNotice(`Backend not connected: ${error.message}`);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadData();
  }, []);

  function showNotice(message) {
    setNotice(message);
    window.setTimeout(() => setNotice(""), 4500);
  }

  async function addStudent(event) {
    event.preventDefault();

    try {
      await request("/api/students", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(form),
      });

      setForm(emptyForm);
      setShowForm(false);
      showNotice("Student record added successfully.");
      await loadData();
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function deleteStudent(student) {
    const id = student.id ?? student.student_id;

    if (!id) {
      showNotice("Student record ID is missing.");
      return;
    }

    if (!window.confirm(`Delete the record for ${student.student_name}?`)) {
      return;
    }

    try {
      await request(`/api/students/${id}`, { method: "DELETE" });
      showNotice("Student record deleted.");
      await loadData();
    } catch (error) {
      showNotice(error.message);
    }
  }

  async function uploadFile(event) {
    const file = event.target.files?.[0];
    if (!file) return;

    const body = new FormData();
    body.append("file", file);

    try {
      const result = await request("/api/upload-csv", {
        method: "POST",
        body,
      });

      setUploadMessage(
        result.message ||
          `Import finished. Added: ${result.inserted ?? 0}. Errors: ${
            result.errors?.length ?? 0
          }.`
      );

      await loadData();
    } catch (error) {
      setUploadMessage(`Import failed: ${error.message}`);
    }

    event.target.value = "";
  }

  async function lookupAPAAR(event) {
    event.preventDefault();
    setLookupResult(null);

    try {
      const result = await request(
        `/api/verify/${encodeURIComponent(lookupId.trim())}`
      );
      setLookupResult(result);
    } catch (error) {
      setLookupResult({ error: error.message });
    }
  }

  const filteredStudents = students.filter((student) =>
    [
      student.student_name,
      student.apaar_id,
      student.institution_code,
      student.program,
      student.seat_type,
    ]
      .join(" ")
      .toLowerCase()
      .includes(search.toLowerCase())
  );

  const statCards = [
    {
      label: "Total Students",
      value: summary.total_students ?? students.length,
      icon: Users,
      color: "blue",
      note: "Student records",
    },
    {
      label: "Institutions",
      value: summary.total_institutions ?? institutions.length,
      icon: Building2,
      color: "purple",
      note: "Registered institutions",
    },
    {
      label: "Validation Alerts",
      value: summary.total_alerts ?? alerts.length,
      icon: AlertTriangle,
      color: "orange",
      note: "Items to review",
    },
    {
      label: "Regular Seats",
      value:
        summary.regular_students ??
        students.filter((student) => student.seat_type === "Regular").length,
      icon: GraduationCap,
      color: "green",
      note: "Regular admissions",
    },
  ];

  function renderDashboard() {
    return (
      <>
        <div className="welcome-panel">
          <div>
            <span className="eyebrow">INSTITUTIONAL DATA INTEGRITY</span>
            <h2>Welcome to EduTrace AI</h2>
            <p>
              A unified workspace for student records, intake monitoring and
              data-quality validation.
            </p>
            <button className="primary-btn" onClick={() => setActivePage("Students")}>
              Manage student records <ChevronRight size={17} />
            </button>
          </div>
          <div className="welcome-art">
            <div className="art-circle">
              <ShieldCheck size={76} strokeWidth={1.4} />
            </div>
            <span className="art-dot dot-one" />
            <span className="art-dot dot-two" />
          </div>
        </div>

        <div className="stat-grid">
          {statCards.map((stat) => {
            const Icon = stat.icon;
            return (
              <div className="stat-card" key={stat.label}>
                <div className={`stat-icon ${stat.color}`}>
                  <Icon size={21} />
                </div>
                <span className="stat-label">{stat.label}</span>
                <strong>{stat.value}</strong>
                <span className="stat-note">{stat.note}</span>
              </div>
            );
          })}
        </div>

        <div className="content-grid">
          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3>Recent student records</h3>
                <p>Latest records stored in the database</p>
              </div>
              <button className="text-btn" onClick={() => setActivePage("Students")}>
                View all <ChevronRight size={15} />
              </button>
            </div>
            {students.length === 0 ? (
              <EmptyState
                icon={Users}
                title="No student records yet"
                message="Add a student or import a CSV file to get started."
              />
            ) : (
              <div className="table-wrap">
                <table>
                  <thead>
                    <tr>
                      <th>Student</th>
                      <th>Institution</th>
                      <th>Seat type</th>
                    </tr>
                  </thead>
                  <tbody>
                    {students.slice(0, 5).map((student, index) => (
                      <tr key={student.id ?? student.student_id ?? index}>
                        <td>
                          <strong>{student.student_name}</strong>
                          <small>{student.apaar_id}</small>
                        </td>
                        <td>{student.institution_code}</td>
                        <td>
                          <span className="tag">{student.seat_type}</span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </section>

          <section className="panel">
            <div className="panel-heading">
              <div>
                <h3>System status</h3>
                <p>Application connectivity</p>
              </div>
              <Activity size={19} />
            </div>
            <div className="status-row">
              <span className={`status-dot ${apiOnline ? "online" : "offline"}`} />
              <div>
                <strong>{apiOnline ? "Backend connected" : "Backend offline"}</strong>
                <p>
                  {apiOnline
                    ? "API responded successfully."
                    : "Start the FastAPI backend to load live data."}
                </p>
              </div>
            </div>
            <div className="status-row">
              <span className="status-dot online" />
              <div>
                <strong>Local validation</strong>
                <p>Basic data-quality checks are available.</p>
              </div>
            </div>
            <div className="info-note">
              <ShieldCheck size={19} />
              <p>
                Demo environment. APAAR format checks do not confirm a real
                student's identity.
              </p>
            </div>
          </section>
        </div>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Recent validation alerts</h3>
              <p>Potential data issues that may need attention</p>
            </div>
            <button className="text-btn" onClick={() => setActivePage("Alerts & Validation")}>
              All alerts <ChevronRight size={15} />
            </button>
          </div>
          {alerts.length === 0 ? (
            <EmptyState
              icon={BadgeCheck}
              title="No alerts to display"
              message="Validation results will appear here when available."
            />
          ) : (
            <AlertList alerts={alerts.slice(0, 5)} />
          )}
        </section>
      </>
    );
  }

  function renderStudents() {
    return (
      <>
        <div className="page-actions">
          <div className="search-box">
            <Search size={18} />
            <input
              value={search}
              onChange={(event) => setSearch(event.target.value)}
              placeholder="Search name, APAAR ID, institution..."
            />
          </div>
          <button className="secondary-btn" onClick={() => downloadCSV(filteredStudents)}>
            <ArrowDownToLine size={17} /> Export CSV
          </button>
          <button className="primary-btn" onClick={() => setShowForm(true)}>
            <Plus size={17} /> Add student
          </button>
        </div>

        {showForm && (
          <section className="panel form-panel">
            <div className="panel-heading">
              <div>
                <h3>Add student record</h3>
                <p>Use synthetic data for this demonstration.</p>
              </div>
              <button className="icon-btn" onClick={() => setShowForm(false)} aria-label="Close form">
                <X size={19} />
              </button>
            </div>
            <form onSubmit={addStudent} className="student-form">
              <label>
                Student name
                <input
                  required
                  value={form.student_name}
                  onChange={(event) =>
                    setForm({ ...form, student_name: event.target.value })
                  }
                  placeholder="e.g. Demo Student"
                />
              </label>
              <label>
                APAAR ID (12 digits)
                <input
                  required
                  inputMode="numeric"
                  maxLength={12}
                  pattern="[0-9]{12}"
                  value={form.apaar_id}
                  onChange={(event) =>
                    setForm({
                      ...form,
                      apaar_id: event.target.value.replace(/\D/g, ""),
                    })
                  }
                  placeholder="12-digit demo ID"
                />
              </label>
              <label>
                Institution
                <select
                  value={form.institution_code}
                  onChange={(event) =>
                    setForm({ ...form, institution_code: event.target.value })
                  }
                >
                  {institutions.map((institution) => (
                    <option
                      key={institution.institution_code}
                      value={institution.institution_code}
                    >
                      {institution.institution_code} — {institution.name}
                    </option>
                  ))}
                  {institutions.length === 0 && <option value="DCE001">DCE001</option>}
                </select>
              </label>
              <label>
                Program
                <input
                  required
                  value={form.program}
                  onChange={(event) => setForm({ ...form, program: event.target.value })}
                />
              </label>
              <label>
                Academic year
                <input
                  required
                  value={form.academic_year}
                  onChange={(event) =>
                    setForm({ ...form, academic_year: event.target.value })
                  }
                />
              </label>
              <label>
                Seat category
                <select
                  value={form.seat_type}
                  onChange={(event) => setForm({ ...form, seat_type: event.target.value })}
                >
                  {["Regular", "Supernumerary", "NRI", "OCI", "FN"].map((seat) => (
                    <option key={seat}>{seat}</option>
                  ))}
                </select>
              </label>
              <div className="form-footer">
                <button type="button" className="secondary-btn" onClick={() => setShowForm(false)}>
                  Cancel
                </button>
                <button type="submit" className="primary-btn">
                  Save student
                </button>
              </div>
            </form>
          </section>
        )}

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Student records</h3>
              <p>{filteredStudents.length} records found</p>
            </div>
            <button className="icon-btn" onClick={loadData} title="Refresh">
              <RefreshCw size={17} />
            </button>
          </div>
          {filteredStudents.length === 0 ? (
            <EmptyState
              icon={Users}
              title="No matching student records"
              message="Try another search or add a new record."
            />
          ) : (
            <div className="table-wrap">
              <table>
                <thead>
                  <tr>
                    <th>Student</th>
                    <th>APAAR ID</th>
                    <th>Institution</th>
                    <th>Program</th>
                    <th>Academic year</th>
                    <th>Seat type</th>
                    <th>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredStudents.map((student, index) => (
                    <tr key={student.id ?? student.student_id ?? index}>
                      <td><strong>{student.student_name}</strong></td>
                      <td>{student.apaar_id}</td>
                      <td>{student.institution_code}</td>
                      <td>{student.program}</td>
                      <td>{student.academic_year}</td>
                      <td><span className="tag">{student.seat_type}</span></td>
                      <td>
                        <button
                          className="icon-btn danger-btn"
                          title="Delete record"
                          onClick={() => deleteStudent(student)}
                        >
                          <Trash2 size={16} />
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </>
    );
  }

  function renderInstitutions() {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Approved institutions</h3>
            <p>Demo intake limits and current enrolment counts</p>
          </div>
          <Building2 size={20} />
        </div>
        {institutions.length === 0 ? (
          <EmptyState
            icon={Building2}
            title="No institutions available"
            message="Connect the backend to load institution data."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr>
                  <th>Institution</th>
                  <th>Institution code</th>
                  <th>Approved intake</th>
                  <th>Enrolled records</th>
                  <th>Remaining capacity</th>
                  <th>Utilisation</th>
                </tr>
              </thead>
              <tbody>
                {institutions.map((institution) => {
                  const code = institution.institution_code;
                  const enrolled = students.filter(
                    (student) => student.institution_code === code
                  ).length;
                  const intake = Number(institution.approved_intake ?? 0);
                  const percent = intake > 0 ? (enrolled / intake) * 100 : 0;

                  return (
                    <tr key={code}>
                      <td><strong>{institution.name}</strong></td>
                      <td>{code}</td>
                      <td>{intake}</td>
                      <td>{enrolled}</td>
                      <td>
                        <span className={enrolled > intake ? "over-limit" : ""}>
                          {intake - enrolled}
                        </span>
                      </td>
                      <td>
                        <div className="progress-cell">
                          <div className="progress-track">
                            <span
                              style={{
                                width: `${Math.min(percent, 100)}%`,
                              }}
                            />
                          </div>
                          <small>{Math.round(percent)}%</small>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        <div className="info-note">
          <AlertTriangle size={19} />
          <p>
            These are prototype demo institutions and intake limits, not verified
            AICTE records. Intake validation is a warning mechanism, not an official
            approval decision.
          </p>
        </div>
      </section>
    );
  }

  function renderImport() {
    return (
      <>
        <section className="panel import-panel">
          <div className="import-icon"><FileSpreadsheet size={34} /></div>
          <h3>Import student records</h3>
          <p>
            Upload a CSV file to add records in bulk. Use synthetic demo data only.
          </p>
          <label className="upload-button">
            <ArrowUpFromLine size={18} /> Choose CSV file
            <input type="file" accept=".csv,text/csv" onChange={uploadFile} />
          </label>
          {uploadMessage && <div className="inline-message">{uploadMessage}</div>}
        </section>

        <section className="panel">
          <div className="panel-heading">
            <div>
              <h3>Required CSV columns</h3>
              <p>Column names must match exactly.</p>
            </div>
          </div>
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Column</th><th>Example value</th><th>Purpose</th></tr>
              </thead>
              <tbody>
                {[
                  ["student_name", "Demo Student", "Student display name"],
                  ["apaar_id", "123456789012", "12-digit synthetic identifier"],
                  ["institution_code", "DCE001", "Institution lookup code"],
                  ["program", "B.Tech CSE", "Academic program"],
                  ["academic_year", "2026-27", "Academic year"],
                  ["seat_type", "Regular", "Regular, Supernumerary, NRI, OCI or FN"],
                ].map(([column, example, purpose]) => (
                  <tr key={column}>
                    <td><code>{column}</code></td>
                    <td>{example}</td>
                    <td>{purpose}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <button
            className="secondary-btn"
            onClick={() => {
              const example = [
                "student_name,apaar_id,institution_code,program,academic_year,seat_type",
                "Demo Student One,123456789012,DCE001,B.Tech CSE,2026-27,Regular",
                "Demo Student Two,234567890123,DCE001,B.Tech CSE,2026-27,Regular",
              ].join("\n");
              const blob = new Blob([example], { type: "text/csv;charset=utf-8;" });
              const url = URL.createObjectURL(blob);
              const link = document.createElement("a");
              link.href = url;
              link.download = "edutrace-demo-template.csv";
              link.click();
              URL.revokeObjectURL(url);
            }}
          >
            <ArrowDownToLine size={17} /> Download sample CSV
          </button>
        </section>
      </>
    );
  }

  function renderAlerts() {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Alerts & validation</h3>
            <p>Review potential data issues from the backend</p>
          </div>
          <AlertTriangle size={20} />
        </div>
        {alerts.length === 0 ? (
          <EmptyState
            icon={CheckCircle2}
            title="No validation alerts"
            message="No alerts were returned by the backend."
          />
        ) : (
          <AlertList alerts={alerts} />
        )}
      </section>
    );
  }

  function renderLookup() {
    return (
      <section className="panel lookup-panel">
        <div className="lookup-icon"><Fingerprint size={34} /></div>
        <h3>APAAR ID lookup</h3>
        <p>
          Search the local prototype database using a synthetic demo ID.
          A 12-digit format check is not proof of identity.
        </p>
        <form className="lookup-form" onSubmit={lookupAPAAR}>
          <input
            value={lookupId}
            onChange={(event) => setLookupId(event.target.value.replace(/\D/g, "").slice(0, 12))}
            placeholder="Enter 12-digit demo ID"
            inputMode="numeric"
            maxLength={12}
            required
          />
          <button className="primary-btn" type="submit">
            <Search size={17} /> Look up
          </button>
        </form>
        {lookupResult && (
          <div className={`lookup-result ${lookupResult.error ? "has-error" : ""}`}>
            {lookupResult.error ? (
              <>
                <AlertTriangle size={20} />
                <div><strong>Lookup unsuccessful</strong><p>{lookupResult.error}</p></div>
              </>
            ) : (
              <>
                <BadgeCheck size={20} />
                <div>
                  <strong>{lookupResult.message || "Lookup completed"}</strong>
                  <pre>{JSON.stringify(lookupResult, null, 2)}</pre>
                  <p>
                    This result comes from the local demo service, not a live
                    government identity-verification API.
                  </p>
                </div>
              </>
            )}
          </div>
        )}
      </section>
    );
  }

  function renderAuditLogs() {
    return (
      <section className="panel">
        <div className="panel-heading">
          <div>
            <h3>Audit logs</h3>
            <p>Recorded prototype actions and timestamps</p>
          </div>
          <ClipboardList size={20} />
        </div>
        {logs.length === 0 ? (
          <EmptyState
            icon={ClipboardList}
            title="No audit events available"
            message="Actions will appear here if the backend records them."
          />
        ) : (
          <div className="table-wrap">
            <table>
              <thead>
                <tr><th>Time</th><th>Action</th><th>Details</th></tr>
              </thead>
              <tbody>
                {logs.map((log, index) => (
                  <tr key={log.id ?? index}>
                    <td>{formatDate(log.created_at ?? log.timestamp)}</td>
                    <td><span className="tag">{log.action ?? log.event ?? "Event"}</span></td>
                    <td>{log.details ?? log.description ?? log.message ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </section>
    );
  }

  const pageRenderers = {
    Dashboard: renderDashboard,
    Students: renderStudents,
    Institutions: renderInstitutions,
    "Data Import": renderImport,
    "Alerts & Validation": renderAlerts,
    "APAAR Lookup": renderLookup,
    "Audit Logs": renderAuditLogs,
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileMenu ? "sidebar-open" : ""}`}>
        <div className="brand">
          <div className="brand-mark"><ShieldCheck size={25} /></div>
          <div>
            <strong>EduTrace <span>AI</span></strong>
            <small>Student Data Integrity</small>
          </div>
          <button className="icon-btn mobile-close" onClick={() => setMobileMenu(false)}>
            <X size={19} />
          </button>
        </div>

        <div className="workspace-label">WORKSPACE</div>
        <nav className="side-nav">
          {navItems.map(({ label, icon: Icon }) => (
            <button
              key={label}
              className={`nav-item ${activePage === label ? "active" : ""}`}
              onClick={() => {
                setActivePage(label);
                setMobileMenu(false);
              }}
            >
              <Icon size={19} strokeWidth={1.8} />
              <span>{label}</span>
              {label === "Alerts & Validation" && alerts.length > 0 && (
                <span className="nav-count">{alerts.length}</span>
              )}
            </button>
          ))}
        </nav>

        <div className="sidebar-bottom">
          <div className="sidebar-status">
            <span className={`status-dot ${apiOnline ? "online" : "offline"}`} />
            <div>
              <strong>{apiOnline ? "API connected" : "API disconnected"}</strong>
              <small>Local development environment</small>
            </div>
          </div>
          <div className="demo-badge">
            <ShieldCheck size={15} /> Prototype / Demo Mode
          </div>
        </div>
      </aside>

      {mobileMenu && (
        <button
          className="mobile-overlay"
          aria-label="Close navigation"
          onClick={() => setMobileMenu(false)}
        />
      )}

      <main className="main-area">
        <header className="topbar">
          <div className="topbar-left">
            <button className="icon-btn menu-toggle" onClick={() => setMobileMenu(true)}>
              <Menu size={21} />
            </button>
            <div>
              <div className="breadcrumbs">EduTrace AI <ChevronRight size={13} /> Workspace</div>
              <h1>{activePage}</h1>
            </div>
          </div>
          <div className="topbar-actions">
            <span className={`connection-pill ${apiOnline ? "connected" : "disconnected"}`}>
              <span className="status-dot" />
              {apiOnline ? "Connected" : "Offline"}
            </span>
            <button className="icon-btn" onClick={loadData} title="Refresh data">
              <RefreshCw size={18} className={loading ? "spin" : ""} />
            </button>
            <div className="profile-avatar">ET</div>
          </div>
        </header>

        <div className="page-content">
          {notice && (
            <div className="notice-banner">
              <AlertTriangle size={18} />
              <span>{notice}</span>
              <button className="icon-btn" onClick={() => setNotice("")}>
                <X size={16} />
              </button>
            </div>
          )}
          <div className="page-intro">
            <div>
              <span className="eyebrow">EDUTRACE AI / {activePage.toUpperCase()}</span>
              <p>
                {activePage === "Dashboard"
                  ? "An overview of enrolment data and validation activity."
                  : `Manage and review ${activePage.toLowerCase()} for your demo workspace.`}
              </p>
            </div>
            <div className="date-chip">
              <BookOpen size={15} /> Academic year 2026–27
            </div>
          </div>

          {pageRenderers[activePage]?.()}

          <footer className="app-footer">
            <span>© 2026 EduTrace AI · Student Data Integrity Prototype</span>
            <span><ShieldCheck size={14} /> Demo data only · Not an official AICTE system</span>
          </footer>
        </div>
      </main>
    </div>
  );
}

function EmptyState({ icon: Icon, title, message }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Icon size={24} /></div>
      <strong>{title}</strong>
      <p>{message}</p>
    </div>
  );
}

function AlertList({ alerts }) {
  return (
    <div className="alert-list">
      {alerts.map((alert, index) => (
        <div className="alert-row" key={alert.id ?? index}>
          <div className="alert-symbol">
            <AlertTriangle size={18} />
          </div>
          <div className="alert-copy">
            <strong>{alert.title ?? alert.type ?? alert.alert_type ?? "Validation alert"}</strong>
            <p>{alert.message ?? alert.description ?? alert.details ?? "Review this record for potential inconsistencies."}</p>
            {alert.institution_code && <small>Institution: {alert.institution_code}</small>}
          </div>
          <span className={`severity-tag ${(alert.severity ?? "medium").toLowerCase()}`}>
            {alert.severity ?? "Review"}
          </span>
        </div>
      ))}
    </div>
  );
}
