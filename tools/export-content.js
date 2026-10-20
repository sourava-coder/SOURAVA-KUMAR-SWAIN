const fs = require("node:fs");
const path = require("node:path");
const vm = require("node:vm");

const root = path.resolve(__dirname, "..");
const context = {};
vm.runInNewContext(fs.readFileSync(path.join(root, "js", "data.js"), "utf8"), context);
context.P.settings = {
  title: `${context.P.name} | ${context.P.role}`,
  description: `Portfolio of ${context.P.name}, a ${context.P.role}. Projects, skills, resume and contact.`,
  heroIntro: "",
  footer: "",
  maintenanceNotice: "",
  navLabels: {},
};
context.P.displayName = context.P.name;
context.P.resumeUrl = "";
for (const project of context.P.projects) {
  project.published = true;
  project.image = project.image || "";
}
const output = path.join(root, "backend", "seed.json");
fs.writeFileSync(output, `${JSON.stringify(context.P, null, 2)}\n`);
console.log(`Wrote ${path.relative(root, output)}`);
