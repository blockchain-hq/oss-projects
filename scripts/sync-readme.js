const fs = require("fs");
const path = require("path");

// Configuration
const PROCESSED_DATA_FILE = path.join(__dirname, "../processed-data.json");
const README_FILE = path.join(__dirname, "../README.md");

/**
 * Format numbers with commas (e.g., 1000 -> 1,000)
 */
function formatNumber(num) {
  return num.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

/**
 * Create badge markdown
 */
function createBadge(label, value, color = "blue") {
  return `![${label}](https://img.shields.io/badge/${label}-${encodeURIComponent(
    value
  )}-${color})`;
}

try {
  console.log("🚀 Starting README update from enriched data...\n");

  // Read the enriched data
  const data = JSON.parse(fs.readFileSync(PROCESSED_DATA_FILE, "utf8"));
  const projects = data.projects;

  console.log(`📊 Processing ${projects.length} enriched projects\n`);

  // Create the enhanced Markdown Table
  let markdownTable = `| # | Project | Description | Stars | Issues | Language | Last Updated |\n`;
  markdownTable += `| --- | --- | --- | --- | --- | --- | --- |\n`;

  // Populate rows with enriched data
  projects.forEach((item, index) => {
    const stars = formatNumber(item.stars || 0);
    const issues = item.openIssues || 0;
    const language = item.language || "N/A";
    const lastUpdated = item.lastUpdated || "N/A";

    // Truncate description to avoid overly wide tables
    const description =
      item.description && item.description !== "No description"
        ? item.description.substring(0, 80) +
          (item.description.length > 80 ? "..." : "")
        : "No description";

    // Create star badge
    const starBadge = `⭐ ${stars}`;
    const issueBadge = issues > 0 ? `🐛 ${issues}` : "✅ 0";

    markdownTable += `| ${index + 1} | **[${item.name}](${
      item.link
    })** | ${description} | ${starBadge} | ${issueBadge} | \`${language}\` | ${lastUpdated} |\n`;
  });

  // Add summary statistics
  const totalStars = projects.reduce((sum, p) => sum + (p.stars || 0), 0);
  const totalIssues = projects.reduce((sum, p) => sum + (p.openIssues || 0), 0);
  const languages = [
    ...new Set(projects.map((p) => p.language).filter(Boolean)),
  ];

  const summarySection = `
### 📊 Summary Statistics

- **Total Projects:** ${projects.length}
- **Total Stars:** ⭐ ${formatNumber(totalStars)}
- **Open Issues:** 🐛 ${formatNumber(totalIssues)}
- **Languages Used:** ${languages.join(", ")}
- **Last Updated:** ${new Date(data.generatedAt).toLocaleDateString()}

---

`;

  // Read the existing README
  let readmeContent = fs.readFileSync(README_FILE, "utf8");

  // Replace the content between the markers
  const startMarker = "<!-- AUTO-GENERATED-CONTENT:START -->";
  const endMarker = "<!-- AUTO-GENERATED-CONTENT:END -->";

  const regex = new RegExp(`${startMarker}[\\s\\S]*${endMarker}`);
  const newContent = `${startMarker}\n${summarySection}\n${markdownTable}\n${endMarker}`;

  const updatedReadme = readmeContent.replace(regex, newContent);

  // Write the file back
  fs.writeFileSync(README_FILE, updatedReadme);
  console.log("✅ Success: README.md updated with enriched data!");
  console.log(
    `📈 Total stars across all projects: ${formatNumber(totalStars)}`
  );
} catch (error) {
  console.error("❌ Error updating README:", error.message);
  process.exit(1);
}
