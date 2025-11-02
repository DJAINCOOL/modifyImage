export const fileToBase64 = (file: File): Promise<{ base64Data: string; mimeType: string }> => {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = () => {
      const result = reader.result as string;
      const base64Data = result.split(',')[1];
      resolve({ base64Data, mimeType: file.type });
    };
    reader.onerror = (error) => reject(error);
  });
};

export const editImageWithGemini = async (
  base64ImageData: string,
  mimeType: string,
  prompt: string
): Promise<string> => {
  try {
    const response = await fetch('/.netlify/functions/editImage', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify({
        base64ImageData,
        mimeType,
        prompt,
      }),
    });

    if (!response.ok) {
        const errorText = await response.text();
        let errorMessage = `Request failed with status ${response.status}`;
        try {
            const errorData = JSON.parse(errorText);
            if(errorData.error) {
                errorMessage = errorData.error;
            }
        } catch (e) {
            // The error response was not JSON, use the raw text if available
            if(errorText) {
                errorMessage = errorText;
            }
        }
        throw new Error(errorMessage);
    }

    const result = await response.json();
    const base64Data = result.base64Data;

    if (!base64Data) {
        throw new Error("No image data found in the API response.");
    }

    return base64Data;

  } catch (error) {
    console.error("Error editing image:", error);
    if (error instanceof Error) {
        // Re-throwing the error to be caught by the UI component
        throw error;
    }
    throw new Error("An unknown error occurred while editing the image.");
  }
};
