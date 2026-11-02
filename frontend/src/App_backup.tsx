import { useEffect, useState } from "react";
import { NavLink, Routes, Route, useLocation } from "react-router-dom";
import {
  createOrganization,
  saveGuidelines,
  getCurrentOrganization,
  updateOrganization,
  createProduct,
  uploadDocument,
  listProducts,
  listDocuments,
  getGuidelines,
  analyzeAdvertisement,
  getOrganization,
  buildDocumentDownloadUrl,
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
  id?: number;
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
const initial: Product[] = [];
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
    [org, setOrg] = useState(""),
    [brand, setBrand] = useState(""),
    [guides, setGuides] = useState(""),

    [ad, setAd] = useState(""),
    [selected, setSelected] = useState("Biscuits"),
    [file, setFile] = useState(""),
    [findings, setFindings] = useState<Finding[] | null>(null),
    [toast, setToast] = useState(""),
    [mobile, setMobile] = useState(false);
  const [analysis, setAnalysis] = useState<any>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [organizationId, setOrganizationId] = useState<number | null>(() => {
    const value = localStorage.getItem("verityai_organization_id");
    return value ? Number(value) : null;
  });
  const [brandId, setBrandId] = useState<number | null>(() => {
    const value = localStorage.getItem("verityai_brand_id");
    return value ? Number(value) : null;
  });

  useEffect(() => {
    let active = true;

    getCurrentOrganization()
      .then((result) => {
        if (!active) return;

        if (!result) {
          setOrg("");
          setBrand("");
          setOrganizationId(null);
          setBrandId(null);

          localStorage.removeItem("verityai_organization_id");
          localStorage.removeItem("verityai_brand_id");

          return;
        }

        setOrganizationId(result.id);
        setBrandId(result.brand_id);
        setOrg(result.legal_name);
        setBrand(result.primary_brand_name);

        localStorage.setItem("verityai_organization_id", String(result.id));
        localStorage.setItem("verityai_brand_id", String(result.brand_id));
      })
      .catch((error) => {
        console.error("Organization loading failed:", error);
      });

    return () => {
      active = false;
    };
  }, []);


  useEffect(() => {
    let active = true;

    getCurrentOrganization()
      .then((result) => {
        if (!active) return;

        if (!result) {
          setOrg("");
          setBrand("");
          setOrganizationId(null);
          setBrandId(null);

          localStorage.removeItem("verityai_organization_id");
          localStorage.removeItem("verityai_brand_id");

          return;
        }

        setOrganizationId(result.id);
        setBrandId(result.brand_id);
        setOrg(result.legal_name);
        setBrand(result.primary_brand_name);

        localStorage.setItem("verityai_organization_id", String(result.id));
        localStorage.setItem("verityai_brand_id", String(result.brand_id));
      })
      .catch((error) => {
        console.error("Could not load current organization:", error);
      });

    return () => {
      active = false;
    };
  }, []);



  const loc = useLocation();
  const page = links.find((x) => x.to === loc.pathname)?.label || "Workspace";
  const notify = (s: string) => {
    setToast(s);
    setTimeout(() => setToast(""), 2600);
  };


  useEffect(() => {
    let active = true;

    if (!brandId) {
      setProducts([]);
      return () => {
        active = false;
      };
    }

    listProducts(brandId)
      .then((rows: any[]) => {
        if (!active) return;

        const loadedProducts: Product[] = rows.map((row) => ({
          id: row.id,
          name: row.name,
          sku: row.sku,
          category: row.category || "",
          facts: row.specifications || "",
          claims: Array.isArray(row.claims)
            ? row.claims.map((claim: any) => claim.claim_text).join("\n")
            : "",
          proof: "See Proof documents",
        }));

        setProducts(loadedProducts);

        setSelected((current) =>
          loadedProducts.some((p) => p.name === current)
            ? current
            : loadedProducts[0]?.name || ""
        );
      })
      .catch((error: unknown) => {
        console.error("Could not load products for Brand Governance:", error);
        if (active) {
          notify(
            error instanceof Error
              ? error.message
              : "Could not load products."
          );
        }
      });

    return () => {
      active = false;
    };
  }, [brandId]);


  const analyze = async () => {
    if (!ad.trim()) {
      notify("Please enter advertisement text first.");
      return;
    }

    const product = products.find((p) => p.name === selected);
    if (!product?.id) {
      notify("No database product ID found. Save the product first.");
      return;
    }

    setAnalyzing(true);
    setFindings(null);
    setAnalysis(null);

    try {
      const result = await analyzeAdvertisement(product.id, ad.trim());
      setAnalysis(result);
      setFindings(
        result.findings.map((finding: any) => ({
          title: finding.claim_text || "Advertisement finding",
          status: String(finding.status || "unknown").replace(/_/g, " "),
          detail: finding.explanation || "",
          source: finding.source || "No source supplied",
        })),
      );
      notify("Advertisement analysis completed.");
    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Advertisement analysis failed.",
      );
    } finally {
      setAnalyzing(false);
    }
  };

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
                    <LockKeyhole size={15} /> Dashboard activity metrics remain illustrative; organisation, product and document forms connect to the backend.
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
                    organizationId={organizationId}
                    setOrganizationId={setOrganizationId}
                    brandId={brandId}
                    setBrandId={setBrandId}
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
                            <option value="">Select a database product</option>

                            {products
                              .filter((p) => Number.isInteger(p.id) && p.id! > 0)
                              .map((p) => (
                                <option key={p.id} value={p.name}>
                                  {p.name} ({p.sku})
                                </option>
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

                        <button className="btn primary" onClick={analyze} disabled={analyzing}>
                          <Sparkles size={16} />
                          {analyzing ? "Analyzing…" : "Analyze advertisement"}
                          {!analyzing && <ArrowRight size={16} />}
                        </button>

                        <button
                          className="btn secondary"
                          onClick={() => {
                            setAd("");
                            setFile("");
                            setFindings(null);
                            setAnalysis(null);
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

                            {analysis && (
                              <>
                                <div className="demoalert">
                                  <div style={{ marginBottom: "8px" }}>
                                    <b>Analysis Engine: </b>
                                    <span>
                                      {analysis.analysis_engine || "Unknown"}
                                    </span>
                                  </div>

                                  <div style={{ marginBottom: "8px" }}>
                                    <b>Gemini Status: </b>
                                    <span>
                                      {analysis.gemini_status || "Unknown"}
                                    </span>
                                  </div>
                                </div>

                                {analysis.limitations?.length > 0 && (
                                  <div className="notice">
                                    <b>Limitations</b>
                                    <ul>
                                      {analysis.limitations.map((item: string, index: number) => (
                                        <li key={index}>{item}</li>
                                      ))}
                                    </ul>
                                  </div>
                                )}
                              </>
                            )}


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
                <KnowledgeBase
                  brandId={brandId}
                  brand={brand}
                  notify={notify}
                />
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
                        value="FastAPI + PostgreSQL"
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
          <span>● Backend-connected workspace · AI analysis planned</span>
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
  organizationId,
  setOrganizationId,
  brandId,
  setBrandId,
}: any) {
  const [tab, setTab] = useState("Organisation");
  const [preferredTerminology, setPreferredTerminology] = useState("");
  const [restrictedPhrases, setRestrictedPhrases] = useState("");
  const [visualIdentityNotes, setVisualIdentityNotes] = useState("");
  const [industry, setIndustry] = useState("Food & Beverage");
  const [countryMarket, setCountryMarket] = useState("India");
  const [description, setDescription] = useState("");
  const [p, setP] = useState<Product>({
    name: "",
    sku: "",
    category: "",
    facts: "",
    claims: "",
    proof: "",
  });
  const [proofFile, setProofFile] = useState<File | null>(null);
  const [logo, setLogo] = useState("");
  const [documentFiles, setDocumentFiles] = useState<File[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!brandId) return;
    let active = true;
    listProducts(brandId)
      .then((rows: any[]) => {
        if (!active) return;
        setProducts(rows.map((row) => ({
          id: row.id,
          name: row.name,
          sku: row.sku,
          category: row.category || "",
          facts: row.specifications || "",
          claims: Array.isArray(row.claims)
            ? row.claims.map((claim: any) => claim.claim_text).join("\n")
            : "",
          proof: "See Proof documents",
        })));
      })
      .catch((error: unknown) => {
        if (active) notify(error instanceof Error ? error.message : "Could not load products.");
      });
    listDocuments(brandId)
      .then((rows) => { if (active) setDocuments(rows as any[]); })
      .catch(() => { if (active) setDocuments([]); });
    return () => { active = false; };
  }, [brandId, setProducts]);



  const saveOrganization = async (e: any) => {
    e.preventDefault();

    if (!org.trim() || !brand.trim()) {
      notify("Organization and brand names are required.");
      return;
    }

    setSaving(true);

    try {
      const payload = {
        legal_name: org.trim(),
        primary_brand_name: brand.trim(),
        industry,
        country_market: countryMarket,
        description: description.trim() || null,
      };

      // Create when database is empty; update otherwise.
      const result = organizationId
        ? await updateOrganization(organizationId, payload)
        : await createOrganization(payload);

      if (!result?.id || !result?.brand_id) {
        throw new Error("Invalid organization response.");
      }

      setOrganizationId(result.id);
      setBrandId(result.brand_id);

      setOrg(result.legal_name);
      setBrand(result.primary_brand_name);

      localStorage.setItem(
        "verityai_organization_id",
        String(result.id)
      );

      localStorage.setItem(
        "verityai_brand_id",
        String(result.brand_id)
      );

      notify(
        organizationId
          ? "Organization updated successfully."
          : "Organization created successfully."
      );

    } catch (error) {
      notify(
        error instanceof Error
          ? error.message
          : "Could not save organization."
      );
    } finally {
      setSaving(false);
    }
  };


  const saveBrandGuidelines = async (e: any) => {
    e.preventDefault();
    if (!brandId) {
      notify("Save the organisation first to create its brand.");
      return;
    }
    setSaving(true);
    try {
      await saveGuidelines(brandId, {
        voice_and_tone: guides,
        preferred_terminology: preferredTerminology,
        restricted_phrases: restrictedPhrases,
        visual_identity_notes: visualIdentityNotes,
      });
      notify("Brand guidelines saved to PostgreSQL.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save guidelines.");
    } finally {
      setSaving(false);
    }
  };

  const save = async (e: any) => {
    e.preventDefault();
    if (!brandId) {
      notify("Save the organisation first before adding products.");
      setTab("Organisation");
      return;
    }
    if (!p.name.trim() || !p.sku.trim()) {
      notify("Product name and ID are required.");
      return;
    }
    setSaving(true);
    try {
      const result: any = await createProduct(brandId, {
        name: p.name.trim(),
        sku: p.sku.trim(),
        category: p.category.trim(),
        specifications: p.facts.trim(),
        approved_claims: p.claims.split("\n").map((x) => x.trim()).filter(Boolean),
      });
      if (proofFile) {
        await uploadDocument(brandId, proofFile, "product_specification", result.id);
      }
      const rows: any[] = await listProducts(brandId);
      setProducts(rows.map((row) => ({
        id: row.id,
        name: row.name,
        sku: row.sku,
        category: row.category || "",
        facts: row.specifications || "",
        claims: Array.isArray(row.claims) ? row.claims.map((claim: any) => claim.claim_text).join("\n") : "",
        proof: "See Proof documents",
      })));
      if (proofFile) {
        const docs = await listDocuments(brandId);
        setDocuments(docs as any[]);
      }
      notify("Product and claims saved to PostgreSQL.");
      setP({ name: "", sku: "", category: "", facts: "", claims: "", proof: "" });
      setProofFile(null);
      setTab("Products & facts");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Could not save product.");
    } finally {
      setSaving(false);
    }
  };

  const uploadProofDocuments = async () => {
    if (!brandId) {
      notify("Save the organisation first before uploading documents.");
      setTab("Organisation");
      return;
    }
    if (!documentFiles.length) {
      notify("Choose one or more PDF files first.");
      return;
    }
    setSaving(true);
    try {
      for (const documentFile of documentFiles) {
        await uploadDocument(brandId, documentFile, "supporting");
      }
      setDocuments((await listDocuments(brandId)) as any[]);
      setDocumentFiles([]);
      notify("Supporting PDF document(s) uploaded to PostgreSQL.");
    } catch (error) {
      notify(error instanceof Error ? error.message : "Document upload failed.");
    } finally {
      setSaving(false);
    }
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
              onSubmit={saveOrganization}
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
                <select value={industry} onChange={(e) => setIndustry(e.target.value)}>
                  <option>Food & Beverage</option>
                  <option>Consumer goods</option>
                  <option>Healthcare</option>
                  <option>Technology</option>
                  <option>Retail & e-commerce</option>
                  <option>Other</option>
                </select>
              </Field>
              <Field label="Country / market">
                <select value={countryMarket} onChange={(e) => setCountryMarket(e.target.value)}>
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
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    placeholder="What does your organisation make or provide?"
                  />
                </Field>
              </div>

              <div className="wide formactions">
                <small>
                  <LockKeyhole size={14} /> Existing organizations remain saved in the database.
                </small>

                <div className="actions">


                  <button className="btn primary" disabled={saving}>
                    <CheckCircle2 size={15} />
                    {saving
                      ? "Saving..."
                      : organizationId
                        ? "Save changes"
                        : "Create organization"}
                  </button>
                </div>
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
              onSubmit={saveBrandGuidelines}
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
              <button className="btn primary" disabled={saving}>{saving ? "Saving…" : "Save guidelines"}</button>
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
              <Field label="Product ID">
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
                    accept=".pdf,application/pdf"
                    onChange={(e) => setProofFile(e.target.files?.[0] || null)}
                  />
                  {proofFile && <small>Selected: {proofFile.name}</small>}
                </Field>
              </div>
              <div className="wide formactions">
                <small>
                  <FileText size={14} /> Product facts and claims are saved to PostgreSQL; selected PDF is uploaded as supporting evidence.
                </small>
                <button className="btn primary" disabled={saving}>
                  <Plus size={15} /> {saving ? "Saving…" : "Save product"}
                </button>
              </div>
            </form>
          </section>
          <section className="panel">
            <PanelTitle
              title="Product records"
              sub={`${products.length} product records from the backend`}
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
                <Badge text="Database" />
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
            accept=".pdf,application/pdf"
            onChange={(e) => setDocumentFiles(Array.from(e.target.files || []))}
          />
          <small>
            Selected: {documentFiles.length} PDF file(s). PDFs are stored by the backend and remain pending until reviewed.
          </small>
          <button className="btn primary" onClick={uploadProofDocuments} disabled={saving}>
            <Upload size={15} /> {saving ? "Uploading…" : "Upload selected PDFs"}
          </button>
          <hr />
          <PanelTitle title="Uploaded documents" sub={`${documents.length} document(s) stored for this brand`} />
          {documents.length === 0 ? (
            <p className="mutedtext">No documents loaded. Save the organisation first and upload a PDF.</p>
          ) : documents.map((doc: any) => (
            <div className="pulse" key={doc.id}>
              <FileText />
              <div>
                <b>{doc.filename}</b>
                <small>{doc.document_type} · {doc.file_size} bytes · {doc.approval_status}</small>
                <small><a href={buildDocumentDownloadUrl(doc.id)} target="_blank" rel="noreferrer">Download PDF</a></small>
              </div>
            </div>
          ))}
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


function KnowledgeBase({
  brandId,
  brand,
  notify,
}: {
  brandId: number | null;
  brand: string;
  notify: (message: string) => void;
}) {
  const [products, setProducts] = useState<any[]>([]);
  const [documents, setDocuments] = useState<any[]>([]);
  const [guidelines, setGuidelines] = useState<any>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [selectedProduct, setSelectedProduct] = useState<number | null>(null);

  useEffect(() => {
    let active = true;

    async function loadKnowledgeBase() {
      if (!brandId) {
        setProducts([]);
        setDocuments([]);
        setGuidelines(null);
        setLoading(false);
        setError(
          "No saved brand is selected. Save an organisation in Organization Admin first."
        );
        return;
      }

      setLoading(true);
      setError("");

      try {
        const [productRows, documentRows, guidelineData] =
          await Promise.all([
            listProducts(brandId),
            listDocuments(brandId),
            getGuidelines(brandId),
          ]);

        if (!active) return;

        setProducts(productRows);
        setDocuments(documentRows);
        setGuidelines(
          Array.isArray(guidelineData)
            ? guidelineData[0] ?? null
            : guidelineData
        );

        setSelectedProduct((current) => {
          if (
            current !== null &&
            productRows.some((p: any) => p.id === current)
          ) {
            return current;
          }
          return productRows[0]?.id ?? null;
        });
      } catch (err) {
        if (!active) return;
        setError(
          err instanceof Error
            ? err.message
            : "Could not load the Knowledge Base."
        );
      } finally {
        if (active) setLoading(false);
      }
    }

    loadKnowledgeBase();

    return () => {
      active = false;
    };
  }, [brandId]);

  const selected = products.find(
    (product) => product.id === selectedProduct
  );

  const guidelineText =
    guidelines?.voice_and_tone ||
    guidelines?.brand_voice_and_tone ||
    "";

  const terminology =
    guidelines?.preferred_terminology || "";

  const restricted =
    guidelines?.restricted_phrases ||
    guidelines?.restricted_or_prohibited_phrases ||
    "";

  const visualNotes =
    guidelines?.visual_identity_notes || "";


  return (
    <>
      <Heading
        eyebrow="APPROVED SOURCES"
        title="Knowledge Base"
        desc="View saved brand guidelines, product facts, marketing claims and supporting evidence retrieved from PostgreSQL."
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
          note="Loaded from PostgreSQL"
        />
        <Stat
          label="Brand guidelines"
          value={guidelines ? "01" : "00"}
          icon={<BookOpenCheck />}
          note={guidelines ? "Saved record found" : "No saved record found"}
        />
        <Stat
          label="Proof references"
          value={String(documents.length)}
          icon={<FileCheck2Icon />}
          note="Stored documents"
        />
      </div>

      {loading && (
        <section className="panel">
          <p>Loading saved organisation information…</p>
        </section>
      )}

      {!loading && error && (
        <section className="panel">
          <PanelTitle
            title="Could not load all knowledge records"
            sub="Check your backend connection and saved brand ID."
          />
          <p className="source-text">{error}</p>
          <button
            className="btn primary"
            onClick={() => window.location.reload()}
          >
            Retry
          </button>
        </section>
      )}

      {!loading && !error && (
        <>
          <section className="panel">
            <PanelTitle
              title="Brand guidelines"
              sub={`${brand} · retrieved from the backend`}
            />

            {guidelines ? (
              <>
                <div className="detail">
                  <span>Brand voice and tone</span>
                  <b>{guidelineText || "Not provided"}</b>
                </div>

                <div className="detail">
                  <span>Preferred terminology</span>
                  <b>{terminology || "Not provided"}</b>
                </div>

                <div className="detail">
                  <span>Restricted or prohibited phrases</span>
                  <b>{restricted || "Not provided"}</b>
                </div>

                <div className="detail">
                  <span>Visual identity notes</span>
                  <b>{visualNotes || "Not provided"}</b>
                </div>

                <Badge text="Saved record" />
              </>
            ) : (
              <div className="empty">
                <BookOpenCheck size={28} />
                <b>No saved guidelines returned</b>
                <p>
                  Save the brand guidelines in Organization Admin,
                  then refresh this page.
                </p>
                <NavLink className="btn secondary" to="/admin">
                  Open Organization Admin
                </NavLink>
              </div>
            )}
          </section>

          <section className="panel">
            <PanelTitle
              title="Product facts & source records"
              sub={`${products.length} product(s) retrieved from the database. Select a product to inspect its stored details.`}
            />

            {products.length === 0 ? (
              <div className="empty">
                <Package size={30} />
                <b>No products found</b>
                <p>Add a product in Organization Admin to populate this list.</p>
                <NavLink className="btn primary" to="/admin">
                  <Plus size={15} /> Add product
                </NavLink>
              </div>
            ) : (
              <>
                <div className="fields">
                  <label className="field">
                    <span>Select product</span>
                    <select
                      value={selectedProduct ?? ""}
                      onChange={(e) =>
                        setSelectedProduct(
                          e.target.value ? Number(e.target.value) : null
                        )
                      }
                    >
                      {products.map((product) => (
                        <option key={product.id} value={product.id}>
                          {product.name} · {product.sku}
                        </option>
                      ))}
                    </select>
                  </label>
                </div>

                {selected && (
                  <div className="pulse">
                    <Package />
                    <div>
                      <b>{selected.name}</b>
                      <small>
                        Product ID: {selected.id} · SKU: {selected.sku}
                      </small>
                      <small>
                        Category: {selected.category || "Not specified"}
                      </small>
                    </div>
                    <Badge text="Database" />
                  </div>
                )}

                {selected && (
                  <>
                    <div className="detail">
                      <span>Key facts and specifications</span>
                      <b>{selected.specifications || "Not provided"}</b>
                    </div>

                    <PanelTitle
                      title="Marketing claims"
                      sub="Claims stored against this product"
                    />

                    {Array.isArray(selected.claims) &&
                      selected.claims.length > 0 ? (
                      selected.claims.map((claim: any) => (
                        <div className="pulse" key={claim.id}>
                          <FileText />
                          <div>
                            <b>{claim.claim_text}</b>
                            <small>
                              Claim ID: {claim.id}
                            </small>
                          </div>
                          <Badge
                            text={claim.approval_status || "Pending"}
                          />
                        </div>
                      ))
                    ) : (
                      <p className="mutedtext">
                        No marketing claim records were returned for this product.
                      </p>
                    )}
                  </>
                )}

                <div className="tablewrap">
                  <table>
                    <thead>
                      <tr>
                        <th>PRODUCT</th>
                        <th>SKU</th>
                        <th>CATEGORY</th>
                        <th>FACTS</th>
                      </tr>
                    </thead>
                    <tbody>
                      {products.map((product) => (
                        <tr key={product.id}>
                          <td>{product.name}</td>
                          <td>{product.sku}</td>
                          <td>{product.category || "—"}</td>
                          <td>{product.specifications || "—"}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </>
            )}
          </section>

          <section className="panel">
            <PanelTitle
              title="Evidence library"
              sub={`${documents.length} document(s) retrieved from PostgreSQL`}
            />

            {documents.length === 0 ? (
              <div className="empty">
                <FileText size={28} />
                <b>No supporting documents found</b>
                <p>Upload a PDF in Organization Admin to see it here.</p>
              </div>
            ) : (
              documents.map((doc: any) => (
                <div className="pulse" key={doc.id}>
                  <FileText />
                  <div>
                    <b>{doc.filename}</b>
                    <small>
                      Document ID: {doc.id} · {doc.document_type}
                    </small>
                    <small>
                      {doc.file_size} bytes · Product ID:{" "}
                      {doc.product_id ?? "Brand-wide"}
                    </small>
                  </div>
                  <div>
                    <Badge text={doc.approval_status || "Pending"} />
                    <p>
                      <a
                        href={buildDocumentDownloadUrl(doc.id)}
                        target="_blank"
                        rel="noreferrer"
                      >
                        Download PDF
                      </a>
                    </p>
                  </div>
                </div>
              ))
            )}
          </section>
        </>
      )}
    </>
  );
}

