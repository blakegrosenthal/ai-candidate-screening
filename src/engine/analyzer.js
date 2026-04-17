const SKILLS = ["salesforce","hubspot","go-to-market","positioning","customer research","lifecycle marketing","pricing","sql","outbound prospecting","meddicc","meddpicc","enterprise sales","node.js","python","microservices","rest","postgresql","aws","gcp","kubernetes","event-driven","testing","pci","soc2"];
const LOCS = ["san francisco","austin","new york","seattle","los angeles","dallas","boston","new jersey"];

const n=(s)=>s.toLowerCase();
const years=(t)=>Math.max(0,...[...t.matchAll(/(\d{1,2})\+?\s+years?/gi)].map(m=>Number(m[1])));
const skills=(t)=>SKILLS.filter(s=>n(t).includes(s));
const location=(t)=>LOCS.find(l=>n(t).includes(l)) || "Unknown";
const title=(t)=> /account executive/i.test(t)?"Account Executive":/product marketing/i.test(t)?"Product Marketing":/backend|engineer/i.test(t)?"Backend Engineer":/manager/i.test(t)?"Manager":"Unknown";

export function extractRequirements(jobDescription){
  const lower=n(jobDescription);
  const all=SKILLS.filter(s=>lower.includes(s));
  return {
    jobTitle: (jobDescription.match(/hiring\s+([^\.]+?)\s+(in|for)/i)?.[1]||"Target Role").trim(),
    requiredSkills: all.slice(0,6),
    preferredSkills: all.slice(6,11),
    minYearsExperience: years(jobDescription)||3,
    location: LOCS.find(l=>lower.includes(l)) || "Flexible",
    certifications: ["license","certification","pci","soc2"].filter(c=>lower.includes(c)),
    industry: ["saas","fintech","hr tech","payments"].find(i=>lower.includes(i))||"general",
    keywords: all.slice(0,8)
  };
}

function parse(candidate){
  return { ...candidate, parsedTitle:title(candidate.rawResumeText), parsedSkills:skills(candidate.rawResumeText), parsedYearsExperience:years(candidate.rawResumeText), location:location(candidate.rawResumeText) };
}

function score(parsed, req){
  const coverage=req.requiredSkills.map(skill=>{
    const has=parsed.parsedSkills.includes(skill);
    const partial=!has && n(parsed.rawResumeText).includes(skill.split(' ')[0]);
    return {skill,signal:has?"supported":partial?"partial":"missing",evidence:has?`Explicit ${skill}`:partial?`Partial mention`:"No evidence"};
  });
  const matched=coverage.filter(x=>x.signal==="supported").length;
  const coveragePct=req.requiredSkills.length?Math.round((matched/req.requiredSkills.length)*100):0;
  let points=Math.round((coveragePct/100)*50);
  const positive=[]; const concerns=[]; const reject=[];

  if(parsed.parsedYearsExperience>=req.minYearsExperience){points+=15;positive.push(`${parsed.parsedYearsExperience} years meets bar`)}
  else {points+=Math.round((parsed.parsedYearsExperience/Math.max(1,req.minYearsExperience))*10); concerns.push(`Below ${req.minYearsExperience}+ years`); reject.push("Below minimum years of experience")}

  const prefHits=req.preferredSkills.filter(s=>parsed.parsedSkills.includes(s));
  points += prefHits.length*4; if(prefHits.length) positive.push(`Preferred skills: ${prefHits.slice(0,2).join(', ')}`);

  if(req.location!=="Flexible"){
    if(n(parsed.location).includes(n(req.location).split(',')[0])) {points+=10; positive.push("Location match");}
    else {concerns.push("Wrong location"); reject.push("Wrong location");}
  }

  if(parsed.parsedTitle!=="Unknown") points += 7; else concerns.push("Title unclear");
  if(coveragePct<50) reject.push("Missing mandatory tool or skill evidence");
  if(coveragePct<70) concerns.push(`Required skill coverage only ${coveragePct}%`); else positive.push(`Required skill coverage ${coveragePct}%`);

  const score=Math.max(0,Math.min(100,Math.round(points)));
  const hardReject=reject.includes("Below minimum years of experience") && coveragePct<35;
  const decision=hardReject||score<45?"Reject":score>=82?"Strong Screen":score>=65?"Screen":"Maybe";
  const gaps=coverage.filter(c=>c.signal==="missing").map(c=>c.skill);

  return {
    score, decision, coveragePct, coverage,
    summary: `${parsed.name} appears to bring ${parsed.parsedYearsExperience||0} years of relevant experience. Strengths include ${positive.slice(0,2).join(' and ')||'limited direct match'}. Concerns include ${concerns.slice(0,2).join('; ')||'no major issues identified'} for this ${req.jobTitle} role.`,
    positiveSignals: positive,
    concerns,
    rejectFlags:[...new Set(reject)],
    keyNote: positive[0] || concerns[0] || "Mixed signal profile",
    whyInteresting: gaps.length?`Missing ${gaps[0]}, but still interesting due to transferable strengths in ${parsed.parsedSkills.slice(0,2).join(' and ')||'adjacent skills'}.`:"Strong direct alignment with role requirements.",
    suggestedQuestions:[
      `Can you walk me through your most relevant experience for ${req.jobTitle}?`,
      `Which project best shows ${req.requiredSkills.slice(0,2).join(' and ')}?`,
      gaps[0]?`I noticed a gap around ${gaps[0]}. How have you handled this area?`:"What outcomes are you most proud of in your recent role?",
      "What are you looking for in your next move?"
    ]
  }
}

export function analyze(jobDescription, candidates, edited){
  const requirements=edited || extractRequirements(jobDescription);
  const analyzed=candidates.map(c=>{
    const p=parse(c); const r=score(p,requirements);
    return {...p,...r,suggestedDecision:r.decision,skillCoverage:r.coverage};
  }).sort((a,b)=>b.score-a.score);

  const decisionCounts={"Strong Screen":0,Screen:0,Maybe:0,Reject:0};
  analyzed.forEach(c=>decisionCounts[c.suggestedDecision]++);
  return {
    requirements,
    candidates:analyzed,
    summary:{
      totalCandidates: analyzed.length,
      avgScore: analyzed.length?Math.round(analyzed.reduce((s,c)=>s+c.score,0)/analyzed.length):0,
      decisionCounts,
      topScreens: analyzed.filter(c=>c.suggestedDecision==="Strong Screen"||c.suggestedDecision==="Screen").slice(0,3)
    }
  };
}
