import { GoogleGenAI, Modality } from "@google/genai";

// The "runtime" and "run" exports are used to declare the Netlify function.
//
// The "runtime" export configures the function, specifying things like the execution
// environment and schedule.
//
// The "run" export is the function’s entrypoint. It can be async.
export const runtime = "v2";

// The function’s entrypoint. It can be async.
export const run = async (request: Request) => {
    // Get the API key from the environment variables
    const apiKey = process.env.GEMINI_API_KEY;

    if (!apiKey) {
        return new Response(JSON.stringify({ error: "API key is missing" }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }

    try {
        const { base64ImageData, mimeType, prompt } = await request.json();

        if (!base64ImageData || !mimeType || !prompt) {
            return new Response(JSON.stringify({ error: "Missing image data, mime type, or prompt" }), {
                status: 400,
                headers: { "Content-Type": "application/json" },
            });
        }

        const ai = new GoogleGenAI({ apiKey });

        const response = await ai.models.generateContent({
            model: "gemini-1.5-flash",
            contents: [{
                parts: [
                    {
                        inlineData: {
                            data: base64ImageData,
                            mimeType: mimeType,
                        },
                    },
                    {
                        text: prompt,
                    },
                ],
            }],
        });
        
        for (const part of response.candidates?.[0]?.content?.parts || []) {
            if (part.inlineData) {
                return new Response(JSON.stringify({ base64Data: part.inlineData.data }), {
                    headers: { "Content-Type": "application/json" },
                });
            }
        }

        throw new Error("No image data found in the API response. The prompt may have been blocked.");

    } catch (error) {
        console.error("Error editing image with Gemini:", error);
        const errorMessage = error instanceof Error ? error.message : "An unknown error occurred.";
        return new Response(JSON.stringify({ error: `Failed to edit image: ${errorMessage}` }), {
            status: 500,
            headers: { "Content-Type": "application/json" },
        });
    }
};
