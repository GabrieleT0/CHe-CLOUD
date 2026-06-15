const {ChatOpenAI} = require("@langchain/openai");
const  {ChatGoogleGenerativeAI} = require("@langchain/google-genai");

function requireEnv(name) {
  const value = process.env[name]?.trim();

  if (!value) {
    throw new Error(`Missing required environment variable: ${name}`);
  }

  return value;
}

function getLLMClient() {
  const provider = requireEnv("LLM_PROVIDER").toLowerCase();
  const model = requireEnv("LLM_MODEL");
  const temperature = 0.1

  switch (provider) {
    case "openai":
      return new ChatOpenAI({
        temperature:temperature,
        model,
        apiKey: requireEnv("OPENAI_API_KEY"),
        timeout: 25000,
        maxRetries: 0,
      });

    case "gemini":
      return new ChatGoogleGenerativeAI({
        temperature: temperature,
        model,
        apiKey: requireEnv("GEMINI_API_KEY"),
        timeout: 25000,
        maxRetries: 0,
      });

    case "lightning":
      return new ChatOpenAI({
        temperature: temperature,
        model,
        apiKey: requireEnv("LIGHTNING_API_KEY"),
        configuration: {
          baseURL: requireEnv("LIGHTNING_AI_BASE_URL"),
        },
        timeout: 25000,
        maxRetries: 0,
      });

    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

module.exports = {getLLMClient}
