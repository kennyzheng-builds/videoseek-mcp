# memories-mcp

MCP server for [Memories.ai](https://memories.ai) — give your AI agent persistent visual memory, semantic video search, and video understanding capabilities.

## What is this?

This is a [Model Context Protocol (MCP)](https://modelcontextprotocol.io/) server that connects AI agents (Claude, Cursor, Windsurf, etc.) to the Memories.ai platform. Instead of treating video as an afterthought, your agent gets:

- **Semantic video search** — find moments across your entire video library using natural language
- **Unlimited video context** — no context window cap; index once, query forever
- **Multi-video analysis** — ask questions that span across multiple videos
- **Persistent text memory** — store and retrieve knowledge with Memory Augmented Generation (MAG)
- **Social media import** — pull content from TikTok, YouTube, Instagram, and 15+ platforms
- **AI vision analysis** — analyze videos and images on-the-fly without uploading

## Quick Start

### 1. Get an API Key

Sign up at [memories.ai](https://memories.ai) and get your API key from [memories.ai/app/service/key](https://memories.ai/app/service/key).

### 2. Install

```bash
git clone https://github.com/memories-ai/memories-mcp.git
cd memories-mcp
npm install --include=dev
npm run build
```

Or install globally:

```bash
npm install -g memories-mcp
```

### 3. Configure Your Client

#### Claude Desktop

Add to `~/Library/Application Support/Claude/claude_desktop_config.json` (macOS) or `%APPDATA%\Claude\claude_desktop_config.json` (Windows):

```json
{
  "mcpServers": {
    "memories-ai": {
      "command": "node",
      "args": ["/path/to/memories-mcp/build/index.js"],
      "env": {
        "MEMORIES_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

#### Cursor

Add to `.cursor/mcp.json` in your project:

```json
{
  "mcpServers": {
    "memories-ai": {
      "command": "node",
      "args": ["/path/to/memories-mcp/build/index.js"],
      "env": {
        "MEMORIES_API_KEY": "your-api-key-here"
      }
    }
  }
}
```

#### Claude Code

```bash
claude mcp add memories-ai -- node /path/to/memories-mcp/build/index.js
```

Set the environment variable:

```bash
export MEMORIES_API_KEY="your-api-key-here"
```

## Tools (18 total)

### Video Management

| Tool | Description |
|------|-------------|
| `upload_video` | Upload and index a video from URL |
| `list_videos` | List all indexed videos with pagination |
| `get_video_status` | Check processing status by task ID |
| `delete_videos` | Delete videos by their numbers |
| `get_transcription` | Get video or audio transcription |

### Semantic Search

| Tool | Description |
|------|-------------|
| `search_videos` | Semantic search across your private video library |
| `search_public` | Search TikTok, YouTube, Instagram with natural language |
| `search_audio` | Search within a video's audio transcripts |

### Chat with Videos

| Tool | Description |
|------|-------------|
| `chat_with_video` | Ask questions about specific videos (multi-turn) |
| `chat_personal` | Ask questions across your entire library (MAG-powered) |

### Text Memory (MAG)

| Tool | Description |
|------|-------------|
| `add_memory` | Store text with semantic indexing |
| `search_memories` | Semantic search across stored memories |
| `list_memories` | List all stored memories |

### AI Vision

| Tool | Description |
|------|-------------|
| `caption_video` | Analyze a video from URL (no upload needed) |
| `caption_image` | Analyze an image from URL |

### Social Media Import

| Tool | Description |
|------|-------------|
| `import_from_url` | Import from any social media URL |
| `import_by_hashtag` | Import videos by hashtag from TikTok/YouTube/Instagram |
| `import_by_creator` | Import videos from a creator's profile |

## Resources

| URI | Description |
|-----|-------------|
| `memories://videos` | Your indexed video library |
| `memories://memories` | Your stored text memories |

## Prompt Templates

| Prompt | Description |
|--------|-------------|
| `analyze-video` | Full workflow: upload → process → analyze → summarize |
| `social-media-research` | Research a topic via social media video analysis |
| `build-knowledge-base` | Build searchable knowledge base from videos + memories |

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `MEMORIES_API_KEY` | Yes | Your Memories.ai API key |
| `MEMORIES_UNIQUE_ID` | No | Namespace for multi-tenant isolation (default: `"default"`) |

## Example Conversations

### "Search my video library"

> **You:** Find all moments in my videos where someone is cooking pasta
>
> **Agent** uses `search_videos` with query "cooking pasta" → returns timestamped segments

### "Analyze a YouTube video"

> **You:** What's happening in this video? https://youtube.com/watch?v=...
>
> **Agent** uses `caption_video` → returns detailed analysis without uploading

### "Research TikTok trends"

> **You:** Research the latest AI trends on TikTok
>
> **Agent** uses `search_public` on TIKTOK → `import_from_url` for top results → `chat_personal` for insights

### "Build a knowledge base"

> **You:** Create a knowledge base from my meeting recordings
>
> **Agent** uses `list_videos` → `get_transcription` for each → `add_memory` for key insights → `search_memories` to verify

## How It Compares

| Feature | memories-mcp | TwelveLabs MCP |
|---------|-------------|----------------|
| Persistent visual memory (LVMM) | Yes | No |
| Social media import (15+ platforms) | Yes | No |
| Text + Video fusion (MAG) | Yes | No |
| Free tier | 100 credits/month | 10 hours indexing |
| Multi-video Q&A | Yes | Yes |
| Semantic search | Yes | Yes |

## Architecture

```
memories-mcp/
├── src/
│   ├── index.ts     # MCP server — tools, resources, prompts
│   └── client.ts    # Memories.ai REST API client
├── build/           # Compiled JavaScript (generated)
├── package.json
└── tsconfig.json
```

**Key design decisions:**

- **TypeScript** with strict mode for type safety
- **Zod schemas** for input validation (MCP best practice)
- **stdio transport** for universal client compatibility
- **No external dependencies** beyond MCP SDK and Zod
- **Error messages** include actionable hints (credit issues, rate limits)

## Development

```bash
# Install dependencies (including devDependencies)
npm install --include=dev

# Build
npm run build

# Watch mode
npm run dev

# Test with MCP Inspector
npx @modelcontextprotocol/inspector node build/index.js
```

## Requirements

- Node.js >= 18
- A [Memories.ai](https://memories.ai) API key

## License

MIT

## Links

- [Memories.ai](https://memories.ai) — Platform
- [API Documentation](https://api-tools.memories.ai/api-reference/getting-started/overview) — REST API
- [MCP Protocol](https://modelcontextprotocol.io/) — Model Context Protocol
- [memories-cli](https://github.com/kennyzheng-builds/memories-cli) — CLI companion
