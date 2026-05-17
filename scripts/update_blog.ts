import { $ } from "bun";
import { mkdir } from "node:fs/promises";
import { join } from "node:path";

// 벨로그 RSS 피드 URL
// example : const rssUrl = "https://api.velog.io/rss/@rimgosu";
const rssUrl = "https://api.velog.io/rss/@mangchohyeon";

const repoPath = ".";
const postsDir = join(repoPath, "velog-posts");

await mkdir(postsDir, { recursive: true });

type FeedEntry = { title: string; description: string };

function decodeXml(text: string): string {
  return text
    .replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&apos;/g, "'")
    .replace(/&amp;/g, "&");
}

function extractTag(block: string, tag: string): string {
  const match = block.match(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`));
  return match?.[1] ? decodeXml(match[1]).trim() : "";
}

function parseFeed(xml: string): FeedEntry[] {
  const entries: FeedEntry[] = [];
  const itemRegex = /<item>([\s\S]*?)<\/item>/g;
  let match: RegExpExecArray | null;
  while ((match = itemRegex.exec(xml)) !== null) {
    const block = match[1] ?? "";
    entries.push({
      title: extractTag(block, "title"),
      description: extractTag(block, "description"),
    });
  }
  return entries;
}

const response = await fetch(rssUrl);
const xml = await response.text();
const entries = parseFeed(xml);

for (const entry of entries) {
  // 파일 이름에서 유효하지 않은 문자 제거 또는 대체
  const fileName = entry.title.replace(/[/\\]/g, "-") + ".md";
  const filePath = join(postsDir, fileName);

  const file = Bun.file(filePath);
  if (await file.exists()) continue;

  await Bun.write(filePath, entry.description);

  // 깃허브 커밋
  await $`git add ${filePath}`;
  await $`git commit -m ${`add post: ${entry.title}`}`;
}

// 변경 사항을 깃허브에 푸시
await $`git push`;
