import { useState } from "react";
import { NavLink, Routes, Route, useLocation } from "react-router-dom";
import {
  createOrganization,
  saveGuidelines,
  createProduct,
  uploadDocument,
  listProducts,
  listDocuments,
} from "./services/api";

import {
  ShieldCheck,
  LayoutDashboard,
  Building2,
  ScanSearch,
  Boxes,
  ClipboardCheck,
  FileClock,
  Settings,
  Search,
  Bell,
  ChevronRight,
  Plus,
  Package,
  FileText,
  Upload,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
  ArrowRight,
  BookOpenCheck,
  Users,
  LockKeyhole,
  Menu,
  X,
  Lightbulb,
  FileUp,
  Clock3,
} from "lucide-react";
type Product = {
  name: string;
  sku: string;
  category: string;
  facts: string;
  claims: string;
  proof: string;
};
type Finding = {
  title: string;
  status: string;
  detail: string;
  source: string;
};
const initial: Product[] = [
  {
    name: "Classic Biscuits",
    sku: "CB-001",
    category: "Biscuits & snacks",
    facts: "Sugar: 5 g per serving; contains wheat",
    claims: "Contains wheat; baked snack",
    proof: "classic-biscuits-spec.pdf",
  },
  {
    name: "Oat & Honey Bites",
    sku: "OH-002",
    category: "Biscuits & snacks",
    facts: "Contains oats and honey; contains gluten",
    claims: "Made with oats and honey",
    proof: "oat-honey-product-sheet.pdf",
  },
];
const links = [
  { to: "/", label: "Dashboard", icon: LayoutDashboard, group: "WORKSPACE" },
  {
    to: "/admin",
    label: "Organization Admin",
    icon: Building2,
    group: "WORKSPACE",
  },
  {
    to: "/governance",
    label: "Brand Governance",
    icon: ScanSearch,
    group: "WORKSPACE",
  },
  {
    to: "/knowledge",
    label: "Knowledge Base",
    icon: Boxes,
    group: "GOVERNANCE",
  },
  {
    to: "/reviews",
    label: "Review Centre",
    icon: ClipboardCheck,
    group: "GOVERNANCE",
  },
  {
    to: "/history",
    label: "Verification History",
    icon: FileClock,
    group: "GOVERNANCE",
  },
  { to: "/settings", label: "Settings", icon: Settings, group: "PREFERENCES" },
];
export default function App() {
  const [products, setProducts] = useState(initial),
    [org, setOrg] = useState("Northstar Foods Pvt. Ltd."),
    [brand, setBrand] = useState("Northstar Foods"),
    [guides, setGuides] = useState(
      "Friendly, clear, trustworthy. Avoid unsupported health promises and absolute claims.",
    ),
    [ad, setAd] = useState(""),
    [selected, setSelected] = useState("Classic Biscuits"),
    [file, setFile] = useState(""),
    [findings, setFindings] = useState<Finding[] | null>(null),
    [toast, setToast] = useState(""),
    [mobile, setMobile] = useState(false);
  const loc = useLocation();
  const page = links.find((x) => x.to === loc.pathname)?.label || "Workspace";
  const notify = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(""), 2600);
  };
  const analyze = () => {
    if (!ad.trim() && !file) {
      notify("Paste advertisement text or choose a file first.");
      return;
    }
    const p = products.find((x) => x.name === selected) || products[0],
      t = ad.toLowerCase();
    let f: Finding[] = [];
    if (/zero sugar|sugar-free|sugar free/.test(t))
      f.push({
        title: "Sugar-related claim",
        status: p.facts.toLowerCase().includes("sugar: 5 g")
          ? "Conflicting"
          : "Unverified",
        detail: p.facts.toLowerCase().includes("sugar: 5 g")
          ? "The ad says zero sugar, but the sample product facts list 5 g of sugar per serving. Human review is required."
          : "No approved sugar value was found in this sample record.",
        source: p.proof || "No approved source",
      });
    if (/cure|guaranteed|best in the world/.test(t))
      f.push({
        title: "Absolute or high-risk wording",
        status: "Unverified",
        detail:
          "This wording may need substantiation or review against approved claims and applicable rules.",
        source: "Brand guidelines — review required",
      });
    if (!f.length)
      f.push({
        title: "No matching issue detected by demo rules",
        status: "Unverified",
        detail:
          "This prototype checks only a small set of demonstration rules. This is not proof that every claim is accurate.",
        source: "Limited demo rules",
      });
    f.push({
      title: "Brand tone and guideline check",
      status: "Unverified",
      detail:
        "Guideline retrieval and semantic analysis will be connected in the backend phase.",
      source: "Brand guidelines",
    });
    setFindings(f);
    notify("Demo analysis complete. No real AI or backend is connected.");
  };
  const [organizationId, setOrganizationId] = useState<number | null>(null);
  const [brandId, setBrandId] = useState<number | null>(null);
  return (
    <div className="shell">
      <aside className={"sidebar " + (mobile ? "open" : "")}>
        <div className="logo">
          <div className="mark">
            <ShieldCheck />
          </div>
          <div>
            <b>
              Verity<span>AI</span>
            </b>
            <small>BRAND GOVERNANCE</small>
          </div>
          <button className="close" onClick={() => setMobile(false)}>
            <X />
          </button>
        </div>
        <div className="workspace">
          <div className="workspace-icon">N</div>
          <div>
            <b>{brand}</b>
            <small>Demo workspace</small>
          </div>
        </div>
        <nav>
          {["WORKSPACE", "GOVERNANCE", "PREFERENCES"].map((g) => (
            <div className="navgroup" key={g}>
              <label>{g}</label>
              {links
                .filter((x) => x.group === g)
                .map((x) => {
                  const I = x.icon;
                  return (
                    <NavLink
                      end={x.to === "/"}
                      onClick={() => setMobile(false)}
                      className={({ isActive }) =>
                        "navitem " + (isActive ? "active" : "")
                      }
                      to={x.to}
                      key={x.to}
                    >
                      <I size={18} />
                      {x.label}
                      {x.to === "/governance" && <i />}
                    </NavLink>
                  );
                })}
            </div>
          ))}
        </nav>
        <div className="sidebottom">
          <div className="help">
            <Lightbulb size={17} />
            <div>
              <b>Build with confidence</b>
              <small>Evidence-led brand reviews</small>
            </div>
          </div>
          <div className="user">
            <div>VA</div>
            <span>
              <b>Demo Admin</b>
              <small>Workspace owner</small>
            </span>
          </div>
        </div>
      </aside>
      {mobile && (
        <button className="overlay" onClick={() => setMobile(false)} />
      )}
      <main>
        <header>
          <div className="crumb">
            <button className="menubtn" onClick={() => setMobile(true)}>
              <Menu />
            </button>
            Workspace <ChevronRight size={14} />
            <b>{page}</b>
          </div>
          <div className="topright">
            <div className="search">
              <Search size={15} />
              <input placeholder="Search workspace" />
            </div>
            <button
              className="bell"
              onClick={() => notify("You are all caught up.")}
            >
              <Bell size={18} />
            </button>
            <div className="avatar">VA</div>
          </div>
        </header>
        <div className="content">
          <Routes>
            <Route
              path="/"
              element={
                <>
                  <Heading
                    eyebrow="OVERVIEW"
                    title="Good morning, Admin"
                    desc="Your brand governance workspace at a glance."
                    action={
                      <NavLink className="btn primary" to="/governance">
                        <Plus size={16} /> New verification
                      </NavLink>
                    }
                  />
                  <section className="hero">
                    <div className="kicker">
                      <Sparkles size={14} /> YOUR BRAND, WITH CONFIDENCE
                    </div>
                    <h2>
                      Protect what makes your brand <em>yours.</em>
                    </h2>
                    <p>
                      Verify every claim. Keep every message consistent. Put
                      evidence at the centre of every decision.
                    </p>
                    <NavLink className="btn white" to="/governance">
                      Analyze content <ArrowRight size={16} />
                    </NavLink>
                    <div className="hero-shield">
                      <ShieldCheck size={75} />
                    </div>
                    <span className="chip">✓ Source linked</span>
                  </section>
                  <div className="stats">
                    <Stat
                      label="Products in workspace"
                      value={String(products.length).padStart(2, "0")}
                      icon={<Package />}
                      note="Session sample records"
                    />
                    <Stat
                      label="Checks this week"
                      value="12"
                      icon={<ScanSearch />}
                      note="Illustrative demo metric"
                    />
                    <Stat
                      label="Needs review"
                      value="03"
                      icon={<AlertTriangle />}
                      note="Sample review queue"
                    />
                    <Stat
                      label="Guidelines coverage"
                      value="78%"
                      icon={<BookOpenCheck />}
                      note="Illustrative demo metric"
                    />
                  </div>
                  <div className="columns">
                    <section className="panel">
                      <PanelTitle
                        title="Recent verifications"
                        sub="Illustrative activity in your workspace"
                      />
                      <Table
                        rows={[
                          [
                            "Summer campaign ad",
                            "Social media",
                            "Needs review",
                          ],
                          ["Product launch copy", "Website copy", "Approved"],
                          [
                            "Paid ad variation B",
                            "Paid campaign",
                            "Conflicting",
                          ],
                        ]}
                      />
                    </section>
                    <section className="panel">
                      <PanelTitle
                        title="Governance pulse"
                        sub="Helpful reminders"
                      />
                      <div className="pulse">
                        <CheckCircle2 />
                        <div>
                          <b>Source traceability</b>
                          <small>
                            Link every finding to approved evidence.
                          </small>
                        </div>
                      </div>
                      <div className="pulse">
                        <Clock3 />
                        <div>
                          <b>Human review</b>
                          <small>Keep final approval with your team.</small>
                        </div>
                      </div>
                      <div className="tip">
                        <Lightbulb size={16} /> Add approved product facts and
                        proof documents before your first verification.
                      </div>
                    </section>
                  </div>
                  <div className="quick">
                    <Quick
                      to="/admin"
                      icon={<Building2 />}
                      title="Set up your brand"
                      desc="Add brand rules and product proof."
                    />
                    <Quick
                      to="/governance"
                      icon={<ScanSearch />}
                      title="Verify an advertisement"
                      desc="Check content against approved sources."
                    />
                    <Quick
                      to="/knowledge"
                      icon={<Boxes />}
                      title="Review knowledge base"
                      desc="View facts and evidence references."
                    />
                  </div>
                  <div className="notice">
                    <LockKeyhole size={15} /> Prototype only: dashboard metrics
                    are illustrative; there is no server connected yet.
                  </div>
                </>
              }
            />
            <Route
              path="/admin"
              element={
                <>
                  <Heading
                    eyebrow="WORKSPACE SETUP"
                    title="Organization Admin"
                    desc="Manage organisation details, brand guidelines, product facts and supporting evidence."
                  />
                  <Admin
                    org={org}
                    setOrg={setOrg}
                    brand={brand}
                    setBrand={setBrand}
                    guides={guides}
                    setGuides={setGuides}
                    products={products}
                    setProducts={setProducts}
                    notify={notify}
                  />
                </>
              }
            />
            <Route
              path="/governance"
              element={
                <>
                  <Heading
                    eyebrow="CONTENT REVIEW"
                    title="Brand Governance"
                    desc="Check marketing content against approved facts, claims and brand guidelines."
                  />
                  <div className="govgrid">
                    <section className="panel">
                      <PanelTitle
                        title="New content verification"
                        sub="Choose a product and submit the content to review."
                      />
                      <div className="fields two">
                        <Field label="Product / source scope">
                          <select
                            value={selected}
                            onChange={(e) => setSelected(e.target.value)}
                          >
                            {products.map((p) => (
                              <option key={p.sku}>{p.name}</option>
                            ))}
                          </select>
                        </Field>
                        <Field label="Content channel">
                          <select>
                            <option>Social media</option>
                            <option>Paid advertisement</option>
                            <option>Website / landing page</option>
                            <option>Email campaign</option>
                            <option>Packaging copy</option>
                          </select>
                        </Field>
                      </div>
                      <Field label="Advertisement content">
                        <textarea
                          rows={8}
                          value={ad}
                          onChange={(e) => setAd(e.target.value)}
                          placeholder={
                            "Paste ad copy here…\\n\\nExample: “Enjoy our delicious zero-sugar biscuits.”"
                          }
                        />
                      </Field>
                      <div className="fileline">
                        <label className="btn secondary">
                          <Upload size={15} />
                          {file || "Attach a file"}
                          <input
                            type="file"
                            accept=".txt,.pdf,.doc,.docx,image/*"
                            onChange={(e) =>
                              setFile(e.target.files?.[0]?.name || "")
                            }
                          />
                        </label>
                        <small>
                          File selection is visual only in this prototype.
                        </small>
                      </div>
                      <div className="notice">
                        <ShieldCheck size={15} /> Only compare against approved
                        sources for the selected product. Files are not parsed
                        yet.
                      </div>
                      <div className="actions">
                        <button className="btn primary" onClick={analyze}>
                          <Sparkles size={16} /> Analyze advertisement{" "}
                          <ArrowRight size={16} />
                        </button>
                        <button
                          className="btn secondary"
                          onClick={() => {
                            setAd("");
                            setFile("");
                            setFindings(null);
                          }}
                        >
                          Clear
                        </button>
                      </div>
                      <div className="result">
                        <PanelTitle
                          title="Analysis results"
                          sub="Evidence-backed findings appear here after analysis."
                        />
                        {!findings ? (
                          <div className="empty">
                            <div className="empty-icon">
                              <FileText size={30} />
                              <ShieldCheck size={20} />
                            </div>
                            <b>Ready when you are</b>
                            <p>
                              Submit advertisement content and select Analyze to
                              see sample results.
                            </p>
                            <small>
                              Claims extracted · Evidence retrieved · Findings
                              explained
                            </small>
                          </div>
                        ) : (
                          <>
                            <div className="demoalert">
                              <b>Demo analysis only</b>
                              <p>
                                These results use local sample rules, not a live
                                LLM or database.
                              </p>
                            </div>
                            {findings.map((f, i) => (
                              <div className="finding" key={i}>
                                <div
                                  className={
                                    "findingicon " + f.status.toLowerCase()
                                  }
                                >
                                  {f.status === "Conflicting" ? (
                                    <AlertTriangle size={18} />
                                  ) : (
                                    <CheckCircle2 size={18} />
                                  )}
                                </div>
                                <div>
                                  <div className="findinghead">
                                    <b>{f.title}</b>
                                    <Badge text={f.status} />
                                  </div>
                                  <p>{f.detail}</p>
                                  <small>
                                    <FileText size={13} /> Source: {f.source}
                                  </small>
                                </div>
                              </div>
                            ))}
                          </>
                        )}
                      </div>
                    </section>
                    <aside className="panel">
                      <PanelTitle
                        title="Verification sources"
                        sub="Selected product knowledge"
                      />
                      {(() => {
                        const p = products.find((x) => x.name === selected);
                        return p ? (
                          <>
                            <div className="source">
                              <Package />
                              <div>
                                <b>{p.name}</b>
                                <small>
                                  {p.sku} · {p.category}
                                </small>
                              </div>
                            </div>
                            <label className="source-label">
                              APPROVED FACTS
                            </label>
                            <p className="source-text">
                              {p.facts || "No facts entered."}
                            </p>
                            <label className="source-label">
                              APPROVED CLAIMS
                            </label>
                            <p className="source-text">
                              {p.claims || "No approved claims entered."}
                            </p>
                            <div className="source">
                              <FileText />
                              <div>
                                <b>{p.proof || "No proof document"}</b>
                                <small>Demo source reference only</small>
                              </div>
                            </div>
                          </>
                        ) : (
                          <p>
                            No product records. Add one in Organization Admin.
                          </p>
                        );
                      })()}
                      <NavLink className="textlink" to="/admin">
                        Manage knowledge base <ArrowRight size={14} />
                      </NavLink>
                      <hr />
                      <PanelTitle
                        title="Review workflow"
                        sub="Human oversight"
                      />
                      <Step
                        n="1"
                        title="Submit content"
                        desc="Creator provides a draft"
                        done
                      />
                      <Step
                        n="2"
                        title="Analyse evidence"
                        desc="Findings and sources"
                        done={!!findings}
                      />
                      <Step
                        n="3"
                        title="Human review"
                        desc="Approve or request changes"
                      />
                    </aside>
                  </div>
                </>
              }
            />
            <Route
              path="/knowledge"
              element={
                <>
                  <Heading
                    eyebrow="APPROVED SOURCES"
                    title="Knowledge Base"
                    desc="View brand rules, product facts and evidence references available to the verifier."
                    action={
                      <NavLink className="btn primary" to="/admin">
                        <Plus size={16} /> Add information
                      </NavLink>
                    }
                  />
                  <div className="stats three">
                    <Stat
                      label="Products"
                      value={String(products.length)}
                      icon={<Package />}
                      note="Current session"
                    />
                    <Stat
                      label="Brand guidelines"
                      value={guides ? "01" : "00"}
                      icon={<BookOpenCheck />}
                      note="Draft configuration"
                    />
                    <Stat
                      label="Proof references"
                      value={String(products.filter((p) => p.proof).length)}
                      icon={<FileCheck2Icon />}
                      note="Names only in prototype"
                    />
                  </div>
                  <section className="panel">
                    <PanelTitle
                      title="Brand guidelines"
                      sub={`${brand} · organisation-wide guidance`}
                    />
                    <p className="source-text">{guides}</p>
                    <Badge text="Draft" />
                    <hr />
                    <PanelTitle
                      title="Product facts & source records"
                      sub="Records should be approved and traceable before production verification."
                    />
                    <Table
                      rows={products.map((p) => [
                        p.name,
                        p.sku,
                        p.facts || "—",
                        p.proof || "Not attached",
                      ])}
                    />
                    <div className="notice">
                      Prototype data is held in React state and resets on
                      refresh. Documents are not extracted or indexed.
                    </div>
                  </section>
                </>
              }
            />
            <Route
              path="/reviews"
              element={
                <>
                  <Heading
                    eyebrow="HUMAN OVERSIGHT"
                    title="Review Centre"
                    desc="Inspect findings, supporting evidence, and review decisions."
                  />
                  <section className="panel">
                    <PanelTitle
                      title="Items requiring review"
                      sub="Demo queue · no server-side records"
                    />
                    {findings ? (
                      <>
                        {findings.map((f, i) => (
                          <div className="finding" key={i}>
                            <div className="findingicon">
                              <AlertTriangle />
                            </div>
                            <div>
                              <div className="findinghead">
                                <b>{f.title}</b>
                                <Badge text="Pending review" />
                              </div>
                              <p>{f.detail}</p>
                              <div className="actions">
                                <button
                                  className="btn secondary"
                                  onClick={() =>
                                    notify("Demo decision only; not saved.")
                                  }
                                >
                                  Request changes
                                </button>
                                <button
                                  className="btn primary"
                                  onClick={() =>
                                    notify("Demo approval only; not saved.")
                                  }
                                >
                                  Approve
                                </button>
                              </div>
                            </div>
                          </div>
                        ))}
                      </>
                    ) : (
                      <div className="empty">
                        <ClipboardCheck size={32} />
                        <b>No items in the review queue</b>
                        <p>
                          Run an analysis in Brand Governance to populate this
                          demo view.
                        </p>
                        <NavLink to="/governance" className="btn primary">
                          Open Brand Governance
                        </NavLink>
                      </div>
                    )}
                  </section>
                </>
              }
            />
            <Route
              path="/history"
              element={
                <>
                  <Heading
                    eyebrow="AUDIT TRAIL"
                    title="Verification History"
                    desc="Trace previous checks and understand how content decisions were made."
                  />
                  <div className="stats three">
                    <Stat
                      label="Total checks"
                      value={findings ? "01" : "00"}
                      icon={<ScanSearch />}
                      note="This session"
                    />
                    <Stat
                      label="Findings"
                      value={String(findings?.length || 0)}
                      icon={<AlertTriangle />}
                      note="Demo results"
                    />
                    <Stat
                      label="Persistent audit records"
                      value="00"
                      icon={<FileClock />}
                      note="Backend planned"
                    />
                  </div>
                  <section className="panel">
                    <PanelTitle
                      title="Recent activity"
                      sub="Session-only activity"
                    />
                    {findings ? (
                      <div className="pulse">
                        <ScanSearch />
                        <div>
                          <b>Advertisement analysis completed</b>
                          <small>
                            {findings.length} demo findings · AI integration not
                            connected
                          </small>
                        </div>
                        <Badge text="Demo" />
                      </div>
                    ) : (
                      <div className="empty">
                        <FileClock size={30} />
                        <b>No verification history yet</b>
                        <p>
                          Run your first demo analysis to see a sample record.
                        </p>
                        <NavLink to="/governance" className="btn secondary">
                          Start verification
                        </NavLink>
                      </div>
                    )}
                  </section>
                </>
              }
            />
            <Route
              path="/settings"
              element={
                <>
                  <Heading
                    eyebrow="PREFERENCES"
                    title="Settings"
                    desc="Workspace configuration and planned governance controls."
                  />
                  <div className="columns">
                    <section className="panel">
                      <PanelTitle
                        title="Workspace details"
                        sub="Current prototype configuration"
                      />
                      <Detail label="Organisation" value={org} />
                      <Detail label="Primary brand" value={brand} />
                      <Detail label="Authentication" value="Not implemented" />
                      <Detail
                        label="PostgreSQL database"
                        value="Not connected"
                      />
                      <Detail label="LLM / RAG" value="Planned" />
                    </section>
                    <section className="panel">
                      <PanelTitle
                        title="Responsible AI & privacy"
                        sub="Controls planned for backend integration"
                      />
                      {[
                        "Organisation data separation",
                        "Private document storage",
                        "Approved-source retrieval",
                        "Human approval before publication",
                        "Audit and version history",
                        "Evidence citations and uncertainty",
                      ].map((x) => (
                        <div className="pulse" key={x}>
                          <CheckCircle2 />
                          <div>
                            <b>{x}</b>
                            <small>Planned control</small>
                          </div>
                          <Badge text="Planned" />
                        </div>
                      ))}
                    </section>
                  </div>
                </>
              }
            />
            <Route
              path="*"
              element={
                <div className="panel empty">
                  <h2>Page not found</h2>
                  <NavLink to="/" className="btn primary">
                    Back to dashboard
                  </NavLink>
                </div>
              }
            />
          </Routes>
        </div>
        <footer>
          <span>© 2026 VerityAI</span>
          <span>● Prototype mode · No backend connected</span>
          <span>Built for responsible brand governance</span>
        </footer>
      </main>
      {toast && (
        <div className="toast">
          <CheckCircle2 size={17} />
          {toast}
        </div>
      )}
    </div>
  );
}
function Heading({
  eyebrow,
  title,
  desc,
  action,
}: {
  eyebrow: string;
  title: string;
  desc: string;
  action?: any;
}) {
  return (
    <div className="heading">
      <div>
        <label>{eyebrow}</label>
        <h1>{title}</h1>
        <p>{desc}</p>
      </div>
      {action}
    </div>
  );
}
function Stat({
  label,
  value,
  icon,
  note,
}: {
  label: string;
  value: string;
  icon: any;
  note: string;
}) {
  return (
    <div className="stat">
      <div className="stat-icon">{icon}</div>
      <small>{label}</small>
      <strong>{value}</strong>
      <span>{note}</span>
    </div>
  );
}
function PanelTitle({ title, sub }: { title: string; sub: string }) {
  return (
    <div className="paneltitle">
      <div>
        <h3>{title}</h3>
        <p>{sub}</p>
      </div>
    </div>
  );
}
function Table({ rows }: { rows: string[][] }) {
  return (
    <div className="tablewrap">
      <table>
        <thead>
          <tr>
            {(rows[0]?.length === 4
              ? [
                  "PRODUCT / CONTENT",
                  "ID / TYPE",
                  "FACTS / STATUS",
                  "SOURCE / STATUS",
                ]
              : ["CONTENT", "TYPE", "STATUS"]
            ).map((x, i) => (
              <th key={i}>{x}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {rows.map((r, i) => (
            <tr key={i}>
              {r.map((v, j) => (
                <td key={j}>
                  {j === 2 &&
                  ["Approved", "Needs review", "Conflicting"].includes(v) ? (
                    <Badge text={v} />
                  ) : (
                    v
                  )}
                </td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
function Badge({ text }: { text: string }) {
  return (
    <span className={"badge " + text.toLowerCase().replace(/\s/g, "-")}>
      {text}
    </span>
  );
}
function Quick({
  to,
  icon,
  title,
  desc,
}: {
  to: string;
  icon: any;
  title: string;
  desc: string;
}) {
  return (
    <NavLink to={to} className="quickitem">
      <span>{icon}</span>
      <div>
        <b>{title}</b>
        <small>{desc}</small>
      </div>
      <ChevronRight size={16} />
    </NavLink>
  );
}
function Field({ label, children }: { label: string; children: any }) {
  return (
    <label className="field">
      <span>{label}</span>
      {children}
    </label>
  );
}
function Admin({
  org,
  setOrg,
  brand,
  setBrand,
  guides,
  setGuides,
  products,
  setProducts,
  notify,
}: any) {
  const [tab, setTab] = useState("Organisation");
  const [p, setP] = useState<Product>({
    name: "",
    sku: "",
    category: "",
    facts: "",
    claims: "",
    proof: "",
  });
  const [proof, setProof] = useState("");
  const [logo, setLogo] = useState("");
  const save = (e: any) => {
    e.preventDefault();
    if (!p.name || !p.sku) {
      notify("Product name and ID are required.");
      return;
    }
    setProducts((old: Product[]) =>
      old.some((x) => x.sku === p.sku)
        ? old.map((x) =>
            x.sku === p.sku ? { ...p, proof: proof || p.proof } : x,
          )
        : [...old, { ...p, proof: proof || "No proof document attached" }],
    );
    notify("Product saved in current browser session.");
    setP({ name: "", sku: "", category: "", facts: "", claims: "", proof: "" });
    setProof("");
    setTab("Products & facts");
  };
  return (
    <>
      <div className="banner">
        <Building2 />
        <div>
          <b>Build your brand knowledge base</b>
          <p>
            Structured facts and approved source documents help VerityAI produce
            explainable findings.
          </p>
        </div>
        <span>01 · SETUP</span>
      </div>
      <div className="tabs">
        {[
          "Organisation",
          "Brand guidelines",
          "Products & facts",
          "Proof documents",
        ].map((x) => (
          <button
            className={tab === x ? "selected" : ""}
            onClick={() => setTab(x)}
            key={x}
          >
            {x}
          </button>
        ))}
      </div>
      {tab === "Organisation" && (
        <div className="columns">
          <section className="panel">
            <PanelTitle
              title="Organisation details"
              sub="Set up the workspace identity."
            />
            <form
              onSubmit={(e) => {
                e.preventDefault();
                notify("Organisation details updated in this session.");
              }}
              className="fields two"
            >
              <Field label="Organisation legal name">
                <input
                  required
                  value={org}
                  onChange={(e) => setOrg(e.target.value)}
                />
              </Field>
              <Field label="Primary brand name">
                <input
                  required
                  value={brand}
                  onChange={(e) => setBrand(e.target.value)}
                />
              </Field>
              <Field label="Industry">
                <select>
                  <option>Food & Beverage</option>
                  <option>Consumer goods</option>
                  <option>Healthcare</option>
                  <option>Technology</option>
                  <option>Retail & e-commerce</option>
                  <option>Other</option>
                </select>
              </Field>
              <Field label="Country / market">
                <select>
                  <option>India</option>
                  <option>United States</option>
                  <option>United Kingdom</option>
                  <option>Multiple markets</option>
                </select>
              </Field>
              <div className="wide">
                <Field label="Organisation description">
                  <textarea
                    rows={3}
                    placeholder="What does your organisation make or provide?"
                  />
                </Field>
              </div>
              <div className="wide formactions">
                <small>
                  <LockKeyhole size={14} /> Private workspace controls planned
                </small>
                <button className="btn primary">
                  <CheckCircle2 size={15} /> Save organisation
                </button>
              </div>
            </form>
          </section>
          <aside className="panel">
            <PanelTitle
              title="Why this matters"
              sub="Keep the source scope clear."
            />
            <p className="mutedtext">
              Organisation and product boundaries ensure each advertisement is
              checked against the correct approved sources.
            </p>
            {[
              "Separate brand workspaces",
              "Evidence-backed verification",
              "Version-aware governance",
            ].map((x) => (
              <div className="pulse" key={x}>
                <CheckCircle2 />
                <div>
                  <b>{x}</b>
                </div>
              </div>
            ))}
          </aside>
        </div>
      )}
      {tab === "Brand guidelines" && (
        <div className="columns">
          <section className="panel">
            <PanelTitle
              title="Brand guidelines"
              sub="Define how the brand should look and communicate."
            />
            <form
              className="fields"
              onSubmit={(e) => {
                e.preventDefault();
                notify("Guidelines updated in this session.");
              }}
            >
              <Field label="Brand voice and tone">
                <textarea
                  rows={3}
                  value={guides}
                  onChange={(e) => setGuides(e.target.value)}
                />
              </Field>
              <Field label="Preferred terminology">
                <textarea
                  rows={3}
                  placeholder="Words and phrases the brand prefers"
                />
              </Field>
              <Field label="Restricted or prohibited phrases">
                <textarea
                  rows={3}
                  placeholder="Claims or terms that need review"
                />
              </Field>
              <Field label="Visual identity notes">
                <textarea
                  rows={3}
                  placeholder="Logo placement, colour rules, accessibility"
                />
              </Field>
              <Field label="Logo / brand asset">
                <input
                  type="file"
                  accept="image/*,.pdf"
                  onChange={(e) => setLogo(e.target.files?.[0]?.name || "")}
                />
                {logo && <small>{logo}</small>}
              </Field>
              <button className="btn primary">Save guidelines</button>
            </form>
          </section>
          <aside className="panel">
            <PanelTitle
              title="Guideline checklist"
              sub="Make rules specific and testable."
            />
            <p className="mutedtext">
              Tone, terminology, approved and restricted claims, visual
              identity, effective date, and approver.
            </p>
          </aside>
        </div>
      )}
      {tab === "Products & facts" && (
        <div className="columns">
          <section className="panel">
            <PanelTitle
              title="Add a product"
              sub="Enter facts that can be compared against content."
            />
            <form onSubmit={save} className="fields two">
              <Field label="Product name">
                <input
                  required
                  value={p.name}
                  onChange={(e) => setP({ ...p, name: e.target.value })}
                  placeholder="Classic Biscuits"
                />
              </Field>
              <Field label="Product SKU / ID">
                <input
                  required
                  value={p.sku}
                  onChange={(e) => setP({ ...p, sku: e.target.value })}
                  placeholder="CB-001"
                />
              </Field>
              <Field label="Category">
                <input
                  value={p.category}
                  onChange={(e) => setP({ ...p, category: e.target.value })}
                  placeholder="Biscuits & snacks"
                />
              </Field>
              <Field label="Key facts & specifications">
                <textarea
                  rows={3}
                  value={p.facts}
                  onChange={(e) => setP({ ...p, facts: e.target.value })}
                  placeholder="Sugar: 5 g per serving; contains wheat"
                />
              </Field>
              <div className="wide">
                <Field label="Approved marketing claims">
                  <textarea
                    rows={3}
                    value={p.claims}
                    onChange={(e) => setP({ ...p, claims: e.target.value })}
                    placeholder="One claim per line"
                  />
                </Field>
              </div>
              <div className="wide">
                <Field label="Proof document">
                  <input
                    type="file"
                    accept=".pdf,.doc,.docx,.txt,image/*"
                    onChange={(e) => setProof(e.target.files?.[0]?.name || "")}
                  />
                  {proof && <small>Selected: {proof}</small>}
                </Field>
              </div>
              <div className="wide formactions">
                <small>
                  <FileText size={14} /> File contents are not uploaded or
                  parsed yet.
                </small>
                <button className="btn primary">
                  <Plus size={15} /> Save product
                </button>
              </div>
            </form>
          </section>
          <section className="panel">
            <PanelTitle
              title="Product records"
              sub={`${products.length} records in this session`}
            />
            {products.map((x: Product) => (
              <div className="pulse" key={x.sku}>
                <Package />
                <div>
                  <b>{x.name}</b>
                  <small>
                    {x.sku} · {x.category}
                  </small>
                  <small>{x.proof}</small>
                </div>
                <Badge text="Demo data" />
              </div>
            ))}
          </section>
        </div>
      )}
      {tab === "Proof documents" && (
        <section className="panel uploadpanel">
          <Upload size={28} />
          <h3>Upload supporting documents</h3>
          <p>
            Product specifications, lab reports, certifications, approved
            claims, and brand guidelines.
          </p>
          <input
            type="file"
            multiple
            accept=".pdf,.doc,.docx,.txt,image/*"
            onChange={(e) =>
              notify(
                `${e.target.files?.length || 0} file(s) selected for demo only.`,
              )
            }
          />
          <small>
            Prototype only: files are not uploaded to a server, extracted, or
            approved.
          </small>
          <div className="notice">
            Before use as evidence, an authorised person should confirm source,
            version, effective date and approval status.
          </div>
        </section>
      )}
    </>
  );
}
function Step({
  n,
  title,
  desc,
  done = false,
}: {
  n: string;
  title: string;
  desc: string;
  done?: boolean;
}) {
  return (
    <div className="step">
      <span>{done ? "✓" : n}</span>
      <div>
        <b>{title}</b>
        <small>{desc}</small>
      </div>
    </div>
  );
}
function Detail({ label, value }: { label: string; value: string }) {
  return (
    <div className="detail">
      <span>{label}</span>
      <b>{value}</b>
    </div>
  );
}
function FileCheck2Icon() {
  return <FileUp />;
}
