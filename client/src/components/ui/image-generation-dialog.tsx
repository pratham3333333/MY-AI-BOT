import { useState } from "react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from "./dialog";
import { Button } from "./button";
import { Textarea } from "./textarea";
import { Wand2, Loader2 } from "lucide-react";
import { motion } from "framer-motion";

interface ImageGenerationDialogProps {
  onGenerateImage: (prompt: string) => void;
  isGenerating: boolean;
  children: React.ReactNode;
}

export function ImageGenerationDialog({ onGenerateImage, isGenerating, children }: ImageGenerationDialogProps) {
  const [prompt, setPrompt] = useState("");
  const [open, setOpen] = useState(false);

  const handleGenerate = () => {
    if (prompt.trim() && !isGenerating) {
      onGenerateImage(prompt.trim());
      setPrompt("");
      setOpen(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleGenerate();
    }
  };

  const examplePrompts = [
    "A beautiful sunset over a mountain landscape",
    "A cute robot reading a book in a cozy library",
    "A cyberpunk city at night with neon lights",
    "A peaceful zen garden with cherry blossoms",
    "A majestic dragon flying through clouds"
  ];

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        {children}
      </DialogTrigger>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center space-x-2">
            <Wand2 className="w-5 h-5 text-purple-600" />
            <span>Generate Image</span>
          </DialogTitle>
          <DialogDescription>
            Describe the image you want to create, and AI will generate it for you.
          </DialogDescription>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Image Description
            </label>
            <Textarea
              value={prompt}
              onChange={(e) => setPrompt(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder="Describe the image you want to generate..."
              className="resize-none min-h-[80px]"
              maxLength={1000}
              disabled={isGenerating}
            />
            <div className="text-xs text-gray-400 dark:text-gray-500 mt-1 text-right">
              {prompt.length}/1000
            </div>
          </div>

          <div>
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300 block mb-2">
              Try these examples:
            </label>
            <div className="space-y-2">
              {examplePrompts.map((example, index) => (
                <motion.button
                  key={index}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setPrompt(example)}
                  className="text-left w-full p-2 text-xs bg-gray-50 dark:bg-gray-800 hover:bg-gray-100 dark:hover:bg-gray-700 rounded border text-gray-600 dark:text-gray-400 transition-colors"
                  disabled={isGenerating}
                >
                  {example}
                </motion.button>
              ))}
            </div>
          </div>

          <div className="flex justify-end space-x-2 pt-4">
            <Button
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={isGenerating}
            >
              Cancel
            </Button>
            <Button
              onClick={handleGenerate}
              disabled={!prompt.trim() || isGenerating}
              className="bg-purple-600 hover:bg-purple-700"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin mr-2" />
                  Generating...
                </>
              ) : (
                <>
                  <Wand2 className="w-4 h-4 mr-2" />
                  Generate
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}