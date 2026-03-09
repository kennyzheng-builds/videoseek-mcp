#!/usr/bin/env node

/**
 * Memories.ai MCP Server
 *
 * Exposes Memories.ai's video understanding, persistent visual memory,
 * and semantic search capabilities to any MCP-compatible AI agent.
 *
 * Transport: stdio (for Claude Desktop, Cursor, Windsurf, etc.)
 *
 * Required env: MEMORIES_API_KEY
 * Optional env: MEMORIES_UNIQUE_ID (namespace, defaults to "default")
 */

import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { StdioServerTransport } from "@modelcontextprotocol/sdk/server/stdio.js";
import { z } from "zod";
import { MemoriesClient } from "./client.js";

// ─── Configuration ──────────────────────────────────────────────────────────

const API_KEY = process.env.MEMORIES_API_KEY;
if (!API_KEY) {
  console.error(
    "Error: MEMORIES_API_KEY environment variable is required.\n" +
    "Get your API key at: https://memories.ai/app/service/key"
  );
  process.exit(1);
}

const DEFAULT_UNIQUE_ID = process.env.MEMORIES_UNIQUE_ID || "default";
const client = new MemoriesClient(API_KEY);

// ─── Server Instance ────────────────────────────────────────────────────────

const server = new McpServer({
  name: "memories-ai",
  version: "1.0.0",
});

// ─── Helper ─────────────────────────────────────────────────────────────────

function textResult(text: string) {
  return { content: [{ type: "text" as const, text }] };
}

function jsonResult(data: unknown) {
  return textResult(JSON.stringify(data, null, 2));
}

function errorResult(error: unknown) {
  const msg = error instanceof Error ? error.message : String(error);
  return { content: [{ type: "text" as const, text: `Error: ${msg}` }], isError: true };
}

// ═══════════════════════════════════════════════════════════════════════════
// TOOLS — Video Management
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  "upload_video",
  {
    title: "Upload Video",
    description:
      "Upload and index a video from a URL into the Memories.ai library. " +
      "Returns a videoNo for tracking. The video will be processed asynchronously — " +
      "use get_video_status to check when it's ready.",
    inputSchema: {
      url: z.string().url().describe("Public URL of the video to upload"),
      unique_id: z.string().optional().describe("Namespace for multi-tenant isolation (default: 'default')"),
      callback: z.string().url().optional().describe("Webhook URL to notify when processing completes"),
      tags: z.string().optional().describe("Comma-separated tags for categorization"),
    },
  },
  async ({ url, unique_id, callback, tags }) => {
    try {
      const result = await client.uploadVideoFromUrl({
        url,
        uniqueId: unique_id || DEFAULT_UNIQUE_ID,
        callback,
        tags,
      });
      return jsonResult(result);
    } catch (e) {
      return errorResult(e);
    }
  }
);

server.registerTool(
  "list_videos",
  {
    title: "List Videos",
    description:
      "List all indexed videos in your Memories.ai library. " +
      "Supports pagination and filtering by status.",
    inputSchema: {
      unique_id: z.string().optional().describe("Namespace (default: 'default')"),
      page: z.number().int().positive().optional().describe("Page number (default: 1)"),
      size: z.number().int().min(1).max(100).optional().describe("Results per page (default: 20, max: 100)"),
      status: z.enum(["PARSE", "UNPARSE", "FAIL"]).optional().describe("Filter by processing status"),
    },
  },
  async ({ unique_id, page, size, status }) => {
    try {
      const result = await client.listVideos({
        uniqueId: unique_id || DEFAULT_UNIQUE_ID,
        page,
        size,
        status,
      });
      return jsonResult(result);
    } catch (e) {
      return errorResult(e);
    }
  }
);

server.registerTool(
  "get_video_status",
  {
    title: "Get Video Status",
    description:
      "Check the processing status of a video by its task ID. " +
      "Returns video numbers and their current status (PARSE=ready, UNPARSE=processing, FAIL=failed).",
    inputSchema: {
      task_id: z.string().describe("Task ID returned from upload_video"),
      unique_id: z.string().optional().describe("Namespace (default: 'default')"),
    },
  },
  async ({ task_id, unique_id }) => {
    try {
      const result = await client.getTaskStatus(task_id, unique_id || DEFAULT_UNIQUE_ID);
      return jsonResult(result);
    } catch (e) {
      return errorResult(e);
    }
  }
);

server.registerTool(
  "delete_videos",
  {
    title: "Delete Videos",
    description: "Delete one or more videos from the Memories.ai library by their video numbers.",
    inputSchema: {
      video_nos: z.array(z.string()).min(1).describe("Array of video numbers to delete (e.g. ['VI123456'])"),
      unique_id: z.string().optional().describe("Namespace (default: 'default')"),
    },
  },
  async ({ video_nos, unique_id }) => {
    try {
      const result = await client.deleteVideos(video_nos, unique_id || DEFAULT_UNIQUE_ID);
      return jsonResult(result);
    } catch (e) {
      return errorResult(e);
    }
  }
);

server.registerTool(
  "get_transcription",
  {
    title: "Get Transcription",
    description:
      "Retrieve the transcription of a video. Supports both video transcription " +
      "(visual scene descriptions) and audio transcription (spoken words).",
    inputSchema: {
      video_no: z.string().describe("Video number (e.g. 'VI685903399832780800')"),
      type: z.enum(["video", "audio"]).optional().describe("Transcription type: 'video' for visual, 'audio' for spoken words (default: 'video')"),
      unique_id: z.string().optional().describe("Namespace (default: 'default')"),
    },
  },
  async ({ video_no, type, unique_id }) => {
    try {
      const result =
        type === "audio"
          ? await client.getAudioTranscription(video_no, unique_id || DEFAULT_UNIQUE_ID)
          : await client.getVideoTranscription(video_no, unique_id || DEFAULT_UNIQUE_ID);
      return jsonResult(result);
    } catch (e) {
      return errorResult(e);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// TOOLS — Semantic Search
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  "search_videos",
  {
    title: "Search Videos",
    description:
      "Semantic search across your private video library using natural language. " +
      "Find specific moments, scenes, objects, or actions across all your indexed videos. " +
      "Returns matching video segments with timestamps.",
    inputSchema: {
      query: z.string().describe("Natural language search query (e.g. 'person walking in the rain')"),
      unique_id: z.string().optional().describe("Namespace (default: 'default')"),
      top_k: z.number().int().min(1).max(50).optional().describe("Number of results to return (default: 10)"),
      tag: z.string().optional().describe("Filter results by tag"),
      video_nos: z.array(z.string()).optional().describe("Limit search to specific video numbers"),
    },
  },
  async ({ query, unique_id, top_k, tag, video_nos }) => {
    try {
      const result = await client.searchPrivate({
        query,
        uniqueId: unique_id || DEFAULT_UNIQUE_ID,
        topK: top_k,
        tag,
        videoNos: video_nos,
      });
      return jsonResult(result);
    } catch (e) {
      return errorResult(e);
    }
  }
);

server.registerTool(
  "search_public",
  {
    title: "Search Public Platforms",
    description:
      "Search for videos on public platforms (TikTok, YouTube, Instagram) " +
      "using semantic natural language queries. Great for content research and discovery.",
    inputSchema: {
      query: z.string().describe("Natural language search query"),
      platform: z
        .enum(["TIKTOK", "YOUTUBE", "INSTAGRAM"])
        .optional()
        .describe("Platform to search (default: YOUTUBE)"),
      top_k: z.number().int().min(1).max(50).optional().describe("Number of results (default: 10)"),
    },
  },
  async ({ query, platform, top_k }) => {
    try {
      const result = await client.searchPublic({
        query,
        platform,
        topK: top_k,
      });
      return jsonResult(result);
    } catch (e) {
      return errorResult(e);
    }
  }
);

server.registerTool(
  "search_audio",
  {
    title: "Search Audio Transcripts",
    description:
      "Search within a specific video's audio transcripts. " +
      "Useful for finding when specific topics were discussed in a video.",
    inputSchema: {
      video_no: z.string().describe("Video number to search within"),
      query: z.string().describe("Search query for audio content"),
      unique_id: z.string().optional().describe("Namespace (default: 'default')"),
    },
  },
  async ({ video_no, query, unique_id }) => {
    try {
      const result = await client.searchAudio({
        videoNo: video_no,
        query,
        uniqueId: unique_id || DEFAULT_UNIQUE_ID,
      });
      return jsonResult(result);
    } catch (e) {
      return errorResult(e);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// TOOLS — Chat with Videos
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  "chat_with_video",
  {
    title: "Chat with Video",
    description:
      "Ask questions about specific videos using natural language. " +
      "The AI analyzes the video content and provides detailed answers. " +
      "Supports multi-turn conversations via session_id.",
    inputSchema: {
      video_nos: z
        .array(z.string())
        .min(1)
        .describe("Video numbers to chat about (e.g. ['VI123456'])"),
      prompt: z.string().describe("Your question about the video(s)"),
      unique_id: z.string().optional().describe("Namespace (default: 'default')"),
      session_id: z.number().int().optional().describe("Session ID for multi-turn conversation continuity"),
    },
  },
  async ({ video_nos, prompt, unique_id, session_id }) => {
    try {
      const result = await client.chatVideo({
        videoNos: video_nos,
        prompt,
        uniqueId: unique_id || DEFAULT_UNIQUE_ID,
        sessionId: session_id,
      });
      return jsonResult(result);
    } catch (e) {
      return errorResult(e);
    }
  }
);

server.registerTool(
  "chat_personal",
  {
    title: "Chat with Personal Library",
    description:
      "Ask questions across your entire video and memory library. " +
      "This is the most powerful query tool — it combines video understanding " +
      "with text memories (MAG: Memory Augmented Generation) to provide " +
      "comprehensive answers. Recommended for general questions about your content.",
    inputSchema: {
      prompt: z.string().describe("Your question (e.g. 'What topics are covered in my videos?')"),
      unique_id: z.string().optional().describe("Namespace (default: 'default')"),
      session_id: z.number().int().optional().describe("Session ID for multi-turn conversation"),
    },
  },
  async ({ prompt, unique_id, session_id }) => {
    try {
      const result = await client.chatPersonal({
        prompt,
        uniqueId: unique_id || DEFAULT_UNIQUE_ID,
        sessionId: session_id,
      });
      return jsonResult(result);
    } catch (e) {
      return errorResult(e);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// TOOLS — Text Memory (MAG)
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  "add_memory",
  {
    title: "Add Memory",
    description:
      "Store a text memory with semantic indexing. Memories are searchable " +
      "and integrated into personal chat responses via Memory Augmented Generation (MAG). " +
      "Use this to store notes, meeting summaries, insights, or any text knowledge.",
    inputSchema: {
      content: z.string().describe("Text content to store as a memory"),
      unique_id: z.string().optional().describe("Namespace (default: 'default')"),
      tags: z.string().optional().describe("Comma-separated tags for categorization"),
    },
  },
  async ({ content, unique_id, tags }) => {
    try {
      const result = await client.addMemory({
        content,
        uniqueId: unique_id || DEFAULT_UNIQUE_ID,
        tags,
      });
      return jsonResult(result);
    } catch (e) {
      return errorResult(e);
    }
  }
);

server.registerTool(
  "search_memories",
  {
    title: "Search Memories",
    description:
      "Semantic search across your stored text memories. " +
      "Returns the most relevant memories ranked by similarity to your query.",
    inputSchema: {
      query: z.string().describe("Natural language search query"),
      unique_id: z.string().optional().describe("Namespace (default: 'default')"),
      page: z.number().int().positive().optional().describe("Page number (default: 1)"),
      page_size: z.number().int().min(1).max(100).optional().describe("Results per page (default: 20)"),
    },
  },
  async ({ query, unique_id, page, page_size }) => {
    try {
      const result = await client.searchMemories({
        query,
        uniqueId: unique_id || DEFAULT_UNIQUE_ID,
        page,
        pageSize: page_size,
      });
      return jsonResult(result);
    } catch (e) {
      return errorResult(e);
    }
  }
);

server.registerTool(
  "list_memories",
  {
    title: "List Memories",
    description: "List all stored text memories in the current namespace.",
    inputSchema: {
      unique_id: z.string().optional().describe("Namespace (default: 'default')"),
      page: z.number().int().positive().optional().describe("Page number (default: 1)"),
      page_size: z.number().int().min(1).max(100).optional().describe("Results per page (default: 20)"),
    },
  },
  async ({ unique_id, page, page_size }) => {
    try {
      const result = await client.listMemories({
        uniqueId: unique_id || DEFAULT_UNIQUE_ID,
        page,
        pageSize: page_size,
      });
      return jsonResult(result);
    } catch (e) {
      return errorResult(e);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// TOOLS — AI Vision / Captioning
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  "caption_video",
  {
    title: "Analyze Video (Caption)",
    description:
      "Analyze a video from URL without uploading to your library. " +
      "Uses the Large Visual Memory Model (LVMM) to understand and describe video content. " +
      "Supports optional reasoning mode for complex analysis tasks.",
    inputSchema: {
      video_url: z.string().url().describe("Public URL of the video to analyze"),
      prompt: z.string().describe("Analysis prompt (e.g. 'What emotions are shown in this video?')"),
      system_prompt: z.string().optional().describe("System prompt for the analyst (default: 'You are a helpful video analyst.')"),
      thinking: z.boolean().optional().describe("Enable reasoning/thinking mode for deeper analysis (default: false)"),
    },
  },
  async ({ video_url, prompt, system_prompt, thinking }) => {
    try {
      const result = await client.captionVideo({
        videoUrl: video_url,
        userPrompt: prompt,
        systemPrompt: system_prompt,
        thinking,
      });
      return jsonResult(result);
    } catch (e) {
      return errorResult(e);
    }
  }
);

server.registerTool(
  "caption_image",
  {
    title: "Analyze Image (Caption)",
    description:
      "Analyze an image from URL using AI vision. " +
      "Describe scenes, identify objects, read text, and answer questions about the image.",
    inputSchema: {
      image_url: z.string().url().describe("Public URL of the image to analyze"),
      prompt: z.string().describe("Analysis prompt (e.g. 'Describe the scene in detail')"),
      system_prompt: z.string().optional().describe("System prompt for the analyst"),
    },
  },
  async ({ image_url, prompt, system_prompt }) => {
    try {
      const result = await client.captionImage({
        imageUrl: image_url,
        userPrompt: prompt,
        systemPrompt: system_prompt,
      });
      return jsonResult(result);
    } catch (e) {
      return errorResult(e);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// TOOLS — Social Media Import
// ═══════════════════════════════════════════════════════════════════════════

server.registerTool(
  "import_from_url",
  {
    title: "Import from URL",
    description:
      "Import a video from a social media URL (TikTok, YouTube, Instagram, Twitter, etc.) " +
      "directly into your Memories.ai library for indexing and analysis.",
    inputSchema: {
      url: z.string().url().describe("Social media video URL"),
      unique_id: z.string().optional().describe("Namespace (default: 'default')"),
      tags: z.string().optional().describe("Comma-separated tags"),
    },
  },
  async ({ url, unique_id, tags }) => {
    try {
      const result = await client.scrapeByUrl({
        url,
        uniqueId: unique_id || DEFAULT_UNIQUE_ID,
        tags,
      });
      return jsonResult(result);
    } catch (e) {
      return errorResult(e);
    }
  }
);

server.registerTool(
  "import_by_hashtag",
  {
    title: "Import by Hashtag",
    description:
      "Import videos from a social media platform by hashtag. " +
      "Automatically imports and indexes matching videos into your library.",
    inputSchema: {
      hashtag: z.string().describe("Hashtag to search for (without #)"),
      platform: z
        .enum(["TIKTOK", "YOUTUBE", "INSTAGRAM"])
        .optional()
        .describe("Platform to import from (default: TIKTOK)"),
      count: z.number().int().min(1).max(50).optional().describe("Number of videos to import (default: 10)"),
      unique_id: z.string().optional().describe("Namespace (default: 'default')"),
    },
  },
  async ({ hashtag, platform, count, unique_id }) => {
    try {
      const result = await client.scrapeByHashtag({
        hashtag,
        platform,
        count,
        uniqueId: unique_id || DEFAULT_UNIQUE_ID,
      });
      return jsonResult(result);
    } catch (e) {
      return errorResult(e);
    }
  }
);

server.registerTool(
  "import_by_creator",
  {
    title: "Import by Creator",
    description:
      "Import videos from a social media creator's profile URL. " +
      "Indexes their recent videos into your library for analysis.",
    inputSchema: {
      creator_url: z.string().url().describe("Creator's profile URL (e.g. 'https://www.tiktok.com/@creator')"),
      count: z.number().int().min(1).max(50).optional().describe("Number of videos to import (default: 10)"),
      unique_id: z.string().optional().describe("Namespace (default: 'default')"),
    },
  },
  async ({ creator_url, count, unique_id }) => {
    try {
      const result = await client.scrapeByCreator({
        creatorUrl: creator_url,
        count,
        uniqueId: unique_id || DEFAULT_UNIQUE_ID,
      });
      return jsonResult(result);
    } catch (e) {
      return errorResult(e);
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// RESOURCES
// ═══════════════════════════════════════════════════════════════════════════

server.registerResource(
  "video-library",
  "memories://videos",
  {
    description: "List of all indexed videos in the current Memories.ai namespace",
    mimeType: "application/json",
  },
  async () => {
    try {
      const result = await client.listVideos({ uniqueId: DEFAULT_UNIQUE_ID, size: 100 });
      return {
        contents: [
          {
            uri: "memories://videos",
            mimeType: "application/json",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (e) {
      return {
        contents: [
          {
            uri: "memories://videos",
            mimeType: "application/json",
            text: JSON.stringify({ error: String(e) }),
          },
        ],
      };
    }
  }
);

server.registerResource(
  "memory-store",
  "memories://memories",
  {
    description: "List of all stored text memories in the current namespace",
    mimeType: "application/json",
  },
  async () => {
    try {
      const result = await client.listMemories({ uniqueId: DEFAULT_UNIQUE_ID, pageSize: 100 });
      return {
        contents: [
          {
            uri: "memories://memories",
            mimeType: "application/json",
            text: JSON.stringify(result, null, 2),
          },
        ],
      };
    } catch (e) {
      return {
        contents: [
          {
            uri: "memories://memories",
            mimeType: "application/json",
            text: JSON.stringify({ error: String(e) }),
          },
        ],
      };
    }
  }
);

// ═══════════════════════════════════════════════════════════════════════════
// PROMPTS
// ═══════════════════════════════════════════════════════════════════════════

server.registerPrompt(
  "analyze-video",
  {
    title: "Analyze Video Workflow",
    description:
      "Complete workflow to upload, wait for processing, and analyze a video. " +
      "Guides the agent through the full pipeline.",
    argsSchema: {
      video_url: z.string().url().describe("URL of the video to analyze"),
      question: z.string().describe("What you want to know about the video"),
    },
  },
  ({ video_url, question }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            `Please analyze this video and answer my question.`,
            ``,
            `Video URL: ${video_url}`,
            `Question: ${question}`,
            ``,
            `Follow these steps:`,
            `1. First, use caption_video to get an immediate analysis of the video`,
            `2. Then, use upload_video to upload it for deeper indexing`,
            `3. Use get_video_status to check when processing completes`,
            `4. Once ready, use chat_with_video with the video number for detailed Q&A`,
            `5. Summarize your findings`,
          ].join("\n"),
        },
      },
    ],
  })
);

server.registerPrompt(
  "social-media-research",
  {
    title: "Social Media Research",
    description:
      "Research a topic by importing and analyzing social media videos. " +
      "Searches public platforms, imports content, and generates insights.",
    argsSchema: {
      topic: z.string().describe("Topic to research"),
      platform: z.enum(["TIKTOK", "YOUTUBE", "INSTAGRAM"]).describe("Platform to search"),
    },
  },
  ({ topic, platform }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            `Research the topic "${topic}" on ${platform}.`,
            ``,
            `Follow these steps:`,
            `1. Use search_public to find relevant videos on ${platform}`,
            `2. Import the most relevant results using import_from_url`,
            `3. Wait for indexing and use chat_personal to ask questions about the content`,
            `4. Store key insights using add_memory`,
            `5. Provide a comprehensive summary of findings`,
          ].join("\n"),
        },
      },
    ],
  })
);

server.registerPrompt(
  "build-knowledge-base",
  {
    title: "Build Knowledge Base",
    description:
      "Build a searchable knowledge base from videos and text memories. " +
      "Upload videos, extract insights, and store them as searchable memories.",
    argsSchema: {
      topic: z.string().describe("Topic or domain for the knowledge base"),
    },
  },
  ({ topic }) => ({
    messages: [
      {
        role: "user",
        content: {
          type: "text",
          text: [
            `Help me build a knowledge base about "${topic}".`,
            ``,
            `I want to:`,
            `1. Search my existing video library for relevant content using search_videos`,
            `2. Get transcriptions of key videos using get_transcription`,
            `3. Extract key insights and store them as memories using add_memory`,
            `4. Verify the knowledge base by searching memories with search_memories`,
            `5. Use chat_personal to test that questions about ${topic} get good answers`,
          ].join("\n"),
        },
      },
    ],
  })
);

// ═══════════════════════════════════════════════════════════════════════════
// START SERVER
// ═══════════════════════════════════════════════════════════════════════════

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error("Memories.ai MCP Server running on stdio");
  console.error(`Namespace: ${DEFAULT_UNIQUE_ID}`);
}

main().catch((error) => {
  console.error("Fatal error in main():", error);
  process.exit(1);
});
