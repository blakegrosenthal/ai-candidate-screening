import { SAMPLE_DATASETS } from "./data/sampleData.js";
import { REJECT_REASON_EXAMPLES, analyze, extractRequirements } from "./engine/analyzer.js";

const state = {
  started: false,
  jobDescription: "",
  resumes: [],
  requirements: null,
  result: null,
  selected: null,
  analyzing: false,
  workspaceTab: "strong",
  manualResume: { name: "", text: "" },
  filters: {
    minYears: 0,
    locationOnly: false,
    missingMustHave: false,
    weakEvidence: false,
    noHardDisqualifiers: false,
    sort: "bucket"
  }
};

const app = document.getElementById("app");

function render() {
  if (!state.started) return renderLanding();

  app.innerHTML = `
    <div class="container">
      <header class="topbar">
        <div>
          <strong>First Pass Screening Assistant</strong>
          <div class="small">Evidence-based screening summaries for large applicant pools.</div>
        </div>
        <div class="pill-row">
          ${SAMPLE_DATASETS.map((dataset) => `<button class="btn" data-load="${dataset.id}">${dataset.name}</button>`).join("")}
        </div>
      </header>

      <div class="grid layout">
        <aside class="grid sidebar">
          <section class="card">
            <h3>Applicant intake</h3>
            <label>Job description</label>
            <textarea id="jobInput" placeholder="Paste job description here...">${escapeHtml(state.jobDescription)}</textarea>
            <div class="small">Upload text resumes, drag files in, or paste one candidate manually.</div>
            <input type="file" id="resumeInput" accept=".txt,.md,.text" multiple />
            <div id="dropZone" class="dropzone">Drag and drop resumes here</div>

            <div class="grid two">
              <input id="manualResumeName" placeholder="Candidate name" value="${escapeHtml(state.manualResume.name)}" />
              <button id="addManualResume" class="btn">Add resume</button>
            </div>
            <textarea id="manualResumeText" placeholder="Paste resume text">${escapeHtml(state.manualResume.text)}</textarea>

            <div class="small">Applicants loaded: ${state.resumes.map((resume) => resume.name).join(", ") || "None"}</div>
            <button id="analyzeBtn" class="btn btn-primary full" ${state.analyzing ? "disabled" : ""}>
              ${state.analyzing ? "Screening applicants..." : "Run first pass screening"}
            </button>
          </section>

          <section class="card">
            <h3>Screening criteria</h3>
            ${
              state.requirements
                ? `${requirementInputs(state.requirements)}
                   <div class="criteria-preview">
                    <div class="small">Must-have skills</div>
                    <div class="pill-row">${state.requirements.requiredSkills.map((skill) => `<span class="badge b-blue">${skill}</span>`).join("") || "<span class='muted'>None extracted yet</span>"}</div>
                    <div class="small">Nice-to-have skills</div>
                    <div class="pill-row">${state.requirements.preferredSkills.map((skill) => `<span class="badge b-gray">${skill}</span>`).join("") || "<span class='muted'>None extracted yet</span>"}</div>
                   </div>`
                : `<div class="small">Paste a job description to extract editable screening criteria.</div>`
            }
          </section>

          <section class="card">
            <h3>Review controls</h3>
            <label>Minimum years<input id="fYears" type="number" value="${state.filters.minYears}"/></label>
            <label class="check"><input type="checkbox" id="fLocation" ${state.filters.locationOnly ? "checked" : ""}/> Require location match</label>
            <label class="check"><input type="checkbox" id="fMissing" ${state.filters.missingMustHave ? "checked" : ""}/> Show missing must-haves only</label>
            <label class="check"><input type="checkbox" id="fWeakEvidence" ${state.filters.weakEvidence ? "checked" : ""}/> Show weak evidence only</label>
            <label class="check"><input type="checkbox" id="fHard" ${state.filters.noHardDisqualifiers ? "checked" : ""}/> Hide hard disqualifiers</label>
            <label>Sort by
              <select id="fSort">
                <option value="bucket">screening bucket</option>
                <option value="evidence">evidence quality</option>
                <option value="years">years relevant</option>
                <option value="score">secondary score</option>
              </select>
            </label>
          </section>
        </aside>

        <main class="grid">
          ${state.result ? renderResults(state.result) : renderEmptyState()}
        </main>
      </div>

      ${state.selected ? renderDrawer(state.selected) : ""}
    </div>
  `;

  bindWorkspaceEvents();
}

function renderLanding() {
  app.innerHTML = `
    <main class="container hero">
      <div class="eyebrow">First pass screening assistant</div>
      <h1>Get from hundreds of applicants to the candidates worth screening.</h1>
      <p>Surface strong candidates faster, flag likely mismatches, and give recruiters evidence-based summaries they can actually review.</p>
      <div class="notice">Assistive prototype for recruiter workflow learning. Final hiring decisions still need human judgment.</div>
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

function renderEmptyState() {
  return `
    <section class="empty-state">
      <h3>Ready for first pass screening</h3>
      <p>Add a job description and applicants, then run screening to separate strong screens, review candidates, and likely rejects.</p>
    </section>
  `;
}

function renderResults(result) {
  const rows = getFilteredCandidates(result);
  const activeLabel = tabLabel(state.workspaceTab);

  return `
    ${renderSummary(result)}
    ${renderTabs(result)}
    ${renderExportPanel(result)}
    ${
      rows.length
        ? `<section class="card table-card">
            <div class="table-heading">
              <div>
                <h3>${activeLabel}</h3>
                <div class="small">${rows.length} applicants shown</div>
              </div>
              <div class="small">Score is secondary; evidence and disqualifiers drive review.</div>
            </div>
            <div class="table-wrap">
              <table class="table">
                <thead>
                  <tr>
                    <th>Candidate name</th>
                    <th>Current or recent role</th>
                    <th>Screening bucket</th>
                    <th>Evidence summary</th>
                    <th>Missing must-haves</th>
                    <th>Risk / credibility signals</th>
                    <th>Years relevant</th>
                    <th>Location</th>
                    <th>Secondary score</th>
                  </tr>
                </thead>
                <tbody>${rows.map(renderCandidateRow).join("")}</tbody>
              </table>
            </div>
          </section>`
        : `<section class="empty-state compact">No applicants match this view. Adjust the bucket or review controls.</section>`
    }
  `;
}

function renderSummary(result) {
  const summary = result.summary;
  return `
    <section class="summary-grid">
      ${statCard("Total applicants", summary.totalApplicants)}
      ${statCard("Strong screen", summary.strongScreen)}
      ${statCard("Needs review", summary.needsReview)}
      ${statCard("Auto rejected", summary.autoRejected)}
      ${statCard("Top reasons for rejection", countList(summary.topRejectReasons, "No repeated reject reason yet"))}
      ${statCard("Common missing must-haves", countList(summary.commonMissingMustHaves, "No repeated gaps yet"))}
    </section>
  `;
}

function renderTabs(result) {
  const counts = {
    strong: result.summary.strongScreen,
    review: result.summary.needsReview,
    reject: result.summary.autoRejected,
    quickReject: result.candidates.filter((candidate) => candidate.hardDisqualifiers.length).length,
    all: result.candidates.length
  };

  return `
    <nav class="tabs" aria-label="Candidate screening buckets">
      ${["strong", "review", "reject", "quickReject", "all"]
        .map(
          (tab) => `<button class="tab ${state.workspaceTab === tab ? "tab-active" : ""}" data-tab="${tab}">
            ${tabLabel(tab)} <span>${counts[tab]}</span>
          </button>`
        )
        .join("")}
    </nav>
  `;
}

function renderExportPanel(result) {
  const strongNames = result.summary.shortlist.map((candidate) => candidate.name).join(", ") || "None yet";
  return `
    <section class="export-bar">
      <div>
        <strong>Hiring manager shortlist</strong>
        <div class="small">Strong screens: ${escapeHtml(strongNames)}</div>
      </div>
      <div class="pill-row">
        <button class="btn" id="copyShortlistBtn">Copy shortlist summaries</button>
        <button class="btn" id="copyReviewBtn">Copy review queue</button>
        <button class="btn" id="copyRejectBtn">Copy reject reasons</button>
      </div>
    </section>
  `;
}

function renderCandidateRow(candidate) {
  const riskItems = unique([...candidate.hardDisqualifiers, candidate.evidenceQuality, ...candidate.credibilitySignals]).slice(0, 3);
  return `
    <tr class="row-hover" data-candidate="${candidate.id}">
      <td><strong>${escapeHtml(candidate.name)}</strong><div class="small">${escapeHtml(candidate.keyNote)}</div></td>
      <td>${escapeHtml(candidate.parsedTitle)}</td>
      <td>${badge(candidate.screeningBucket)}</td>
      <td class="evidence-cell">${escapeHtml(candidate.evidenceSummary)}</td>
      <td>${tagList(candidate.missingMustHaves, "No missing must-haves", 3)}</td>
      <td>${tagList(riskItems, "No major flags", 3)}</td>
      <td>${formatYears(candidate.parsedYearsExperience)}</td>
      <td>${escapeHtml(candidate.location)}</td>
      <td><span class="secondary-score">${candidate.secondaryScore}</span></td>
    </tr>
  `;
}

function renderDrawer(candidate) {
  const rejectButtons = REJECT_REASON_EXAMPLES.map(
    (reason, index) => `<button class="btn btn-small" data-reject-example="${index}">${escapeHtml(reason)}</button>`
  ).join("");

  return `
    <aside class="drawer" id="drawer">
      <div class="drawer-head">
        <div>
          <div class="small">Candidate screening packet</div>
          <h2>${escapeHtml(candidate.name)}</h2>
          <div class="muted">${escapeHtml(candidate.parsedTitle)} | ${formatYears(candidate.parsedYearsExperience)} | ${escapeHtml(candidate.location)}</div>
        </div>
        <button class="btn" id="closeDrawer">Close</button>
      </div>

      <div class="pill-row">
        ${badge(candidate.screeningBucket)}
        ${badge(candidate.evidenceQuality)}
        <span class="badge b-gray">Secondary score ${candidate.secondaryScore}</span>
      </div>

      ${drawerSection("Why this candidate is worth screening", `<p>${escapeHtml(candidate.whyScreen)}</p>`)}
      ${drawerSection("Evidence supporting that", list(candidate.evidenceItems))}
      ${drawerSection("Missing must-haves", list(candidate.missingMustHaves))}
      ${drawerSection("Risk or unclear", list(unique([...candidate.risks, ...candidate.credibilitySignals])))}
      ${drawerSection("Hard disqualifiers", list(candidate.hardDisqualifiers))}
      ${drawerSection(
        "Skill evidence map",
        `<ul>${candidate.skillCoverage
          .map((skill) => `<li><strong>${escapeHtml(skill.skill)}</strong>: ${labelSignal(skill.signal)} <span class="small">${escapeHtml(skill.evidence)}</span></li>`)
          .join("")}</ul>`
      )}
      ${drawerSection("Quick reject reason examples", `<div class="pill-row">${rejectButtons}</div>`)}
      ${drawerSection("Suggested screening questions", list(candidate.suggestedQuestions))}
      <div class="pill-row drawer-actions">
        <button class="btn" id="copyCandidateBtn">Copy candidate packet</button>
        <button class="btn" id="copyQuestionsBtn">Copy screening questions</button>
      </div>
      ${drawerSection("Resume preview", `<pre>${escapeHtml(candidate.rawResumeText)}</pre>`)}
    </aside>
  `;
}

function bindWorkspaceEvents() {
  document.querySelectorAll("[data-load]").forEach((button) => button.addEventListener("click", () => loadDataset(button.dataset.load)));

  document.getElementById("jobInput")?.addEventListener("input", (event) => {
    state.jobDescription = event.target.value;
    state.requirements = extractRequirements(state.jobDescription);
    render();
  });

  document.getElementById("resumeInput")?.addEventListener("change", async (event) => {
    await readFilesIntoResumes([...(event.target.files || [])]);
    render();
  });

  const dropZone = document.getElementById("dropZone");
  if (dropZone) {
    ["dragenter", "dragover"].forEach((eventName) =>
      dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.add("dropzone-active");
      })
    );
    ["dragleave", "drop"].forEach((eventName) =>
      dropZone.addEventListener(eventName, (event) => {
        event.preventDefault();
        dropZone.classList.remove("dropzone-active");
      })
    );
    dropZone.addEventListener("drop", async (event) => {
      await readFilesIntoResumes([...(event.dataTransfer?.files || [])]);
      render();
    });
  }

  document.getElementById("manualResumeName")?.addEventListener("input", (event) => {
    state.manualResume.name = event.target.value;
  });

  document.getElementById("manualResumeText")?.addEventListener("input", (event) => {
    state.manualResume.text = event.target.value;
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
    state.workspaceTab = "strong";
    state.analyzing = false;
    render();
  });

  bindRequirementEvents();
  bindFilterEvents();

  document.querySelectorAll("[data-tab]").forEach((button) =>
    button.addEventListener("click", () => {
      state.workspaceTab = button.dataset.tab;
      render();
    })
  );

  document.querySelectorAll("[data-candidate]").forEach((row) =>
    row.addEventListener("click", () => {
      state.selected = state.result.candidates.find((candidate) => candidate.id === row.dataset.candidate);
      render();
    })
  );

  document.getElementById("closeDrawer")?.addEventListener("click", () => {
    state.selected = null;
    render();
  });

  document.getElementById("copyShortlistBtn")?.addEventListener("click", () => {
    copyText(formatCandidateList(state.result.candidates.filter((candidate) => candidate.screeningBucket === "Strong screen")));
  });

  document.getElementById("copyReviewBtn")?.addEventListener("click", () => {
    copyText(formatCandidateList(state.result.candidates.filter((candidate) => candidate.screeningBucket === "Review")));
  });

  document.getElementById("copyRejectBtn")?.addEventListener("click", () => {
    copyText(formatRejectReasons(state.result.candidates));
  });

  document.getElementById("copyCandidateBtn")?.addEventListener("click", () => {
    if (!state.selected) return;
    copyText(formatCandidateList([state.selected]));
  });

  document.getElementById("copyQuestionsBtn")?.addEventListener("click", () => {
    if (!state.selected) return;
    copyText(state.selected.suggestedQuestions.join("\n"));
  });

  document.querySelectorAll("[data-reject-example]").forEach((button) =>
    button.addEventListener("click", () => {
      const reason = REJECT_REASON_EXAMPLES[Number(button.dataset.rejectExample)];
      const name = state.selected?.name || "Candidate";
      copyText(`${name}: ${reason}`);
    })
  );
}

async function readFilesIntoResumes(files) {
  const validFiles = files.filter((file) => /\.(txt|md|text)$/i.test(file.name));
  for (const file of validFiles) {
    const text = await file.text();
    state.resumes.push({ id: `upload-${file.name}-${file.size}-${Date.now()}`, name: file.name.replace(/\..+$/, ""), rawResumeText: text });
  }
}

function bindRequirementEvents() {
  ["jobTitle", "requiredSkills", "preferredSkills", "minYearsExperience", "location", "industry", "certifications"].forEach((key) => {
    document.getElementById(`req-${key}`)?.addEventListener("input", (event) => {
      if (!state.requirements) return;
      const value = event.target.value;
      state.requirements[key] = ["requiredSkills", "preferredSkills", "certifications"].includes(key)
        ? split(value)
        : key === "minYearsExperience"
          ? Number(value) || 0
          : value;
    });
  });
}

function bindFilterEvents() {
  document.getElementById("fYears")?.addEventListener("input", (event) => {
    state.filters.minYears = Number(event.target.value) || 0;
    render();
  });
  document.getElementById("fLocation")?.addEventListener("change", (event) => {
    state.filters.locationOnly = event.target.checked;
    render();
  });
  document.getElementById("fMissing")?.addEventListener("change", (event) => {
    state.filters.missingMustHave = event.target.checked;
    render();
  });
  document.getElementById("fWeakEvidence")?.addEventListener("change", (event) => {
    state.filters.weakEvidence = event.target.checked;
    render();
  });
  document.getElementById("fHard")?.addEventListener("change", (event) => {
    state.filters.noHardDisqualifiers = event.target.checked;
    render();
  });

  const sort = document.getElementById("fSort");
  if (sort) {
    sort.value = state.filters.sort;
    sort.addEventListener("change", (event) => {
      state.filters.sort = event.target.value;
      render();
    });
  }
}

function requirementInputs(req) {
  return `
    <label>Role<input id="req-jobTitle" value="${escapeHtml(req.jobTitle)}"/></label>
    <label>Must-have skills<input id="req-requiredSkills" value="${escapeHtml(req.requiredSkills.join(", "))}"/></label>
    <label>Nice-to-have skills<input id="req-preferredSkills" value="${escapeHtml(req.preferredSkills.join(", "))}"/></label>
    <label>Minimum years<input id="req-minYearsExperience" value="${req.minYearsExperience}"/></label>
    <label>Location<input id="req-location" value="${escapeHtml(req.location)}"/></label>
    <label>Industry<input id="req-industry" value="${escapeHtml(req.industry)}"/></label>
    <label>Certifications<input id="req-certifications" value="${escapeHtml(req.certifications.join(", "))}"/></label>
  `;
}

function getFilteredCandidates(result) {
  const req = state.requirements;
  let rows = [...result.candidates];

  if (state.workspaceTab === "strong") rows = rows.filter((candidate) => candidate.screeningBucket === "Strong screen");
  if (state.workspaceTab === "review") rows = rows.filter((candidate) => candidate.screeningBucket === "Review");
  if (state.workspaceTab === "reject") rows = rows.filter((candidate) => candidate.screeningBucket === "Reject");
  if (state.workspaceTab === "quickReject") rows = rows.filter((candidate) => candidate.hardDisqualifiers.length > 0 || candidate.screeningBucket === "Reject");

  rows = rows.filter((candidate) => candidate.parsedYearsExperience >= state.filters.minYears);

  if (state.filters.locationOnly && req) {
    rows = rows.filter((candidate) => candidate.location.toLowerCase().includes(req.location.split(",")[0].toLowerCase()));
  }

  if (state.filters.missingMustHave) rows = rows.filter((candidate) => candidate.missingMustHaves.length > 0);
  if (state.filters.weakEvidence) rows = rows.filter((candidate) => candidate.evidenceQuality === "Weak evidence");
  if (state.filters.noHardDisqualifiers) rows = rows.filter((candidate) => candidate.hardDisqualifiers.length === 0);

  rows.sort((a, b) => {
    if (state.filters.sort === "evidence") return evidenceRank(a.evidenceQuality) - evidenceRank(b.evidenceQuality) || b.secondaryScore - a.secondaryScore;
    if (state.filters.sort === "years") return b.parsedYearsExperience - a.parsedYearsExperience;
    if (state.filters.sort === "score") return b.secondaryScore - a.secondaryScore;
    return bucketRank(a.screeningBucket) - bucketRank(b.screeningBucket) || evidenceRank(a.evidenceQuality) - evidenceRank(b.evidenceQuality) || b.secondaryScore - a.secondaryScore;
  });

  return rows;
}

function loadDataset(id) {
  const dataset = SAMPLE_DATASETS.find((item) => item.id === id);
  if (!dataset) return;

  state.started = true;
  state.jobDescription = dataset.jobDescription;
  state.resumes = [...dataset.resumes];
  state.requirements = extractRequirements(dataset.jobDescription);
  state.result = null;
  state.selected = null;
  state.workspaceTab = "strong";
  render();
}

function formatCandidateList(candidates) {
  if (!candidates.length) return "No candidates in this queue.";
  return candidates
    .map(
      (candidate) => `${candidate.name} | ${candidate.screeningBucket} | ${candidate.parsedTitle} | ${formatYears(candidate.parsedYearsExperience)} | ${candidate.location}
Why screen: ${candidate.whyScreen}
Evidence: ${candidate.evidenceItems.slice(0, 3).join("; ") || "No concrete evidence found."}
Missing: ${candidate.missingMustHaves.join(", ") || "No missing must-haves found."}
Risk or unclear: ${unique([...candidate.hardDisqualifiers, ...candidate.risks]).join("; ") || "No major flags."}`
    )
    .join("\n\n");
}

function formatRejectReasons(candidates) {
  const rejected = candidates.filter((candidate) => candidate.screeningBucket === "Reject" || candidate.hardDisqualifiers.length);
  if (!rejected.length) return "No structured reject reasons yet.";
  return rejected
    .map((candidate) => `${candidate.name}: ${candidate.hardDisqualifiers.join("; ") || "Recruiter review needed"} | Missing: ${candidate.missingMustHaves.join(", ") || "None found"}`)
    .join("\n");
}

function copyText(text) {
  navigator.clipboard?.writeText(text);
}

function statCard(label, value) {
  return `<div class="stat-card"><div class="small">${label}</div><div class="stat-value">${value}</div></div>`;
}

function countList(items, fallback) {
  if (!items?.length) return `<span class="muted">${fallback}</span>`;
  return `<ul class="count-list">${items.map((item) => `<li>${escapeHtml(item.label)} <span>${item.count}</span></li>`).join("")}</ul>`;
}

function tagList(items, fallback, limit = 3) {
  if (!items?.length) return `<span class="muted">${fallback}</span>`;
  const visible = items.slice(0, limit);
  const extra = items.length > limit ? `<span class="tag">+${items.length - limit}</span>` : "";
  return `${visible.map((item) => `<span class="tag">${escapeHtml(item)}</span>`).join("")}${extra}`;
}

function drawerSection(title, body) {
  return `<section class="section"><h4>${title}</h4>${body}</section>`;
}

function list(items) {
  if (!items?.length) return "<div class='small'>None found in this first pass.</div>";
  return `<ul>${items.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>`;
}

function badge(text) {
  const tone =
    text === "Strong screen" || text === "Strong evidence"
      ? "b-green"
      : text === "Review" || text === "Moderate evidence"
        ? "b-blue"
        : text === "Reject" || text === "Weak evidence"
          ? "b-red"
          : "b-gray";
  return `<span class="badge ${tone}">${escapeHtml(text)}</span>`;
}

function labelSignal(signal) {
  return { supported: "Supported", partial: "Partial", missing: "Missing" }[signal] || signal;
}

function tabLabel(tab) {
  return {
    strong: "Strong screen",
    review: "Review",
    reject: "Reject",
    quickReject: "Quick reject queue",
    all: "All applicants"
  }[tab];
}

function bucketRank(bucket) {
  return { "Strong screen": 0, Review: 1, Reject: 2 }[bucket] ?? 9;
}

function evidenceRank(quality) {
  return { "Strong evidence": 0, "Moderate evidence": 1, "Weak evidence": 2 }[quality] ?? 9;
}

function formatYears(value) {
  return value ? `${value} yrs` : "Unknown";
}

function split(value) {
  return value.split(",").map((item) => item.trim()).filter(Boolean);
}

function unique(items) {
  return [...new Set(items.filter(Boolean))];
}

function escapeHtml(value) {
  return String(value || "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;");
}

render();
