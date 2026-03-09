# videoseek-mcp

**Find anything in any video.** Semantic video search, video Q&A, persistent memory, and social media import — all as MCP tools for your AI agent.

## What can it do?

Give your AI agent (Claude, Cursor, Windsurf, etc.) the ability to:

- **Search videos by meaning** — "find the moment where someone opens the gift" across your entire library
- **Ask questions about videos** — multi-turn conversations with one video or your whole collection
- **Remember everything** — persistent text + video memory that never forgets (Memory Augmented Generation)
- **Import from social media** — pull and index content from TikTok, YouTube, Instagram, and 15+ platforms
- **Analyze on-the-fly** — describe any video or image from URL without uploading
- **Transcribe** — get visual scene descriptions or spoken word transcripts

## Quick Start

### 1. Get an API Key

Sign up at [memories.ai](https://memories.ai) and grab your key from the [API keys page](https://memories.ai/app/service/key). Free tier includes 100 credits/month.

### 2. Install

```bash
git clone https://github.com/kennyzheng-builds/videoseek-mcp.git
cd videoseek-mcp
npm install --include=dev
npm run build
```

### 3. Connect to your AI client

#### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "videoseek": {
      "command": "node",
      "args": ["/path/to/videoseek-mcp/build/index.js"],
      "env": {
        "MEMORIES_API_KEY": "your-api-key"
      }
    }
  }
}
```

#### Cursor

Add to `.cursor/mcp.json`:

```json
{
  "mcpServers": {
    "videoseek": {
      "command": "node",
      "args": ["/path/to/videoseek-mcp/build/index.js"],
      "env": {
        "MEMORIES_API_KEY": "your-api-key"
      }
    }
  }
}
```

#### Claude Code

```bash
export MEMORIES_API_KEY="your-api-key"
claude mcp add videoseek -- node /path/to/videoseek-mcp/build/index.js
```

## Tools (18)

### Video Management

| Tool | What it does |
|------|-------------|
| `upload_video` | Upload and index a video from URL |
| `list_videos` | List all indexed videos |
| `get_video_status` | Check processing status |
| `delete_videos` | Remove videos from your library |
| `get_transcription` | Get visual or audio transcription |

### Search

| Tool | What it does |
|------|-------------|
| `search_videos` | Semantic search across your private video library |
| `search_public` | Search TikTok, YouTube, Instagram by meaning |
| `search_audio` | Find when something was said in a video |

### Video Q&A

| Tool | What it does |
|------|-------------|
| `chat_with_video` | Ask questions about specific videos (multi-turn) |
| `chat_personal` | Ask questions across your entire library + memories |

### Persistent Memory

| Tool | What it does |
|------|-------------|
| `add_memory` | Store text with semantic indexing |
| `search_memories` | Find relevant memories by meaning |
| `list_memories` | List all stored memories |

### Vision Analysis

| Tool | What it does |
|------|-------------|
| `caption_video` | Analyze a video from URL (no upload needed) |
| `caption_image` | Analyze an image from URL |

### Social Media Import

| Tool | What it does |
|------|-------------|
| `import_from_url` | Import from any social media URL |
| `import_by_hashtag` | Import by hashtag from TikTok/YouTube/Instagram |
| `import_by_creator` | Import from a creator's profile |

## Resources & Prompts

**Resources:** `memories://videos` (your library), `memories://memories` (your stored knowledge)

**Prompt templates:** `analyze-video`, `social-media-research`, `build-knowledge-base`

## Example Conversations

**"Find a moment"**
> You: Find all moments where someone is cooking pasta
>
> Agent uses `search_videos` → returns timestamped video segments

**"Understand a video"**
> You: What's happening in this video? [URL]
>
> Agent uses `caption_video` → instant analysis without uploading

**"Research TikTok"**
> You: Research AI trends on TikTok
>
> Agent uses `search_public` → `import_from_url` → `chat_personal` for insights

**"Build knowledge"**
> You: Summarize all my meeting recordings
>
> Agent uses `list_videos` → `get_transcription` → `add_memory` for key takeaways

## How It Compares

| Feature | videoseek-mcp | TwelveLabs MCP |
|---------|--------------|----------------|
| Persistent memory (text + video) | Yes | No |
| Social media import (15+ platforms) | Yes | No |
| Memory Augmented Generation | Yes | No |
| Free tier | 100 credits/month | 10 hours |
| Multi-video Q&A | Yes | Yes |
| Semantic search | Yes | Yes |

## Environment Variables

| Variable | Required | Default | Description |
|----------|----------|---------|-------------|
| `MEMORIES_API_KEY` | Yes | — | API key from [memories.ai](https://memories.ai/app/service/key) |
| `MEMORIES_UNIQUE_ID` | No | `"default"` | Namespace for multi-tenant isolation |

## Development

```bash
npm install --include=dev
npm run build          # compile TypeScript
npm run dev            # watch mode
npx @modelcontextprotocol/inspector node build/index.js   # test interactively
```

## Architecture

```
videoseek-mcp/
├── src/
│   ├── index.ts     # MCP server — 18 tools, 2 resources, 3 prompts
│   └── client.ts    # Video understanding API client
├── build/           # Compiled JS (generated)
├── package.json
└── tsconfig.json
```

TypeScript + Zod schemas + stdio transport. No dependencies beyond MCP SDK.

## License

MIT
