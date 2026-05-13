/**
 * netlify/functions/create-issue.js
 * Serverless function to create GitHub issues
 * Uses GITHUB_TOKEN from environment
 */

exports.handler = async (event) => {
  // Only allow POST requests
  if (event.httpMethod !== 'POST') {
    return {
      statusCode: 405,
      body: JSON.stringify({ error: 'Method not allowed' })
    };
  }

  try {
    const { title, description, type } = JSON.parse(event.body);
    const token = process.env.GITHUB_TOKEN;

    // Validate inputs
    if (!title || !description) {
      return {
        statusCode: 400,
        body: JSON.stringify({ error: 'Title and description are required' })
      };
    }

    if (!token) {
      console.error('[create-issue] GITHUB_TOKEN not set in environment');
      return {
        statusCode: 500,
        body: JSON.stringify({ error: 'Server configuration error' })
      };
    }

    // Build issue body with context
    const labels = type ? [type] : [];
    const issueBody = `**Type:** ${type || 'general'}\n\n${description}`;

    // Create issue via GitHub API
    const res = await fetch('https://api.github.com/repos/4eLondon/RoadRead-JA/issues', {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        title,
        body: issueBody,
        labels
      })
    });

    const data = await res.json();

    if (!res.ok) {
      console.error('[create-issue] GitHub API error:', data);
      return {
        statusCode: res.status,
        body: JSON.stringify({
          error: data.message || 'Failed to create issue'
        })
      };
    }

    return {
      statusCode: 201,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        success: true,
        issue_number: data.number,
        issue_url: data.html_url
      })
    };
  } catch (err) {
    console.error('[create-issue] Error:', err);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: 'Internal server error' })
    };
  }
};
