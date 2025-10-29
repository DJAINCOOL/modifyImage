import React, { useState, useRef, useCallback } from 'react';
import { editImageWithGemini, fileToBase64 } from './services/geminiService';
import { UploadIcon, SparklesIcon, SpinnerIcon } from './components/icons';

// Interface for the image state
interface ImageState {
  data: string;
  mimeType: string;
}

// Sub-component for displaying an image or a placeholder/loader
const ImageDisplay: React.FC<{ title: string; imageUrl: string | null; isLoading: boolean; isOriginal?: boolean }> = ({ title, imageUrl, isLoading, isOriginal = false }) => (
  <div className="w-full lg:w-1/2 p-4 flex flex-col items-center justify-center bg-gray-800/50 rounded-2xl min-h-[300px] lg:min-h-[500px] border-2 border-dashed border-gray-700">
    <h2 className="text-xl font-semibold mb-4 text-gray-300">{title}</h2>
    <div className="relative w-full h-full flex items-center justify-center">
      {isLoading ? (
        <div className="flex flex-col items-center text-gray-400">
          <SpinnerIcon className="w-16 h-16 animate-spin text-purple-400" />
          <p className="mt-4 text-lg">Gemini is working its magic...</p>
        </div>
      ) : imageUrl ? (
        <img src={imageUrl} alt={title} className="max-w-full max-h-full object-contain rounded-lg shadow-lg" />
      ) : (
        !isOriginal && (
          <div className="text-center text-gray-500">
            <SparklesIcon className="w-16 h-16 mx-auto" />
            <p className="mt-2">Your edited image will appear here.</p>
          </div>
        )
      )}
    </div>
  </div>
);


const App: React.FC = () => {
  const [originalImage, setOriginalImage] = useState<ImageState | null>(null);
  const [editedImage, setEditedImage] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);

  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleImageUpload = useCallback(async (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      if (!file.type.startsWith('image/')) {
        setError('Please upload a valid image file (PNG, JPG, WEBP, etc.).');
        return;
      }
      setError(null);
      setEditedImage(null); // Clear previous edit on new upload
      try {
        const { base64Data, mimeType } = await fileToBase64(file);
        setOriginalImage({ data: base64Data, mimeType });
      } catch (err) {
        setError('Failed to process image file.');
        console.error(err);
      }
    }
  }, []);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!prompt || !originalImage) {
      setError('Please provide an image and a prompt.');
      return;
    }
    
    setError(null);
    setIsLoading(true);
    setEditedImage(null);

    try {
      const newImageBase64 = await editImageWithGemini(originalImage.data, originalImage.mimeType, prompt);
      setEditedImage(`data:image/png;base64,${newImageBase64}`);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An unknown error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleReset = () => {
    setOriginalImage(null);
    setEditedImage(null);
    setPrompt('');
    setError(null);
    setIsLoading(false);
    if (fileInputRef.current) {
        fileInputRef.current.value = '';
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 text-white flex flex-col">
      <header className="py-4 text-center">
        <h1 className="text-4xl font-bold tracking-tight bg-clip-text text-transparent bg-gradient-to-r from-purple-400 to-pink-500">
          Gemini Image Editor
        </h1>
        <p className="text-gray-400 mt-1">Edit images with the power of text prompts</p>
      </header>

      <main className="flex-grow flex flex-col p-4 md:p-8">
        {!originalImage ? (
          <div className="flex-grow flex flex-col items-center justify-center">
            <div className="w-full max-w-2xl text-center">
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleImageUpload}
                accept="image/*"
                className="hidden"
                id="image-upload"
              />
              <label 
                htmlFor="image-upload"
                className="cursor-pointer flex flex-col items-center justify-center p-10 border-4 border-dashed border-gray-700 rounded-2xl hover:border-purple-400 hover:bg-gray-800/50 transition-all duration-300"
              >
                <UploadIcon className="w-16 h-16 text-gray-500 mb-4" />
                <span className="text-2xl font-semibold">Upload an Image</span>
                <p className="text-gray-400 mt-2">Click or drag and drop a file to get started</p>
              </label>
              {error && <p className="text-red-400 mt-4">{error}</p>}
            </div>
          </div>
        ) : (
          <div className="flex flex-col flex-grow w-full">
            <div className="flex-grow flex flex-col lg:flex-row gap-8">
              <ImageDisplay title="Original Image" imageUrl={`data:${originalImage.mimeType};base64,${originalImage.data}`} isLoading={false} isOriginal={true} />
              <ImageDisplay title="Edited Image" imageUrl={editedImage} isLoading={isLoading} />
            </div>
            {error && <div className="mt-4 p-4 bg-red-900/50 border border-red-500 text-red-300 rounded-lg text-center">{error}</div>}
          </div>
        )}
      </main>

      {originalImage && (
        <footer className="sticky bottom-0 bg-gray-900/80 backdrop-blur-sm p-4 border-t border-gray-800">
          <form onSubmit={handleSubmit} className="max-w-4xl mx-auto flex flex-col sm:flex-row items-center gap-4">
            <input
              type="text"
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              placeholder="e.g., Add a retro filter"
              className="w-full flex-grow bg-gray-800 border-2 border-gray-700 rounded-lg px-4 py-3 text-white placeholder-gray-500 focus:ring-2 focus:ring-purple-500 focus:border-purple-500 outline-none transition-all"
              disabled={isLoading}
            />
            <div className="flex w-full sm:w-auto gap-2">
                <button
                type="submit"
                disabled={isLoading || !prompt}
                className="w-full sm:w-auto flex items-center justify-center gap-2 bg-purple-600 hover:bg-purple-700 disabled:bg-gray-600 disabled:cursor-not-allowed text-white font-bold py-3 px-6 rounded-lg transition-all duration-200"
                >
                {isLoading ? <SpinnerIcon className="w-5 h-5 animate-spin" /> : <SparklesIcon className="w-5 h-5" />}
                <span>Generate</span>
                </button>
                <button
                type="button"
                onClick={handleReset}
                disabled={isLoading}
                className="w-full sm:w-auto bg-gray-700 hover:bg-gray-600 text-gray-300 font-bold py-3 px-6 rounded-lg transition-all duration-200"
                >
                Reset
                </button>
            </div>
          </form>
        </footer>
      )}
    </div>
  );
};

export default App;