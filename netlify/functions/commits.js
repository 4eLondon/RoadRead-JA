// netlify/functions/commits.js
// Proxies GitHub commits API so the token never touches the browser.

exports.handler = async () => {
  const token = process.env.GITHUB_TOKEN;
  const url   = 'https://api.github.com/repos/4eLondon/RoadRead-JA/commits?per_page=8';

  try {
    const res = await fetch(url, {
      headers: {
        Accept: 'application/vnd.github.v3+json',
        ...(token ? { Authorization: `Bearer ${token}` } : {})
      }
    });

    const data = await res.json();

    return {
      statusCode: res.status,
      headers: {
        'Content-Type': 'application/json',
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'public, max-age=300'   // CDN caches for 5 min
      },
      body: JSON.stringify(data)
    };
  } catch (err) {
    return {
      statusCode: 502,
      body: JSON.stringify({ error: 'Failed to reach GitHub' })
    };
  }
};
