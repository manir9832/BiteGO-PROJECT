const fs = require("fs");
const path = require("path");

if (process.env.EAS_BUILD_PLATFORM === "android") {
  const source = process.env.GOOGLE_SERVICES_JSON;
  const destination = path.join(
    process.cwd(),
    "android",
    "app",
    "google-services.json"
  );

  if (!source) {
    throw new Error("GOOGLE_SERVICES_JSON is not available on EAS.");
  }

  if (!fs.existsSync(source)) {
    throw new Error(`GOOGLE_SERVICES_JSON file does not exist: ${source}`);
  }

  fs.mkdirSync(path.dirname(destination), { recursive: true });
  fs.copyFileSync(source, destination);

  console.log("✅ google-services.json copied to android/app/");
}