/**
 * Memories.ai API client for MCP server
 * Base URL: https://api.memories.ai
 * Vision URL: https://security.memories.ai
 */

const BASE_URL = "https://api.memories.ai";
const VISION_URL = "https://security.memories.ai";

export interface ApiResponse {
  code: string | number;
  msg?: string;
  data?: unknown;
  [key: string]: unknown;
}

export class MemoriesClient {
  private apiKey: string;
  private baseUrl: string;
  private visionUrl: string;

  constructor(apiKey: string) {
    this.apiKey = apiKey;
    this.baseUrl = BASE_URL;
    this.visionUrl = VISION_URL;
  }

  private async request(
    path: string,
    options: {
      method?: string;
      body?: Record<string, unknown>;
      query?: Record<string, string | number | undefined>;
      base?: string;
    } = {}
  ): Promise<ApiResponse> {
    const { method = "POST", body, query, base } = options;
    const url = new URL(path, base || this.baseUrl);

    if (query) {
      for (const [k, v] of Object.entries(query)) {
        if (v !== undefined && v !== null) {
          url.searchParams.set(k, String(v));
        }
      }
    }

    const headers: Record<string, string> = {
      Authorization: this.apiKey,
    };

    let fetchBody: string | undefined;
    if (body) {
      headers["Content-Type"] = "application/json";
      fetchBody = JSON.stringify(body);
    }

    const res = await fetch(url.toString(), {
      method,
      headers,
      body: fetchBody,
    });

    const data = (await res.json()) as ApiResponse;

    if (!res.ok || (data.code !== "0000" && data.code !== 0)) {
      const msg = data.msg || JSON.stringify(data);
      const code = data.code || res.status;
      throw new Error(`API Error [${code}]: ${msg}`);
    }

    return data;
  }

  // ─── Video Operations ────────────────────────────────────────────────

  async uploadVideoFromUrl(params: {
    url: string;
    uniqueId?: string;
    callback?: string;
    tags?: string;
  }): Promise<ApiResponse> {
    return this.request("/serve/api/v1/upload_url", {
      body: {
        url: params.url,
        ...(params.uniqueId && { unique_id: params.uniqueId }),
        ...(params.callback && { callback: params.callback }),
        ...(params.tags && { tags: params.tags }),
      },
    });
  }

  async listVideos(params: {
    uniqueId?: string;
    page?: number;
    size?: number;
    status?: string;
    videoNo?: string;
  } = {}): Promise<ApiResponse> {
    return this.request("/serve/api/v1/list_videos", {
      body: {
        page: params.page || 1,
        size: params.size || 20,
        ...(params.uniqueId && { unique_id: params.uniqueId }),
        ...(params.status && { status: params.status }),
        ...(params.videoNo && { video_no: params.videoNo }),
      },
    });
  }

  async getTaskStatus(taskId: string, uniqueId?: string): Promise<ApiResponse> {
    return this.request("/serve/api/v1/get_video_ids_by_task_id", {
      method: "GET",
      query: {
        task_id: taskId,
        ...(uniqueId && { unique_id: uniqueId }),
      },
    });
  }

  async deleteVideos(videoNos: string[], uniqueId?: string): Promise<ApiResponse> {
    return this.request("/serve/api/v1/delete_videos", {
      body: videoNos as unknown as Record<string, unknown>,
      query: uniqueId ? { unique_id: uniqueId } : undefined,
    });
  }

  async getVideoTranscription(videoNo: string, uniqueId?: string): Promise<ApiResponse> {
    return this.request("/serve/api/v1/get_video_transcription", {
      method: "GET",
      query: {
        video_no: videoNo,
        ...(uniqueId && { unique_id: uniqueId }),
      },
    });
  }

  async getAudioTranscription(videoNo: string, uniqueId?: string): Promise<ApiResponse> {
    return this.request("/serve/api/v1/get_audio_transcription", {
      method: "GET",
      query: {
        video_no: videoNo,
        ...(uniqueId && { unique_id: uniqueId }),
      },
    });
  }

  // ─── Search Operations ───────────────────────────────────────────────

  async searchPrivate(params: {
    query: string;
    uniqueId?: string;
    topK?: number;
    searchType?: string;
    tag?: string;
    videoNos?: string[];
  }): Promise<ApiResponse> {
    return this.request("/serve/api/v1/search", {
      body: {
        search_param: params.query,
        search_type: params.searchType || "BY_VIDEO",
        ...(params.uniqueId && { unique_id: params.uniqueId }),
        top_k: params.topK || 10,
        ...(params.tag && { tag: params.tag }),
        ...(params.videoNos && { video_nos: params.videoNos }),
      },
    });
  }

  async searchPublic(params: {
    query: string;
    platform?: string;
    topK?: number;
  }): Promise<ApiResponse> {
    return this.request("/serve/api/v1/search_public", {
      body: {
        search_param: params.query,
        search_type: "BY_VIDEO",
        type: params.platform || "YOUTUBE",
        top_k: params.topK || 10,
      },
    });
  }

  async searchAudio(params: {
    videoNo: string;
    query: string;
    uniqueId?: string;
  }): Promise<ApiResponse> {
    return this.request("/serve/api/v1/search_audio_transcripts", {
      method: "GET",
      query: {
        video_no: params.videoNo,
        query: params.query,
        ...(params.uniqueId && { unique_id: params.uniqueId }),
      },
    });
  }

  // ─── Chat Operations ─────────────────────────────────────────────────

  async chatVideo(params: {
    videoNos: string[];
    prompt: string;
    uniqueId?: string;
    sessionId?: number;
  }): Promise<ApiResponse> {
    const body: Record<string, unknown> = {
      video_nos: params.videoNos,
      prompt: params.prompt,
      unique_id: params.uniqueId || "default",
    };
    if (params.sessionId) body.session_id = params.sessionId;
    return this.request("/serve/api/v1/chat", { body });
  }

  async chatPersonal(params: {
    prompt: string;
    uniqueId?: string;
    sessionId?: number;
  }): Promise<ApiResponse> {
    const body: Record<string, unknown> = {
      prompt: params.prompt,
      unique_id: params.uniqueId || "default",
    };
    if (params.sessionId) body.session_id = params.sessionId;
    return this.request("/serve/api/v1/chat_personal", { body });
  }

  // ─── Memory Operations ───────────────────────────────────────────────

  async addMemory(params: {
    content: string;
    uniqueId?: string;
    tags?: string;
    role?: string;
  }): Promise<ApiResponse> {
    return this.request("/serve/api/v1/memories/add", {
      body: {
        unique_id: params.uniqueId || "default",
        memories: [{ role: params.role || "user", content: params.content }],
        memories_at: new Date().toISOString(),
        ...(params.tags && { tags: params.tags.split(",").map((t: string) => t.trim()) }),
      },
    });
  }

  async listMemories(params: {
    uniqueId?: string;
    page?: number;
    pageSize?: number;
  } = {}): Promise<ApiResponse> {
    return this.request("/serve/api/v1/memories", {
      body: {
        unique_id: params.uniqueId || "default",
        page: params.page || 1,
        page_size: params.pageSize || 20,
      },
    });
  }

  async searchMemories(params: {
    query: string;
    uniqueId?: string;
    page?: number;
    pageSize?: number;
  }): Promise<ApiResponse> {
    return this.request("/serve/api/v1/memories/search", {
      body: {
        unique_id: params.uniqueId || "default",
        query: params.query,
        page: params.page || 1,
        page_size: params.pageSize || 20,
      },
    });
  }

  // ─── Vision / Caption ────────────────────────────────────────────────

  async captionVideo(params: {
    videoUrl: string;
    userPrompt: string;
    systemPrompt?: string;
    thinking?: boolean;
  }): Promise<ApiResponse> {
    return this.request("/v1/understand/upload", {
      base: this.visionUrl,
      body: {
        video_url: params.videoUrl,
        user_prompt: params.userPrompt,
        system_prompt: params.systemPrompt || "You are a helpful video analyst.",
        thinking: params.thinking || false,
      },
    });
  }

  async captionImage(params: {
    imageUrl: string;
    userPrompt: string;
    systemPrompt?: string;
  }): Promise<ApiResponse> {
    return this.request("/v1/understand/uploadImg", {
      base: this.visionUrl,
      body: {
        image_url: params.imageUrl,
        user_prompt: params.userPrompt,
        system_prompt: params.systemPrompt || "You are a helpful image analyst.",
      },
    });
  }

  // ─── Social Media Scraping ───────────────────────────────────────────

  async scrapeByUrl(params: {
    url: string;
    uniqueId?: string;
    tags?: string;
  }): Promise<ApiResponse> {
    return this.request("/serve/api/v1/scraper_url", {
      body: {
        url: params.url,
        ...(params.uniqueId && { unique_id: params.uniqueId }),
        ...(params.tags && { tags: params.tags }),
      },
    });
  }

  async scrapeByHashtag(params: {
    hashtag: string;
    platform?: string;
    count?: number;
    uniqueId?: string;
  }): Promise<ApiResponse> {
    return this.request("/serve/api/v1/scraper_tag", {
      body: {
        tag: params.hashtag,
        type: params.platform || "TIKTOK",
        count: params.count || 10,
        ...(params.uniqueId && { unique_id: params.uniqueId }),
      },
    });
  }

  async scrapeByCreator(params: {
    creatorUrl: string;
    count?: number;
    uniqueId?: string;
  }): Promise<ApiResponse> {
    return this.request("/serve/api/v1/scraper", {
      body: {
        url: params.creatorUrl,
        count: params.count || 10,
        ...(params.uniqueId && { unique_id: params.uniqueId }),
      },
    });
  }
}
