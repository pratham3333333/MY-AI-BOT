import { useState, useRef } from "react";
import { Button } from "./button";
import { Upload, X, Image as ImageIcon } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

interface ImageUploadProps {
  onImageSelect: (file: File) => void;
  onImageRemove: () => void;
  selectedImage: File | null;
  disabled?: boolean;
}

export function ImageUpload({ onImageSelect, onImageRemove, selectedImage, disabled }: ImageUploadProps) {
  const [dragOver, setDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    
    const files = e.dataTransfer.files;
    if (files.length > 0) {
      const file = files[0];
      if (file.type.startsWith('image/')) {
        onImageSelect(file);
      }
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      onImageSelect(files[0]);
    }
  };

  const handleClick = () => {
    fileInputRef.current?.click();
  };

  return (
    <div className="relative">
      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        onChange={handleFileSelect}
        className="hidden"
        disabled={disabled}
      />
      
      <AnimatePresence>
        {selectedImage ? (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            className="relative inline-block"
          >
            <div className="relative bg-gray-100 dark:bg-gray-800 rounded-lg p-2 max-w-xs">
              <img
                src={URL.createObjectURL(selectedImage)}
                alt="Selected"
                className="w-full h-32 object-cover rounded"
              />
              <Button
                variant="ghost"
                size="icon"
                onClick={onImageRemove}
                className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full"
                disabled={disabled}
              >
                <X className="w-3 h-3" />
              </Button>
            </div>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-center">
              {selectedImage.name}
            </p>
          </motion.div>
        ) : (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className={`
              border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-all duration-200
              ${dragOver 
                ? 'border-blue-500 bg-blue-50 dark:bg-blue-950/20' 
                : 'border-gray-300 dark:border-gray-600 hover:border-gray-400 dark:hover:border-gray-500'
              }
              ${disabled ? 'opacity-50 cursor-not-allowed' : ''}
            `}
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={handleClick}
          >
            <div className="flex flex-col items-center space-y-2">
              <div className={`
                w-12 h-12 rounded-full flex items-center justify-center transition-colors
                ${dragOver 
                  ? 'bg-blue-100 dark:bg-blue-900/30' 
                  : 'bg-gray-100 dark:bg-gray-800'
                }
              `}>
                <Upload className={`w-5 h-5 ${dragOver ? 'text-blue-600' : 'text-gray-500'}`} />
              </div>
              <div className="text-sm">
                <p className="font-medium text-gray-900 dark:text-white">
                  {dragOver ? 'Drop image here' : 'Upload an image'}
                </p>
                <p className="text-gray-500 dark:text-gray-400">
                  Drag & drop or click to browse
                </p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}