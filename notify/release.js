const fs = require("fs");
const path = require("path");

const { HOOK_NOTIFICATION_RELEASE } = process.env;
const VERSION_FILE = path.join(__dirname, "latest_version.txt");
const REPO = "paritytech/polkadot-sdk";
const CHECK_INTERVAL = 1000 * 60 * 3;

const sleep = (ms) => new Promise((resolve) => setTimeout(resolve, ms));
let latestVersion = fs.readFileSync(VERSION_FILE, "utf-8").trim();

async function main() {
  for (; ; await sleep(CHECK_INTERVAL)) {
    console.log(`======== [${new Date().toISOString()}] ========`);
    const url = `https://api.github.com/repos/${REPO}/releases/latest`;
    console.log("checking...");
    const release = await (await fetch(url)).json();
    release.repo = REPO;
    if (release.tag_name !== latestVersion) {
      console.log(
        `found new version: ${release.tag_name}, old version: ${latestVersion}`
      );
      await sendMessage(release);
      latestVersion = release.tag_name;
      fs.writeFileSync(VERSION_FILE, latestVersion);
    } else {
      console.log("No new release found");
    }
  }
}
main().catch(console.error);

function sendMessage(o) {
  const data = buildMessage(o);
  console.log("sendMessage", JSON.stringify(data, null, 2));
  return fetch(HOOK_NOTIFICATION_RELEASE, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
}

function buildMessage(o) {
  const items = [
    ["Repo", o.repo],
    ["Version", o.tag_name],
    ["Publish Time", o.published_at],
    ["Url", o.html_url],
  ];
  const messages = [];
  for (const [name, value, href] of items) {
    if (!value) {
      messages.push({
        tag: "text",
        text: name + "\n",
      });
      continue;
    }
    if (!href) {
      messages.push({
        tag: "text",
        text: `${name}: ${value}\n`,
      });
      continue;
    }
    messages.push(
      {
        tag: "text",
        text: name + ": ",
      },
      {
        tag: "a",
        text: value.toString(),
        href,
      },
      {
        tag: "text",
        text: "\n",
      }
    );
  }
  return {
    msg_type: "post",
    content: {
      post: {
        zh_cn: {
          title: "🚀 " + o.name,
          content: [messages],
        },
      },
    },
  };
}
