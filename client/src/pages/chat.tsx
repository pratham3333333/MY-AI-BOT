import { useState, useEffect, useRef } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { apiRequest } from "@/lib/queryClient";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useTheme } from "@/hooks/use-theme";
import { Moon, Sun, Trash2, Send, Bot, Loader2, ImageIcon, Wand2, Paperclip } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";
import { useToast } from "@/hooks/use-toast";
import { ImageUpload } from "@/components/ui/image-upload";
import { ImageGenerationDialog } from "@/components/ui/image-generation-dialog";
import type { Message } from "@shared/schema";

export default function Chat() {
  const [message, setMessage] = useState("");
  const [sessionId] = useState(() => crypto.randomUUID());
  const [isTyping, setIsTyping] = useState(false);
  const [selectedImage, setSelectedImage] = useState<File | null>(null);
  const [showImageUpload, setShowImageUpload] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const { theme, setTheme } = useTheme();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  // Get chat history
  const { data: messages = [], isLoading } = useQuery<Message[]>({
    queryKey: ["/api/chat", sessionId],
  });

  // Send message mutation
  const sendMessageMutation = useMutation({
    mutationFn: async (messageContent: string) => {
      const response = await apiRequest("POST", "/api/chat", {
        message: messageContent,
        sessionId,
      });
      return response.json();
    },
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat", sessionId] });
      setMessage("");
      setIsTyping(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    },
    onError: (error) => {
      setIsTyping(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to send message",
        variant: "destructive",
      });
    },
  });

  // Upload image mutation
  const uploadImageMutation = useMutation({
    mutationFn: async ({ file, messageText }: { file: File; messageText: string }) => {
      const formData = new FormData();
      formData.append('image', file);
      formData.append('sessionId', sessionId);
      formData.append('message', messageText);

      const response = await fetch('/api/upload-image', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to upload image');
      }

      return response.json();
    },
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat", sessionId] });
      setMessage("");
      setSelectedImage(null);
      setShowImageUpload(false);
      setIsTyping(false);
      if (textareaRef.current) {
        textareaRef.current.style.height = "auto";
      }
    },
    onError: (error) => {
      setIsTyping(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to upload image",
        variant: "destructive",
      });
    },
  });

  // Generate image mutation
  const generateImageMutation = useMutation({
    mutationFn: async (prompt: string) => {
      const response = await apiRequest("POST", "/api/generate-image", {
        prompt,
        sessionId,
      });
      return response.json();
    },
    onMutate: () => {
      setIsTyping(true);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat", sessionId] });
      setIsTyping(false);
    },
    onError: (error) => {
      setIsTyping(false);
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to generate image",
        variant: "destructive",
      });
    },
  });

  // Clear chat mutation
  const clearChatMutation = useMutation({
    mutationFn: async () => {
      const response = await apiRequest("DELETE", `/api/chat/${sessionId}`);
      return response.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["/api/chat", sessionId] });
      toast({
        title: "Chat cleared",
        description: "Your conversation has been cleared.",
      });
    },
    onError: (error) => {
      toast({
        title: "Error",
        description: error instanceof Error ? error.message : "Failed to clear chat",
        variant: "destructive",
      });
    },
  });

  // Auto-scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isTyping]);

  // Auto-resize textarea
  const handleTextareaChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    const textarea = e.target;
    textarea.style.height = "auto";
    textarea.style.height = Math.min(textarea.scrollHeight, 128) + "px";
  };

  // Handle send message
  const handleSendMessage = () => {
    if (selectedImage && !uploadImageMutation.isPending) {
      uploadImageMutation.mutate({
        file: selectedImage,
        messageText: message.trim() || "Please analyze this image."
      });
    } else if (message.trim() && !sendMessageMutation.isPending) {
      sendMessageMutation.mutate(message.trim());
    }
  };

  // Handle image generation
  const handleGenerateImage = (prompt: string) => {
    if (!generateImageMutation.isPending) {
      generateImageMutation.mutate(prompt);
    }
  };

  // Handle image selection
  const handleImageSelect = (file: File) => {
    setSelectedImage(file);
    setShowImageUpload(false);
  };

  // Handle image removal
  const handleImageRemove = () => {
    setSelectedImage(null);
  };

  // Handle Enter key
  const handleKeyDown = (e: React.KeyboardEvent<HTMLTextAreaElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Format timestamp
  const formatTime = (timestamp: string | Date) => {
    return new Date(timestamp).toLocaleTimeString([], {
      hour: "2-digit",
      minute: "2-digit",
    });
  };

  return (
    <div className="flex flex-col h-screen max-w-4xl mx-auto">
      {/* Header */}
      <header className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-colors duration-300">
        <div className="flex items-center space-x-3">
          <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg flex items-center justify-center">
            <Bot className="w-4 h-4 text-white" />
          </div>
          <div>
            <h1 className="text-xl font-semibold text-gray-900 dark:text-white">
              Gemini Chat
            </h1>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              AI Assistant
            </p>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Button
            variant="ghost"
            size="icon"
            onClick={() => setTheme(theme === "dark" ? "light" : "dark")}
            className="hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            {theme === "dark" ? (
              <Sun className="h-4 w-4" />
            ) : (
              <Moon className="h-4 w-4" />
            )}
          </Button>

          <Button
            variant="ghost"
            size="icon"
            onClick={() => clearChatMutation.mutate()}
            disabled={clearChatMutation.isPending}
            className="hover:bg-gray-100 dark:hover:bg-gray-800"
          >
            <Trash2 className="h-4 w-4" />
          </Button>
        </div>
      </header>

      {/* Messages */}
      <main className="flex-1 overflow-y-auto p-4 space-y-4 bg-gray-50 dark:bg-gray-950 transition-colors duration-300">
        {/* Welcome Message */}
        {messages.length === 0 && !isLoading && (
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex justify-center mb-8"
          >
            <div className="text-center max-w-md">
              <div className="w-16 h-16 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center mx-auto mb-4">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h2 className="text-2xl font-semibold text-gray-900 dark:text-white mb-2">
                Welcome to Gemini Chat
              </h2>
              <p className="text-gray-600 dark:text-gray-400">
                Start a conversation with your AI assistant. Ask questions, get help, or just chat!
              </p>
            </div>
          </motion.div>
        )}

        {/* Message List */}
        <AnimatePresence>
          {messages.map((msg) => (
            <motion.div
              key={msg.id}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
            >
              {msg.role === "user" ? (
                <div className="max-w-xs sm:max-w-md lg:max-w-lg">
                  <div className="bg-blue-600 text-white rounded-2xl rounded-tr-md px-4 py-3 shadow-sm">
                    {msg.imageUrl && (
                      <div className="mb-3">
                        <img
                          src={`/api/images/${msg.imageUrl.split('/').pop()}`}
                          alt="Uploaded image"
                          className="w-full max-w-xs rounded-lg shadow-sm"
                          onError={(e) => {
                            const target = e.target as HTMLImageElement;
                            target.style.display = 'none';
                          }}
                        />
                      </div>
                    )}
                    <p className="text-sm leading-relaxed whitespace-pre-wrap">
                      {msg.content}
                    </p>
                  </div>
                  <div className="text-xs text-gray-500 dark:text-gray-400 mt-1 text-right">
                    {formatTime(msg.timestamp)}
                  </div>
                </div>
              ) : (
                <div className="flex space-x-3 max-w-xs sm:max-w-md lg:max-w-2xl">
                  <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                    <Bot className="w-4 h-4 text-white" />
                  </div>
                  <div className="flex-1">
                    <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border dark:border-gray-700">
                      {msg.imageUrl && msg.messageType === "image_generation" && (
                        <div className="mb-3">
                          <img
                            src={`/api/images/${msg.imageUrl.split('/').pop()}`}
                            alt="Generated image"
                            className="w-full max-w-sm rounded-lg shadow-sm"
                            onError={(e) => {
                              const target = e.target as HTMLImageElement;
                              target.style.display = 'none';
                            }}
                          />
                        </div>
                      )}
                      <p className="text-sm leading-relaxed text-gray-900 dark:text-white whitespace-pre-wrap">
                        {msg.content}
                      </p>
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                      {formatTime(msg.timestamp)}
                    </div>
                  </div>
                </div>
              )}
            </motion.div>
          ))}
        </AnimatePresence>

        {/* Typing Indicator */}
        <AnimatePresence>
          {isTyping && (
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              className="flex justify-start"
            >
              <div className="flex space-x-3 max-w-xs sm:max-w-md lg:max-w-2xl">
                <div className="w-8 h-8 bg-gradient-to-r from-purple-500 to-pink-500 rounded-full flex items-center justify-center flex-shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex-1">
                  <div className="bg-white dark:bg-gray-800 rounded-2xl rounded-tl-md px-4 py-3 shadow-sm border dark:border-gray-700">
                    <div className="flex space-x-1">
                      <motion.div
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.1 }}
                      />
                      <motion.div
                        className="w-2 h-2 bg-gray-400 rounded-full"
                        animate={{ opacity: [0.4, 1, 0.4] }}
                        transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }}
                      />
                    </div>
                  </div>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

        <div ref={messagesEndRef} />
      </main>

      {/* Input */}
      <footer className="border-t border-gray-200 dark:border-gray-700 bg-white dark:bg-gray-900 transition-colors duration-300 p-4">
        <div className="max-w-4xl mx-auto space-y-3">
          {/* Image Upload Section */}
          <AnimatePresence>
            {showImageUpload && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: "auto" }}
                exit={{ opacity: 0, height: 0 }}
                className="overflow-hidden"
              >
                <div className="bg-gray-50 dark:bg-gray-800 rounded-lg p-4">
                  <ImageUpload
                    onImageSelect={handleImageSelect}
                    onImageRemove={handleImageRemove}
                    selectedImage={selectedImage}
                    disabled={uploadImageMutation.isPending || sendMessageMutation.isPending}
                  />
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Selected Image Preview */}
          <AnimatePresence>
            {selectedImage && (
              <motion.div
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                className="flex justify-center"
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
                    onClick={handleImageRemove}
                    className="absolute -top-2 -right-2 w-6 h-6 bg-red-500 hover:bg-red-600 text-white rounded-full"
                    disabled={uploadImageMutation.isPending}
                  >
                    <Trash2 className="w-3 h-3" />
                  </Button>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* Input Row */}
          <div className="flex items-end space-x-3">
            {/* Action Buttons */}
            <div className="flex space-x-1">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => setShowImageUpload(!showImageUpload)}
                className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                disabled={uploadImageMutation.isPending || sendMessageMutation.isPending}
              >
                <Paperclip className="w-4 h-4" />
              </Button>

              <ImageGenerationDialog
                onGenerateImage={handleGenerateImage}
                isGenerating={generateImageMutation.isPending}
              >
                <Button
                  variant="ghost"
                  size="icon"
                  className="hover:bg-gray-100 dark:hover:bg-gray-800 rounded-xl"
                  disabled={generateImageMutation.isPending || uploadImageMutation.isPending || sendMessageMutation.isPending}
                >
                  <Wand2 className="w-4 h-4 text-purple-600" />
                </Button>
              </ImageGenerationDialog>
            </div>

            {/* Text Input */}
            <div className="flex-1 relative">
              <Textarea
                ref={textareaRef}
                value={message}
                onChange={handleTextareaChange}
                onKeyDown={handleKeyDown}
                placeholder={selectedImage ? "Describe what you want me to analyze..." : "Type your message here..."}
                className="resize-none rounded-xl border border-gray-300 dark:border-gray-600 bg-white dark:bg-gray-800 px-4 py-3 pr-12 text-gray-900 dark:text-white placeholder-gray-500 dark:placeholder-gray-400 focus:border-blue-600 focus:outline-none focus:ring-2 focus:ring-blue-600 focus:ring-opacity-20 transition-all duration-200 max-h-32 overflow-y-auto min-h-[44px]"
                disabled={sendMessageMutation.isPending || uploadImageMutation.isPending}
              />
              <div className="absolute bottom-1 right-12 text-xs text-gray-400 dark:text-gray-500">
                {message.length}/2000
              </div>
            </div>

            {/* Send Button */}
            <Button
              onClick={handleSendMessage}
              disabled={(!message.trim() && !selectedImage) || sendMessageMutation.isPending || uploadImageMutation.isPending}
              className="bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 dark:disabled:bg-gray-600 disabled:cursor-not-allowed text-white rounded-xl px-4 py-3 transition-all duration-200 transform hover:scale-105 active:scale-95 flex items-center justify-center min-w-[44px] h-[44px]"
            >
              {(sendMessageMutation.isPending || uploadImageMutation.isPending) ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <Send className="w-4 h-4" />
              )}
            </Button>
          </div>
        </div>
      </footer>
    </div>
  );
}
