import { SAMPLE_DATASETS } from "./data/sampleData.js";
import { analyze, extractRequirements } from "./engine/analyzer.js";

const state = {
  started: false,
  jobDescription: "",
  resumes: [],
  requirements: null,
  result: null,
  selected: null,
  analyzing: false,
  workspaceTab: "all",
  manualResume: { name: "", text: "" },
  filters: {
    decisionOnly: false,
    minYears: 0,
    locationOnly: false,
    mustHave: false,
    noReject: false,
    sort: "score"
  }
};

const app = document.getElementById("app");

function render() {
  if (!state.started) return renderLanding();

  app.innerHTML = `
    <div class="container">
      <div class="topbar card">
        <div>
          <strong>AI Candidate Screening Assistant</strong>
          <div class="small">Transparent recruiter copilot for faster, explainable screening.</div>
        </div>
        <div class="pill-row">
          ${SAMPLE_DATASETS.map((d) => `<button class="btn" data-load="${d.id}">${d.name}</button>`).join("")}
        </div>
      </div>

      <div class="grid layout">
        <aside class="grid">
          <section class="card">
            <h3>Job description</h3>
            <textarea id="jobInput" placeholder="Paste job description here...">${escapeHtml(state.jobDescription)}</textarea>
            <div class="small" style="margin-top:8px">Upload resumes (.txt), or paste one manually</div>
            <input type="file" id="resumeInput" accept=".txt,.md,.text" multiple />
            <div id="dropZone" class="dropzone">Drag and drop resumes here</div>

            <div class="grid two" style="margin-top:8px">
              <input id="manualResumeName" placeholder="Manual resume candidate name" value="${escapeHtml(state.manualResume.name)}" />
              <button id="addManualResume" class="btn">Add pasted resume</button>
            </div>
            <textarea id="manualResumeText" placeholder="Paste resume text for a candidate">${escapeHtml(state.manualResume.text)}</textarea>

            <div class="small" style="margin-top:8px">Uploaded: ${state.resumes.map((r) => r.name).join(", ") || "None"}</div>
            <button id="analyzeBtn" class="btn btn-primary" style="margin-top:10px;width:100%" ${state.analyzing ? "disabled" : ""}>
              ${state.analyzing ? "Analyzing candidates..." : "Analyze candidates"}
            </button>
          </section>

          <section class="card">
            <h3>Extracted recruiter requirements (editable)</h3>
            ${
              state.requirements
                ? `${requirementInputs(state.requirements)}
                   <div class="small" style="margin-top:8px">Transparent extraction preview</div>
                   <div class="pill-row">${state.requirements.requiredSkills.map((x) => `<span class="badge b-blue">Must: ${x}</span>`).join("")}</div>
                   <div class="pill-row" style="margin-top:4px">${state.requirements.preferredSkills.map((x) => `<span class="badge b-gray">Nice: ${x}</span>`).join("")}</div>`
                : `<div class="small">Paste a job description to extract title, years, skills, location, and certifications.</div>`
            }
          </section>

          <section class="card">
            <h3>Filters and sorting</h3>
            <label><input type="checkbox" id="fDecision" ${state.filters.decisionOnly ? "checked" : ""}/> Show only Strong Screen / Screen</label><br/>
            <label>Minimum years<input id="fYears" type="number" value="${state.filters.minYears}"/></label>
            <label><input type="checkbox" id="fLocation" ${state.filters.locationOnly ? "checked" : ""}/> Require location match</label><br/>
            <label><input type="checkbox" id="fMust" ${state.filters.mustHave ? "checked" : ""}/> Must-have coverage >= 80%</label><br/>
            <label><input type="checkbox" id="fReject" ${state.filters.noReject ? "checked" : ""}/> No hard reject flags</label><br/>
            <label>Sort by
              <select id="fSort">
                <option value="score">fit score</option>
                <option value="decision">decision</option>
                <option value="coverage">required skill coverage</option>
              </select>
            </label>
          </section>
        </aside>

        <section class="grid">
          ${state.result ? renderResults(state.result) : `<div class="card"><h3>Empty state</h3><p class="muted">Load sample candidates or upload/paste resumes, then analyze.</p></div>`}
        </section>
      </div>

      ${state.selected ? renderDrawer(state.selected) : ""}
    </div>
  `;

  bindWorkspaceEvents();
}

function renderLanding() {
  app.innerHTML = `
    <main class="container hero">
      <div class="small" style="color:#0369a1;font-weight:600">AI Candidate Screening Assistant</div>
      <h1>Screen candidates faster with recruiter-style AI summaries</h1>
      <p>Upload a job description and resumes to get a ranked shortlist, clear match reasoning, reject flags, and skill gap analysis in seconds.</p>
      <p class="card" style="background:#fffbeb;border-color:#fde68a">Built for validation: this is a prototype for recruiter workflow learning, not a final hiring decision engine.</p>
      <div class="pill-row">
        <button class="btn btn-primary" id="startBtn">Start screening</button>
        <button class="btn" data-load="pmm">Load sample candidates</button>
      </div>
    </main>
  `;

  document.getElementById("startBtn")?.addEventListener("click", () => {
    state.started = true;
    render();
  });
  document.querySelector('[data-load="pmm"]')?.addEventListener("click", () => loadDataset("pmm"));
}

function renderResults(result) {
  const rows = getFilteredCandidates(result, state.workspaceTab === "rejects");

  const summaryCards = `
    <div class="grid stats">
      <div class="card"><div class="small">Total candidates analyzed</div><div>${result.summary.totalCandidates}</div></div>
      <div class="card"><div class="small">Average fit score</div><div>${result.summary.avgScore}</div></div>
      <div class="card"><div class="small">Top 3 screen candidates</div><div>${result.summary.topScreens.map((c) => c.name).join(", ") || "None"}</div></div>
      <div class="card"><div class="small">Decision buckets</div><div>Strong ${result.summary.decisionCounts["Strong Screen"]} • Screen ${result.summary.decisionCounts.Screen} • Maybe ${result.summary.decisionCounts.Maybe} • Reject ${result.summary.decisionCounts.Reject}</div></div>
    </div>
  `;

  const tabs = `
    <div class="card" style="padding:8px 12px;display:flex;justify-content:space-between;align-items:center">
      <div class="pill-row">
        <button class="btn ${state.workspaceTab === "all" ? "btn-primary" : ""}" id="tabAll">All candidates</button>
        <button class="btn ${state.workspaceTab === "rejects" ? "btn-primary" : ""}" id="tabRejects">Quick reject workflow</button>
      </div>
      <div class="small">${rows.length} shown</div>
    </div>
  `;

  if (!rows.length) {
    return `${summaryCards}${tabs}<div class="card">No candidates match this view. Try adjusting filters.</div>`;
  }

  return `${summaryCards}${tabs}
    <div class="card">
      <table class="table">
        <thead>
          <tr>
            <th>Candidate name</th>
            <th>Fit score</th>
            <th>Suggested decision</th>
            <th>Key notes</th>
            <th>Required skill coverage %</th>
            <th>Quick flags</th>
          </tr>
        </thead>
        <tbody>
          ${rows
            .map(
              ({ candidate, coveragePct }) => `<tr class="row-hover" data-candidate="${candidate.id}">
              <td>${candidate.name}<div class="small">${candidate.parsedTitle}</div></td>
              <td>${candidate.score}</td>
              <td>${badge(candidate.suggestedDecision)}</td>
              <td>${escapeHtml(candidate.keyNote)}</td>
              <td>${coveragePct}%</td>
              <td>${escapeHtml(candidate.rejectFlags.slice(0, 2).join(" • ") || "—")}</td>
            </tr>`
            )
            .join("")}
        </tbody>
      </table>
    </div>
    <div class="card">
      <h4>Export candidate summaries</h4>
      <div class="pill-row">
        <button class="btn" id="copySummaryBtn">Copy summaries</button>
        <button class="btn" id="copyRejectBtn">Copy reject reasons</button>
      </div>
      <p class="small">Disclaimer: assistive output only. Final hiring decisions should include recruiter judgment.</p>
    </div>
  `;
}

function renderDrawer(c) {
  return `
    <aside class="drawer" id="drawer">
      <div style="display:flex;justify-content:space-between;gap:10px">
        <div>
          <h2 style="margin:0">${c.name}</h2>
          <div class="small">${c.parsedTitle} • ${c.location}</div>
        </div>
        <button class="btn" id="closeDrawer">Close</button>
      </div>

      <div class="pill-row" style="margin:8px 0">
        ${badge(`Fit ${c.score}`)}
        ${badge(c.suggestedDecision)}
      </div>

      ${drawerSection("Recruiter Summary", `<p>${escapeHtml(c.summary)}</p>`) }
      ${drawerSection("Why this candidate stands out", list(c.positiveSignals))}
      ${drawerSection("Why this candidate might still be interesting", `<p>${escapeHtml(c.whyInteresting)}</p>`) }
      ${drawerSection("Possible concerns", list(c.concerns))}
      ${drawerSection("Reject Flags", list(c.rejectFlags))}
      ${drawerSection(
        "Skill Coverage Map",
        `<ul>${c.skillCoverage
          .map(
            (s) => `<li>${s.skill} ${s.signal === "supported" ? "✓" : s.signal === "partial" ? "△" : "✕"} <span class="small">${escapeHtml(s.evidence)}</span></li>`
          )
          .join("")}</ul><div class="small">Legend: ✓ clearly supported • △ partial/unclear • ✕ not found</div>`
      )}
      ${drawerSection("Suggested screening questions", list(c.suggestedQuestions))}
      <button class="btn" id="copyQuestionsBtn">Copy screening questions</button>
      ${drawerSection("Resume preview", `<pre style="white-space:pre-wrap;background:#f8fafc;padding:8px;border-radius:8px">${escapeHtml(c.rawResumeText)}</pre>`) }
    </aside>
  `;
}

function bindWorkspaceEvents() {
  document.querySelectorAll("[data-load]").forEach((btn) => btn.addEventListener("click", () => loadDataset(btn.dataset.load)));

  document.getElementById("jobInput")?.addEventListener("input", (e) => {
    state.jobDescription = e.target.value;
    state.requirements = extractRequirements(state.jobDescription);
    render();
  });

  document.getElementById("resumeInput")?.addEventListener("change", async (e) => {
    await readFilesIntoResumes([...e.target.files || []]);
    render();
  });

  const dropZone = document.getElementById("dropZone");
  if (dropZone) {
    ["dragenter", "dragover"].forEach((evt) => dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.add("dropzone-active");
    }));
    ["dragleave", "drop"].forEach((evt) => dropZone.addEventListener(evt, (e) => {
      e.preventDefault();
      dropZone.classList.remove("dropzone-active");
    }));
    dropZone.addEventListener("drop", async (e) => {
      await readFilesIntoResumes([...(e.dataTransfer?.files || [])]);
      render();
    });
  }

  document.getElementById("manualResumeName")?.addEventListener("input", (e) => {
    state.manualResume.name = e.target.value;
  });

  document.getElementById("manualResumeText")?.addEventListener("input", (e) => {
    state.manualResume.text = e.target.value;
  });

  document.getElementById("addManualResume")?.addEventListener("click", () => {
    if (!state.manualResume.name.trim() || !state.manualResume.text.trim()) return;
    state.resumes.push({
      id: `manual-${Date.now()}`,
      name: state.manualResume.name.trim(),
      rawResumeText: state.manualResume.text.trim()
    });
    state.manualResume = { name: "", text: "" };
    render();
  });

  document.getElementById("analyzeBtn")?.addEventListener("click", async () => {
    if (!state.jobDescription.trim() || !state.resumes.length || state.analyzing) return;
    state.analyzing = true;
    render();
    state.requirements ||= extractRequirements(state.jobDescription);

    await new Promise((resolve) => setTimeout(resolve, 350));

    state.result = analyze(state.jobDescription, state.resumes, state.requirements);
    state.analyzing = false;
    render();
  });

  bindRequirementEvents();
  bindFilterEvents();

  document.getElementById("tabAll")?.addEventListener("click", () => {
    state.workspaceTab = "all";
    render();
  });

  document.getElementById("tabRejects")?.addEventListener("click", () => {
    state.workspaceTab = "rejects";
    render();
  });

  document.querySelectorAll("[data-candidate]").forEach((row) => row.addEventListener("click", () => {
    state.selected = state.result.candidates.find((c) => c.id === row.dataset.candidate);
    render();
  }));

  document.getElementById("closeDrawer")?.addEventListener("click", () => {
    state.selected = null;
    render();
  });

  document.getElementById("copySummaryBtn")?.addEventListener("click", async () => {
    const text = state.result.candidates.map((c) => `${c.name} | ${c.suggestedDecision}\n${c.summary}`).join("\n\n");
    await navigator.clipboard.writeText(text);
  });

  document.getElementById("copyRejectBtn")?.addEventListener("click", async () => {
    const text = state.result.candidates
      .filter((c) => c.rejectFlags.length)
      .map((c) => `${c.name}: ${c.rejectFlags.join("; ")}`)
      .join("\n");
    await navigator.clipboard.writeText(text || "No reject flags.");
  });

  document.getElementById("copyQuestionsBtn")?.addEventListener("click", async () => {
    if (!state.selected) return;
    await navigator.clipboard.writeText(state.selected.suggestedQuestions.join("\n"));
  });
}

async function readFilesIntoResumes(files) {
  const validFiles = files.filter((f) => /\.(txt|md|text)$/i.test(f.name));
  for (const file of validFiles) {
    const text = await file.text();
    state.resumes.push({ id: `upload-${file.name}-${file.size}-${Date.now()}`, name: file.name.replace(/\..+$/, ""), rawResumeText: text });
  }
}

function bindRequirementEvents() {
  ["jobTitle", "requiredSkills", "preferredSkills", "minYearsExperience", "location", "industry", "certifications"].forEach((k) => {
    document.getElementById(`req-${k}`)?.addEventListener("input", (e) => {
      if (!state.requirements) return;
      const val = e.target.value;
      state.requirements[k] = ["requiredSkills", "preferredSkills", "certifications"].includes(k)
        ? split(val)
        : k === "minYearsExperience"
          ? Number(val) || 0
          : val;
    });
  });
}

function bindFilterEvents() {
  document.getElementById("fDecision")?.addEventListener("change", (e) => {
    state.filters.decisionOnly = e.target.checked;
    render();
  });
  document.getElementById("fYears")?.addEventListener("input", (e) => {
    state.filters.minYears = Number(e.target.value) || 0;
    render();
  });
  document.getElementById("fLocation")?.addEventListener("change", (e) => {
    state.filters.locationOnly = e.target.checked;
    render();
  });
  document.getElementById("fMust")?.addEventListener("change", (e) => {
    state.filters.mustHave = e.target.checked;
    render();
  });
  document.getElementById("fReject")?.addEventListener("change", (e) => {
    state.filters.noReject = e.target.checked;
    render();
  });

  const sort = document.getElementById("fSort");
  if (sort) {
    sort.value = state.filters.sort;
    sort.addEventListener("change", (e) => {
      state.filters.sort = e.target.value;
      render();
    });
  }
}

function requirementInputs(req) {
  return `
    <label>Job title<input id="req-jobTitle" value="${escapeHtml(req.jobTitle)}"/></label>
    <label>Must-have skills<input id="req-requiredSkills" value="${escapeHtml(req.requiredSkills.join(", "))}"/></label>
    <label>Nice-to-have skills<input id="req-preferredSkills" value="${escapeHtml(req.preferredSkills.join(", "))}"/></label>
    <label>Minimum years<input id="req-minYearsExperience" value="${req.minYearsExperience}"/></label>
    <label>Location<input id="req-location" value="${escapeHtml(req.location)}"/></label>
    <label>Industry<input id="req-industry" value="${escapeHtml(req.industry)}"/></label>
    <label>Certifications<input id="req-certifications" value="${escapeHtml(req.certifications.join(", "))}"/></label>
  `;
}

function getFilteredCandidates(result, rejectsOnly) {
  const req = state.requirements;
  let rows = result.candidates.map((c) => ({
    candidate: c,
    coveragePct: c.skillCoverage.length ? Math.round((c.skillCoverage.filter((s) => s.signal === "supported").length / c.skillCoverage.length) * 100) : 0
  }));

  if (rejectsOnly) rows = rows.filter((r) => r.candidate.suggestedDecision === "Reject" || r.candidate.rejectFlags.length > 0);
  if (state.filters.decisionOnly) rows = rows.filter((r) => ["Strong Screen", "Screen"].includes(r.candidate.suggestedDecision));

  rows = rows.filter((r) => r.candidate.parsedYearsExperience >= state.filters.minYears);

  if (state.filters.locationOnly && req) {
    rows = rows.filter((r) => r.candidate.location.toLowerCase().includes(req.location.split(",")[0].toLowerCase()));
  }

  if (state.filters.mustHave) rows = rows.filter((r) => r.coveragePct >= 80);
  if (state.filters.noReject) rows = rows.filter((r) => r.candidate.rejectFlags.length === 0);

  rows.sort((a, b) => {
    if (state.filters.sort === "coverage") return b.coveragePct - a.coveragePct;
    if (state.filters.sort === "decision") return rank(a.candidate.suggestedDecision) - rank(b.candidate.suggestedDecision);
    return b.candidate.score - a.candidate.score;
  });

  return rows;
}

function loadDataset(id) {
  const dataset = SAMPLE_DATASETS.find((x) => x.id === id);
  if (!dataset) return;

  state.started = true;
  state.jobDescription = dataset.jobDescription;
  state.resumes = [...dataset.resumes];
  state.requirements = extractRequirements(dataset.jobDescription);
  state.result = null;
  state.selected = null;
  state.workspaceTab = "all";
  render();
}

function rank(decision) {
  return { "Strong Screen": 0, Screen: 1, Maybe: 2, Reject: 3 }[decision] ?? 9;
}

function split(value) {
  return value.split(",").map((x) => x.trim()).filter(Boolean);
}

function drawerSection(title, body) {
  return `<section class="section"><h4>${title}</h4>${body}</section>`;
}

function list(items) {
  if (!items?.length) return "<div class='small'>None.</div>";
  return `<ul>${items.map((x) => `<li>${escapeHtml(x)}</li>`).join("")}</ul>`;
}

function badge(text) {
  const tone = text.includes("Strong") ? "b-green" : text === "Screen" ? "b-blue" : text === "Maybe" ? "b-yellow" : text.includes("Reject") ? "b-red" : "b-gray";
  return `<span class="badge ${tone}">${escapeHtml(text)}</span>`;
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

render();
