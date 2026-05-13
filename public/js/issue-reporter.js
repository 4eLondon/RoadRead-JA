/**
 * issue-reporter.js — GitHub Issue Reporter for RoadReady JA
 * Allows users to submit problems as GitHub issues
 */

class IssueReporter {
  constructor() {
    this.form = document.getElementById('issue-reporter-form');
    this.submitBtn = document.getElementById('issue-submit-btn');
    this.statusEl = document.getElementById('issue-status');
    this.titleInput = document.getElementById('issue-title');
    this.descInput = document.getElementById('issue-description');
    this.typeSelect = document.getElementById('issue-type');

    if (!this.form) return;

    this.form.addEventListener('submit', (e) => this.handleSubmit(e));
  }

  async handleSubmit(e) {
    e.preventDefault();

    const title = this.titleInput.value.trim();
    const description = this.descInput.value.trim();
    const type = this.typeSelect.value;

    if (!title || !description) {
      this.showStatus('Please fill in all fields.', 'error');
      return;
    }

    this.submitBtn.disabled = true;
    this.submitBtn.textContent = 'Submitting…';

    try {
      const res = await fetch('/.netlify/functions/create-issue', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ title, description, type })
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create issue');
      }

      this.showSuccess(data.issue_number, data.issue_url);
      this.form.reset();
    } catch (err) {
      console.error('[IssueReporter]', err);
      this.showStatus(`Error: ${err.message}`, 'error');
    } finally {
      this.submitBtn.disabled = false;
      this.submitBtn.textContent = 'Submit Problem';
    }
  }

  showSuccess(issueNumber, issueUrl) {
    this.statusEl.className = 'issue-status issue-status--success';
    this.statusEl.innerHTML = `
      <strong>✓ Issue created successfully!</strong><br>
      Issue #${issueNumber} has been posted to our GitHub repository.<br>
      <a href="${issueUrl}" target="_blank" rel="noopener">View on GitHub →</a>
    `;
    this.statusEl.style.display = 'block';
  }

  showStatus(message, type) {
    this.statusEl.className = `issue-status issue-status--${type}`;
    this.statusEl.textContent = message;
    this.statusEl.style.display = 'block';
  }
}

/* Boot */
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', () => new IssueReporter());
} else {
  new IssueReporter();
}
