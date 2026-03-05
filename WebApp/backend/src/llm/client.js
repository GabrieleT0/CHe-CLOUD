const {ChatOpenAI} = require("@langchain/openai");
const  {ChatGoogleGenerativeAI} = require("@langchain/google-genai");

function getLLMClient() {
  const provider = process.env.LLM_PROVIDER;
  const temperature = 0.1

  switch (provider) {
    case "openai":
      return new ChatOpenAI({
        temperature:temperature,
        model: process.env.LLM_MODEL,
        openAIApiKey: process.env.OPENAI_API_KEY,
        timeout: 25000,
        maxRetries: 0,
      });

    case "gemini":
      return new ChatGoogleGenerativeAI({
        temperature: temperature,
        model: process.env.LLM_MODEL,
        apiKey: process.env.GEMINI_API_KEY,
        timeout: 25000,
        maxRetries: 0,
      });

    default:
      throw new Error(`Unsupported LLM provider: ${provider}`);
  }
}

module.exports = {getLLMClient}