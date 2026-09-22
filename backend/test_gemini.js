require('dotenv').config();
const { getGeminiService } = require('./services/geminiService');

async function test() {
    try {
        console.log("Initializing Gemini Service...");
        const service = await getGeminiService();
        console.log("Sending 'hi' to Gemini...");
        const result = await service.chat("hi");
        if (result.isStream) {
            console.log("Success! Received a stream.");
            for await (const chunk of result.stream) {
                process.stdout.write(chunk.text());
            }
        } else {
            console.log("Result:", result);
        }
    } catch (err) {
        console.error("Test Script Error:", err);
    }
}
test();
