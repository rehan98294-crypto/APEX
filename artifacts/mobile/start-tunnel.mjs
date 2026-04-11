import ngrok from "@ngrok/ngrok";
import { spawn } from "child_process";
import { setTimeout as sleep } from "timers/promises";

const PORT = process.env.PORT || "19000";

// Start Expo in localhost mode (Metro bundler)
const expo = spawn(
  "pnpm",
  ["exec", "expo", "start", "--localhost", "--port", PORT],
  {
    stdio: "inherit",
    env: {
      ...process.env,
      EXPO_PACKAGER_PROXY_URL: `https://${process.env.REPLIT_EXPO_DEV_DOMAIN}`,
      EXPO_PUBLIC_DOMAIN: process.env.REPLIT_DEV_DOMAIN,
      EXPO_PUBLIC_REPL_ID: process.env.REPL_ID,
      REACT_NATIVE_PACKAGER_HOSTNAME: process.env.REPLIT_DEV_DOMAIN,
    },
  }
);

expo.on("error", (err) => {
  console.error("Expo failed to start:", err.message);
  process.exit(1);
});

expo.on("exit", (code) => {
  process.exit(code ?? 0);
});

// Give Metro ~8 seconds to start before opening the tunnel
await sleep(8000);

try {
  const listener = await ngrok.forward({
    addr: parseInt(PORT, 10),
    authtoken: process.env.NGROK_AUTHTOKEN,
  });

  const url = listener.url();
  // Convert https:// → exp:// for Expo Go deep-link
  const expUrl = url.replace(/^https?:\/\//, "exp://");

  console.log("\n────────────────────────────────────────");
  console.log("  🚇  Ngrok tunnel active");
  console.log(`  Public URL : ${url}`);
  console.log(`  Expo Go    : ${expUrl}`);
  console.log("  Paste the Expo Go URL into the Expo Go app on your phone.");
  console.log("────────────────────────────────────────\n");
} catch (err) {
  console.error("⚠️  Ngrok tunnel failed:", err.message);
  console.error("   The app still works via the Replit canvas preview.");
}

// Keep alive (Expo process holds open)
