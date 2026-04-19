// AI model constants — NOT a server action file
// Imported by both client and server code

export const OPENROUTER_MODELS = [
  { id: 'meta-llama/llama-3.3-70b-instruct:free',  label: 'Llama 3.3 70B'        },
  { id: 'meta-llama/llama-4-scout:free',            label: 'Llama 4 Scout'         },
  { id: 'qwen/qwen3-32b:free',                      label: 'Qwen3 32B'             },
  { id: 'qwen/qwen3.6-plus:free',                   label: 'Qwen 3.6 Plus'         },
  { id: 'google/gemma-3-27b-it:free',               label: 'Gemma 3 27B'           },
  { id: 'google/gemini-2.5-flash:free',             label: 'Gemini 2.5 Flash'      },
  { id: 'google/gemini-3.1-flash-lite:free',        label: 'Gemini 3.1 Flash Lite' },
  { id: 'mistralai/mistral-7b-instruct:free',       label: 'Mistral 7B'            },
] as const;

export type OpenRouterModelId = typeof OPENROUTER_MODELS[number]['id'];
export const DEFAULT_MODEL: OpenRouterModelId = 'meta-llama/llama-3.3-70b-instruct:free';
