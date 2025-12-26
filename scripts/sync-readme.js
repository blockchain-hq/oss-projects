const fs = require("fs");
const path = require("path");

// 1. Configuration
const DATA_FILE = path.join(__dirname, "../data.json"); // Adjust path as needed
const README_FILE = path.join(__dirname, "../README.md");

try {
  // 2. Read the JSON data
  const data = JSON.parse(fs.readFileSync(DATA_FILE, "utf8"));

  // 3. Create the Markdown Table header
  let markdownTable = "| ID | Name | Link |\n| --- | --- | --- |\n";

  // 4. Populate rows
  data.forEach((item) => {
    // We use standard Markdown link syntax: [Label](URL)
    markdownTable += `| ${item.id} | **${item.name}** | [View Repo](${item.link}) |\n`;
  });

  // 5. Read the existing README
  let readmeContent = fs.readFileSync(README_FILE, "utf8");

  // 6. Replace the content between the markers
  const startMarker = "";
  const endMarker = "";

  const regex = new RegExp(`${startMarker}[\\s\\S]*${endMarker}`);
  const newContent = `${startMarker}\n\n${markdownTable}\n${endMarker}`;

  const updatedReadme = readmeContent.replace(regex, newContent);

  // 7. Write the file back
  fs.writeFileSync(README_FILE, updatedReadme);
  console.log("✅ Success: README.md updated from JSON data!");
} catch (error) {
  console.error("❌ Error updating README:", error.message);
  process.exit(1);
}
