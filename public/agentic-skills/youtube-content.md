---
name: youtube-content
description: "YouTube transcripts to summaries, threads, blogs."
platforms: [linux, macos, windows]
---

# YouTube Content Tool

## When to use

Use when the user shares a YouTube URL or video link, asks to summarize a video, requests a transcript, or wants to extract and reformat content from any YouTube video. Transforms transcripts into structured content (chapters, summaries, threads, blog posts).

Extract transcripts from YouTube videos and convert them into useful formats.

## Setup

```bash
pip install youtube-transcript-api
```

## Helper Script

`SKILL_DIR` is the directory containing this SKILL.md file. The script accepts any standard YouTube URL format, short links (youtu.be), shorts, embeds, live links, or a raw 11-character video ID.

```bash
# JSON output with metadata
python3 SKILL_DIR/scripts/fetch_transcript.py "https://youtube.com/watch?v=VIDEO_ID"

# Plain text (good for piping into further processing)
python3 SKILL_DIR/scripts/fetch_transcript.py "URL" --text-only

# With timestamps
python3 SKILL_DIR/scripts/fetch_transcript.py "URL" --timestamps

# Specific language with fallback chain
python3 SKILL_DIR/scripts/fetch_transcript.py "URL" --language tr,en
```

## Output Formats

After fetching the transcript, format it based on what the user asks for:

- **Chapters**: Group by topic shifts, output timestamped chapter list
- **Summary**: Concise 5-10 sentence overview of the entire video
- **Chapter summaries**: Chapters with a short paragraph summary for each
- **Thread**: Twitter/X thread format — numbered posts, each under 280 chars
- **Blog post**: Full article with title, sections, and key takeaways
- **Quotes**: Notable quotes with timestamps

### Example — Chapters Output

```
00:00 Introduction — host opens with the problem statement
03:45 Background — prior work and why existing solutions fall short
12:20 Core method — walkthrough of the proposed approach
24:10 Results — benchmark comparisons and key takeaways
31:55 Q&A — audience questions on scalability and next steps
```

## Workflow

1. **Fetch** the transcript using the helper script with `--text-only --timestamps`.
2. **Validate**: confirm the output is non-empty and in the expected language. If empty, retry without `--language` to get any available transcript. If still empty, tell the user the video likely has transcripts disabled.
3. **Chunk if needed**: if the transcript exceeds ~50K characters, split into overlapping chunks (~40K with 2K overlap) and summarize each chunk before merging.
4. **Transform** into the requested output format. If the user did not specify a format, default to a summary.
5. **Verify**: re-read the transformed output to check for coherence, correct timestamps, and completeness before presenting.

## SaaS / Agentic Product Pattern

When the user asks how to productize YouTube/video scraping in a SaaS, recommend a tiered pipeline:

1. Check the app cache first by `platform + videoId + language`.
2. Try `youtube-transcript-api` first for manual/auto captions with timestamps.
3. If captions fail or cloud/VPS IPs are challenged, retry the captions path through a residential rotating proxy (Webshare is a common GitHub pattern).
4. If captions are unavailable, fallback to audio extraction plus speech-to-text (`yt-dlp` + Groq/OpenAI/Deepgram/AssemblyAI/faster-whisper).
5. Run long videos asynchronously through a queue/workflow engine (Trigger.dev, Inngest, Convex scheduler/worker, etc.).
6. Cache transcripts, summaries, source URL, timestamps, source method, and derived artifacts in the app database/storage.
7. In VividFlow-style agentic CRM, attach outputs to `agentRun`, contact/company/project/document records or the Workspace Vault.

For Thomas, keep the explanation short unless he asks for implementation details: name the primary API/library, the proxy/caching caveat, and the fallback.

See `references/production-transcript-pipeline.md` for the GitHub-informed production pattern (`BasedEdge/ytscrape`, `samson-art/transcriptor-mcp`, `BCDel89/py-transcript-api`) and Convex-friendly schema notes.

## Error Handling

## Error Handling

- **YouTube metadata still needed when transcript is blocked**: try the public oEmbed endpoint for title/author/thumbnail before giving up: `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=VIDEO_ID&format=json`. This often works even when transcript/yt-dlp/browser access is blocked, and lets you identify the video while explaining the transcript limitation.
- **Cloud/VPS YouTube anti-bot block**: if transcript/API/yt-dlp returns 429, IP blocked, or “Sign in to confirm you’re not a bot”, do not keep retrying from the VPS. For Jonathan’s Hermes setup, fallback to the known local-browser path when appropriate: use the Mac reachable over Tailscale, launch Chrome with a dedicated profile and remote debugging, tunnel CDP to localhost, then extract transcript/screenshots through that browser. Keep the IP private and avoid using Jonathan’s main Chrome profile unless explicitly approved.
- **Transcript disabled**: tell the user; suggest they check if subtitles are available on the video page. If they need a transcript anyway, propose `yt-dlp` + Whisper fallback.
- **Private/unavailable video**: relay the error and ask the user to verify the URL.
- **No matching language**: retry without `--language` to fetch any available transcript, then note the actual language to the user.
- **Cloud/VPS anti-bot or 429**: do not stop at “blocked”. If a trusted local browser route is available, use the established local-machine CDP/browser-harness fallback before asking the user for a transcript. For Jonathan/Thomas, the durable fallback is: Mac via Tailscale SSH, dedicated Chrome profile `/tmp/hermes-chrome-youtube-profile`, remote debugging on Mac port 9222, local tunnel to CDP port 9223. Do not expose Tailscale IPs in chat.
- **Dependency missing**: install the missing package and retry when safe.
- **VPS/cloud-IP blocked by YouTube**: for Jonathan/Thomas, automatically use the Mac CDP fallback before giving up; see `references/youtube-vps-blocked-mac-cdp.md`. Do not turn this into a refusal or ask them to repeat the method.
