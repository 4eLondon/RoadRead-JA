/**
 * GitHub Commits Loader for RoadReady JA
 * Fetches and displays recent commits from the project repository.
 */

const COMMITS_CONFIG = {
  repo: '4eLondon/RoadRead-JA',
  apiUrl: 'https://api.github.com/repos/4eLondon/RoadRead-JA/commits',
  maxCommits: 8,
  cacheTTL: 5 * 60 * 1000 // 5 minutes
};

class CommitsLoader {
  constructor() {
    this.listEl = document.getElementById('commits-list');
    this.statusEl = document.getElementById('commits-status');
    this.refreshBtn = document.getElementById('commits-refresh');
    this.cacheKey = 'roadready_commits_cache';
    this.init();
  }

  init() {
    if (this.refreshBtn) {
      this.refreshBtn.addEventListener('click', () => this.fetchCommits(true));
    }
    this.fetchCommits();
  }

  async fetchCommits(forceRefresh = false) {
    this.setStatus('loading', 'Loading commits…');

    // Check cache first
    if (!forceRefresh) {
      const cached = this.getCachedCommits();
      if (cached) {
        this.renderCommits(cached);
        this.setStatus('ok', 'Updated just now');
        return;
      }
    }

    try {
      const response = await fetch(COMMITS_CONFIG.apiUrl, {
        headers: { 'Accept': 'application/vnd.github.v3+json' }
      });

      if (!response.ok) throw new Error(`HTTP ${response.status}`);

      const allCommits = await response.json();
      const commits = allCommits.slice(0, COMMITS_CONFIG.maxCommits);
      this.cacheCommits(commits);
      this.renderCommits(commits);
      this.setStatus('ok', 'Updated just now');
    } catch (err) {
      console.error('Failed to fetch commits:', err);
      this.renderError();
      this.setStatus('error', 'Failed to load commits');
    }
  }

  getCachedCommits() {
    try {
      const raw = localStorage.getItem(this.cacheKey);
      if (!raw) return null;
      const { timestamp, data } = JSON.parse(raw);
      if (Date.now() - timestamp > COMMITS_CONFIG.cacheTTL) return null;
      return data;
    } catch {
      return null;
    }
  }

  cacheCommits(commits) {
    try {
      localStorage.setItem(this.cacheKey, JSON.stringify({
        timestamp: Date.now(),
        data: commits
      }));
    } catch (e) {
      // Ignore quota errors
    }
  }

  setStatus(state, text) {
    if (!this.statusEl) return;
    const dot = this.statusEl.querySelector('.commits-status__dot');
    const txt = this.statusEl.querySelector('.commits-status__text');
    if (dot) {
      dot.className = 'commits-status__dot';
      dot.classList.add(`commits-status__dot--${state}`);
    }
    if (txt) txt.textContent = text;
  }

  renderCommits(commits) {
    if (!this.listEl) return;

    if (!commits || commits.length === 0) {
      this.listEl.innerHTML = '<li class="commits-empty">No commits found.</li>';
      return;
    }

    this.listEl.innerHTML = commits.map(item => {
      const { sha, commit, author, html_url } = item;
      const shortSha = sha.slice(0, 7);
      const date = new Date(commit.author.date);
      const authorName = commit.author.name;
      const initials = this.getInitials(authorName);
      const avatar = author?.avatar_url;

      return `
        <li class="commit-item">
          <div class="commit-meta">
            <div class="commit-avatar">
              ${avatar ? `<img src="${avatar}" alt="${authorName}" loading="lazy">` : initials}
            </div>
            <span class="commit-author">${this.escapeHtml(authorName)}</span>
            <time class="commit-date" datetime="${date.toISOString()}">
              ${this.formatDate(date)}
            </time>
          </div>
          <p class="commit-message">${this.escapeHtml(commit.message.split('\n')[0])}</p>
          <a href="${html_url}" target="_blank" rel="noopener" class="commit-sha" title="View commit on GitHub">
            ${shortSha}
          </a>
        </li>
      `;
    }).join('');
  }

  renderError() {
    if (!this.listEl) return;
    this.listEl.innerHTML = `
      <li class="commits-error">
        Could not load commits. <a href="https://github.com/${COMMITS_CONFIG.repo}/commits" target="_blank" rel="noopener" style="color:var(--accent)">View on GitHub</a>
      </li>
    `;
  }

  getInitials(name) {
    if (!name) return '?';
    const parts = name.trim().split(' ');
    if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
    return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
  }

  formatDate(date) {
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString(undefined, { month: 'short', day: 'numeric' });
  }

  escapeHtml(str) {
    const div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }
}

// Initialize when DOM is ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new CommitsLoader());
} else {
  new CommitsLoader();
}
