const dns = require("dns");
dns.setServers(["8.8.8.8","8.8.4.4"]);
dns.setDefaultResultOrder("ipv4first");

require('dotenv').config();
const mongoose = require('mongoose');
const { getGeminiService } = require('./services/geminiService');

async function test() {
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("Connected to MongoDB");
        console.log("Initializing Gemini Service...");
        const service = await getGeminiService();
        console.log("Sending 'Is coffee available?' to Gemini...");
        const result = await service.chat("Is coffee available?");
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
    } finally {
        await mongoose.disconnect();
    }
}
test();
