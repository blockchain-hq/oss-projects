const fs = require("fs");
const path = require("path");
const https = require("https");

// Configuration
const DATA_FILE = path.join(__dirname, "../data.json");
const PROCESSED_DATA_FILE = path.join(__dirname, "../processed-data.json");

/**
 * Fetch data from GitHub API
 */
function fetchGitHubData(url) {
  return new Promise((resolve, reject) => {
    const options = {
      headers: {
        "User-Agent": "Node.js Script",
        Accept: "application/vnd.github.v3+json",
      },
    };

    https
      .get(url, options, (res) => {
        let data = "";
        res.on("data", (chunk) => (data += chunk));
        res.on("end", () => {
          if (res.statusCode === 200) {
            resolve(JSON.parse(data));
          } else {
            reject(new Error(`API returned status ${res.statusCode}: ${data}`));
          }
        });
      })
      .on("error", reject);
  });
}

/**
 * Extract owner and repo from GitHub URL
 */
function parseGitHubUrl(url) {
  const match = url.match(/github\.com\/([^\/]+)\/([^\/]+)/);
  if (!match) return null;
  return { owner: match[1], repo: match[2].replace(/\.git$/, "") };
}

/**
 * Enrich a single project with GitHub data
 */
async function enrichProject(project) {
  console.log(`📦 Fetching data for: ${project.name}...`);

  const parsed = parseGitHubUrl(project.link);
  if (!parsed) {
    console.warn(`⚠️  Invalid GitHub URL: ${project.link}`);
    return { ...project, error: "Invalid GitHub URL" };
  }

  const apiUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}`;

  try {
    const repoData = await fetchGitHubData(apiUrl);

    // Extract useful information
    const enrichedData = {
      ...project,
      stars: repoData.stargazers_count || 0,
      forks: repoData.forks_count || 0,
      openIssues: repoData.open_issues_count || 0,
      language: repoData.language || "N/A",
      description: repoData.description || "No description",
      topics: repoData.topics || [],
      lastUpdated: repoData.updated_at
        ? new Date(repoData.updated_at).toISOString().split("T")[0]
        : "N/A",
      createdAt: repoData.created_at
        ? new Date(repoData.created_at).toISOString().split("T")[0]
        : "N/A",
      license: repoData.license?.name || "No license",
      watchers: repoData.watchers_count || 0,
      defaultBranch: repoData.default_branch || "main",
      isArchived: repoData.archived || false,
      homepage: repoData.homepage || "",
    };

    // Optional: Fetch contributor count (requires additional API call)
    try {
      const contributorsUrl = `https://api.github.com/repos/${parsed.owner}/${parsed.repo}/contributors?per_page=1`;
      const contributorsRes = await fetchGitHubData(contributorsUrl);
      enrichedData.contributorCount = Array.isArray(contributorsRes)
        ? contributorsRes.length
        : 0;
    } catch (err) {
      console.warn(`⚠️  Could not fetch contributors for ${project.name}`);
      enrichedData.contributorCount = 0;
    }

    console.log(`✅ Successfully enriched: ${project.name}`);
    return enrichedData;
  } catch (error) {
    console.error(`❌ Error fetching data for ${project.name}:`, error.message);
    return {
      ...project,
      error: error.message,
      stars: 0,
      forks: 0,
      openIssues: 0,
      language: "N/A",
    };
  }
}

/**
 * Add delay between API calls to respect rate limits
 */
function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Main function
 */
async function main() {
  try {
    console.log("🚀 Starting data enrichment process...\n");

    // Read original data
    const projects = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));
    console.log(`📄 Found ${projects.length} projects to process\n`);

    const enrichedProjects = [];

    // Process each project with a delay to avoid rate limiting
    for (let i = 0; i < projects.length; i++) {
      const enriched = await enrichProject(projects[i]);
      enrichedProjects.push(enriched);

      // Add delay between requests (GitHub allows ~60 requests/hour without token)
      if (i < projects.length - 1) {
        await delay(1000); // 1 second delay
      }
    }

    // Add metadata about when this was generated
    const output = {
      generatedAt: new Date().toISOString(),
      totalProjects: enrichedProjects.length,
      projects: enrichedProjects,
    };

    // Write to processed data file
    fs.writeFileSync(
      PROCESSED_DATA_FILE,
      JSON.stringify(output, null, 2),
      "utf8"
    );

    console.log(`\n✅ Success! Enriched data saved to ${PROCESSED_DATA_FILE}`);
    console.log(`📊 Total projects processed: ${enrichedProjects.length}`);
  } catch (error) {
    console.error("❌ Fatal error:", error.message);
    process.exit(1);
  }
}

main();
