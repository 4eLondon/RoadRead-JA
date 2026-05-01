/**
 * commits.js — GitHub Commits Loader for RoadReady JA
 * Fetches recent commits from https://github.com/4eLondon/RoadRead-JA
 *
 * Drop into /public/js/commits.js and add to your HTML:
 *   <script src="/public/js/commits.js" defer></script>
 */

const COMMITS_CONFIG = {
  owner:     '4eLondon',
  repo:      'RoadRead-JA',
  apiUrl:    'https://api.github.com/repos/4eLondon/RoadRead-JA/commits',
  repoUrl:   'https://github.com/4eLondon/RoadRead-JA',
  maxItems:  8,
  cacheTTL:  5 * 60 * 1000   // 5 minutes
};

class CommitsLoader {
  constructor() {
    this.listEl      = document.getElementById('commits-list');
    this.statusEl    = document.getElementById('commits-status');
    this.refreshBtn  = document.getElementById('commits-refresh');
    this.cacheKey    = 'rr_commits_v1';

    if (!this.listEl) return;   // section not present on this page

    if (this.refreshBtn) {
      this.refreshBtn.addEventListener('click', () => {
        this.refreshBtn.classList.add('is-spinning');
        this.refreshBtn.textContent = '↻ Loading…';
        this.load(true);
      });
    }

    this.load();
  }

  /* ── Public entry point ─────────────────────────── */
  async load(forceRefresh = false) {
    this.setStatus('loading', 'Loading commits…');

    if (!forceRefresh) {
      const cached = this.readCache();
      if (cached) {
        this.render(cached);
        this.setStatus('ok', 'Cached · refreshes every 5 min');
        this.resetRefreshBtn();
        return;
      }
    }

    try {
      const res = await fetch(COMMITS_CONFIG.apiUrl, {
        headers: { Accept: 'application/vnd.github.v3+json' }
      });

      if (res.status === 403 || res.status === 429) {
        throw new Error('rate_limited');
      }
      if (!res.ok) {
        throw new Error(`http_${res.status}`);
      }

      const all     = await res.json();
      const commits = all.slice(0, COMMITS_CONFIG.maxItems);

      this.writeCache(commits);
      this.render(commits);
      this.setStatus('ok', `Updated just now · ${commits.length} commits shown`);
    } catch (err) {
      console.warn('[CommitsLoader]', err.message);
      this.renderError(err.message === 'rate_limited');
      this.setStatus('error', err.message === 'rate_limited'
        ? 'GitHub rate limit reached — try again later'
        : 'Could not reach GitHub'
      );
    } finally {
      this.resetRefreshBtn();
    }
  }

  /* ── Cache helpers ──────────────────────────────── */
  readCache() {
    try {
      const raw = localStorage.getItem(this.cacheKey);
      if (!raw) return null;
      const { ts, data } = JSON.parse(raw);
      if (Date.now() - ts > COMMITS_CONFIG.cacheTTL) return null;
      return data;
    } catch { return null; }
  }

  writeCache(commits) {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify({ ts: Date.now(), data: commits }));
    } catch { /* quota — ignore */ }
  }

  /* ── Status indicator ───────────────────────────── */
  setStatus(state, text) {
    if (!this.statusEl) return;
    const dot = this.statusEl.querySelector('.commits-status__dot');
    const txt = this.statusEl.querySelector('.commits-status__text');
    if (dot) {
      dot.className = `commits-status__dot commits-status__dot--${state}`;
    }
    if (txt) txt.textContent = text;
  }

  /* ── Refresh button reset ───────────────────────── */
  resetRefreshBtn() {
    if (!this.refreshBtn) return;
    this.refreshBtn.classList.remove('is-spinning');
    this.refreshBtn.textContent = '↻ Refresh';
  }

  /* ── Render commit list ─────────────────────────── */
  render(commits) {
    if (!this.listEl) return;

    if (!commits || commits.length === 0) {
      this.listEl.innerHTML = '<li class="commits-empty">No commits found.</li>';
      return;
    }

    this.listEl.innerHTML = commits.map(item => {
      /* NOTE: 'item' is the full API object; item.commit is the nested
         commit data object.  Using different names avoids shadowing. */
      const sha      = item.sha;
      const data     = item.commit;          // ← the nested commit object
      const ghAuthor = item.author;          // ← GitHub user object (may be null)

      const shortSha   = sha.slice(0, 7);
      const date       = new Date(data.author.date);
      const authorName = data.author.name;
      const avatar     = ghAuthor?.avatar_url ?? null;
      const initials   = this.initials(authorName);
      const profileUrl = ghAuthor?.html_url  ?? `${COMMITS_CONFIG.repoUrl}/commits`;

      return `
        <li class="commit-item">
          <a class="commit-avatar" href="${profileUrl}" target="_blank" rel="noopener" title="${this.esc(authorName)}">
            ${avatar
              ? `<img src="${avatar}" alt="${this.esc(authorName)}" loading="lazy">`
              : initials}
          </a>
          <div class="commit-meta">
            <span class="commit-author">${this.esc(authorName)}</span>
            <time class="commit-date" datetime="${date.toISOString()}">${this.ago(date)}</time>
          </div>
          <p class="commit-message">${this.esc(data.message.split('\n')[0])}</p>
          <a class="commit-sha"
             href="${item.html_url}"
             target="_blank"
             rel="noopener"
             title="View commit on GitHub">${shortSha}</a>
        </li>
      `;
    }).join('');
  }

  /* ── Error state ────────────────────────────────── */
  renderError(rateLimit = false) {
    if (!this.listEl) return;
    const msg = rateLimit
      ? 'GitHub API rate limit reached. No auth token is set.'
      : 'Could not load commits.';
    this.listEl.innerHTML = `
      <li class="commits-error">
        ${msg}
        <br><br>
        <a href="${COMMITS_CONFIG.repoUrl}/commits" target="_blank" rel="noopener">
          View commits on GitHub →
        </a>
      </li>`;
  }

  /* ── Utilities ──────────────────────────────────── */
  initials(name) {
    if (!name) return '?';
    const parts = name.trim().split(/\s+/);
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  ago(date) {
    const diff    = Date.now() - date;
    const minutes = Math.floor(diff / 60_000);
    const hours   = Math.floor(diff / 3_600_000);
    const days    = Math.floor(diff / 86_400_000);
    if (minutes < 1)  return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours   < 24) return `${hours}h ago`;
    if (days    <  7) return `${days}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  esc(str) {
    const d = document.createElement('div');
    d.textContent = str ?? '';
    return d.innerHTML;
  }
}

/* ── Boot ───────────────────────────────────────────── */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new CommitsLoader());
} else {
  new CommitsLoader();
}
