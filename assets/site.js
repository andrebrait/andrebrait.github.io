const relativeTime = new Intl.RelativeTimeFormat("en", { numeric: "auto" });

export function formatRelative(date, now = Date.now()) {
  const seconds = (new Date(date).getTime() - now) / 1000;
  const units = [["year", 31536000], ["month", 2592000], ["day", 86400], ["hour", 3600], ["minute", 60]];
  const [unit, size] = units.find(([, threshold]) => Math.abs(seconds) >= threshold) || ["second", 1];
  return relativeTime.format(Math.round(seconds / size), unit);
}

function githubUrl(candidate, fallback) {
  try {
    const url = new URL(candidate);
    return url.protocol === "https:" && url.hostname === "github.com" ? url.href : fallback;
  } catch {
    return fallback;
  }
}

export function describeEvent(event) {
  const repo = event.repo?.name || "GitHub";
  const repoUrl = `https://github.com/${repo}`;
  const payload = event.payload || {};
  let action = "Updated";
  let detail = repo;
  let url = repoUrl;

  if (event.type === "PushEvent") {
    action = "Pushed to";
    detail = payload.commits?.[0]?.message?.split("\n")[0] || `${payload.size || "New"} commit${payload.size === 1 ? "" : "s"}`;
  } else if (event.type === "PullRequestEvent") {
    action = `${payload.action === "closed" && payload.pull_request?.merged ? "Merged" : capitalize(payload.action)} a pull request in`;
    detail = payload.pull_request?.title || `Pull request #${payload.number || payload.pull_request?.number}`;
    url = payload.pull_request?.html_url || `${repoUrl}/pull/${payload.number || payload.pull_request?.number}`;
  } else if (event.type === "IssuesEvent") {
    action = `${capitalize(payload.action)} an issue in`;
    detail = payload.issue?.title || `Issue #${payload.issue?.number}`;
    url = payload.issue?.html_url;
  } else if (event.type === "IssueCommentEvent") {
    action = "Commented in";
    detail = payload.issue?.title || `Issue #${payload.issue?.number}`;
    url = payload.comment?.html_url || payload.issue?.html_url;
  } else if (event.type === "ReleaseEvent") {
    action = "Published a release in";
    detail = payload.release?.name || payload.release?.tag_name || repo;
    url = payload.release?.html_url;
  } else if (event.type === "CreateEvent") {
    action = `Created a ${payload.ref_type || "repository item"} in`;
    detail = payload.ref || repo;
  } else if (event.type === "ForkEvent") {
    action = "Forked";
    detail = payload.forkee?.full_name || repo;
    url = payload.forkee?.html_url;
  }

  return { action, detail, repo, url: githubUrl(url, repoUrl) };
}

function capitalize(value = "updated") {
  return value.charAt(0).toUpperCase() + value.slice(1);
}

function renderEvent(event) {
  const item = document.createElement("li");
  const description = describeEvent(event);
  const time = document.createElement("time");
  const link = document.createElement("a");
  const action = document.createElement("span");
  const detail = document.createElement("strong");
  const repo = document.createElement("small");
  const arrow = document.createElement("b");

  time.dateTime = event.created_at;
  time.title = new Date(event.created_at).toLocaleString();
  time.textContent = formatRelative(event.created_at);
  link.href = description.url;
  action.textContent = description.action;
  detail.textContent = description.detail;
  repo.textContent = description.repo;
  arrow.textContent = "↗";
  arrow.setAttribute("aria-hidden", "true");
  link.append(action, detail, repo, arrow);
  item.append(time, link);
  return item;
}

async function loadActivity() {
  const list = document.querySelector("#activity-list");
  const status = document.querySelector("#activity-status");
  const supported = new Set(["PushEvent", "PullRequestEvent", "IssuesEvent", "IssueCommentEvent", "ReleaseEvent", "CreateEvent", "ForkEvent"]);

  try {
    const response = await fetch("https://api.github.com/users/andrebrait/events/public?per_page=30", {
      headers: { Accept: "application/vnd.github+json" }
    });
    if (!response.ok) throw new Error(`GitHub returned ${response.status}`);
    const events = (await response.json())
      .filter(event => supported.has(event.type) && event.payload?.action !== "assigned")
      .slice(0, 7);
    if (!events.length) throw new Error("No public events");
    list.replaceChildren(...events.map(renderEvent));
    status.textContent = "Live public activity from GitHub";
  } catch {
    const item = document.createElement("li");
    const link = document.createElement("a");
    link.href = "https://github.com/andrebrait";
    link.textContent = "Recent activity is temporarily unavailable — view it on GitHub ↗";
    item.className = "activity-fallback";
    item.append(link);
    list.replaceChildren(item);
    status.textContent = "GitHub activity unavailable";
  } finally {
    list.setAttribute("aria-busy", "false");
  }
}

if (typeof document !== "undefined") loadActivity();
