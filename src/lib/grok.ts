import { supabase } from "@/lib/supabase";
import { getKiaraBaseUrl } from "@/services/kiaraClient";

export interface GrokMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string | GrokMessageContent[];
  tool_calls?: GrokToolCall[];
  tool_call_id?: string;
}

export interface GrokMessageContent {
  type: "text" | "image_url";
  text?: string;
  image_url?: {
    url: string;
    detail?: "auto" | "low" | "high";
  };
}

export interface GrokToolCall {
  id: string;
  type: "function";
  function: {
    name: string;
    arguments: string;
  };
}

export interface GrokStreamChunk {
  choices: Array<{
    delta: {
      content?: string;
      role?: string;
      tool_calls?: GrokToolCall[];
    };
    finish_reason?: string | "tool_calls";
  }>;
}

export interface GrokTool {
  type: "function";
  function: {
    name: string;
    description: string;
    parameters: any;
  };
}

export type GrokToolChoice = "auto" | "none" | "required";

export interface GrokFile {
  id: string;
  filename: string;
}

export class GrokAPI {
  private baseUrl: string;
  private trainingFileIds: string[] = []; // IDs of uploaded training files

  constructor(_apiKey?: string, trainingFileIds?: string[]) {
    this.baseUrl = `${getKiaraBaseUrl()}/kiara-grok`;
    this.trainingFileIds = trainingFileIds || [];
  }

  /**
   * Set training file IDs (for 581 examples, etc.)
   */
  setTrainingFiles(fileIds: string[]) {
    this.trainingFileIds = fileIds;
  }

  /**
   * Helper: Create a message with text only
   */
  static textMessage(role: "system" | "user" | "assistant", text: string): GrokMessage {
    return { role, content: text };
  }

  /**
   * Helper: Create a message with text + images
   */
  static messageWithImages(
    role: "user" | "assistant",
    text: string,
    imageUrls: string[]
  ): GrokMessage {
    const content: GrokMessageContent[] = [
      { type: "text", text }
    ];

    imageUrls.forEach(url => {
      content.push({
        type: "image_url",
        image_url: { url, detail: "high" }
      });
    });

    return { role, content };
  }

  async *streamChat(
    messages: GrokMessage[],
    useVisionModel: boolean = false,
    tools?: GrokTool[],
    toolChoice: GrokToolChoice = "auto"
  ) {
    // Always use grok-4-fast (it has vision capabilities and is much faster)
    const model = "grok-4-fast";

    const requestBody: any = {
      model: model,
      messages: messages,
      stream: true,
      temperature: 0.7,
    };

    // Add tools if provided
    if (tools && tools.length > 0) {
      requestBody.tools = tools;
      requestBody.tool_choice = toolChoice;
    }

    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify(requestBody),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(`Grok API error: ${response.statusText} - ${errorText}`);
    }

    const reader = response.body?.getReader();
    const decoder = new TextDecoder();

    if (!reader) {
      throw new Error("No response body");
    }

    let buffer = "";
    let toolCallsBuffer: GrokToolCall[] = [];

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() || "";

      for (const line of lines) {
        if (line.startsWith("data: ")) {
          const data = line.slice(6);
          if (data === "[DONE]") {
            // If we have buffered tool calls, yield them
            if (toolCallsBuffer.length > 0) {
              yield { type: "tool_calls", tool_calls: toolCallsBuffer };
            }
            return;
          }

          try {
            const parsed = JSON.parse(data) as GrokStreamChunk;
            const delta = parsed.choices[0]?.delta;

            // Handle text content
            if (delta?.content) {
              yield { type: "content", content: delta.content };
            }

            // Handle tool calls
            if (delta?.tool_calls) {
              toolCallsBuffer.push(...delta.tool_calls);
            }

            // Check for finish reason
            if (parsed.choices[0]?.finish_reason === "tool_calls" && toolCallsBuffer.length > 0) {
              yield { type: "tool_calls", tool_calls: toolCallsBuffer };
              toolCallsBuffer = [];
            }
          } catch (e) {
            console.warn("Failed to parse chunk:", e);
          }
        }
      }
    }
  }

  async chat(messages: GrokMessage[]): Promise<string> {
    const { data: { session } } = await supabase.auth.getSession();
    if (!session?.access_token) {
      throw new Error("Not authenticated");
    }

    const response = await fetch(this.baseUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${session.access_token}`,
      },
      body: JSON.stringify({
        model: "grok-4-fast",
        messages: messages,
        temperature: 0.7,
      }),
    });

    if (!response.ok) {
      const error = await response.text();
      throw new Error(`Grok API error: ${response.statusText} - ${error}`);
    }

    const data = await response.json();
    return data.choices[0]?.message?.content || "";
  }
}
