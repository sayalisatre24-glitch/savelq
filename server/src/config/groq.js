/**
 * Groq AI Client Configuration
 * Connects to Groq API for deterministic-assisted financial guidance.
 */
const Groq = require('groq-sdk');

let groqClient = null;

const getGroqClient = () => {
  const apiKey = process.env.GROQ_API_KEY;
  if (!apiKey) return null;
  if (!groqClient) {
    groqClient = new Groq({ apiKey });
  }
  return groqClient;
};

module.exports = {
  getGroqClient,
  isGroqConfigured: () => !!process.env.GROQ_API_KEY
};
