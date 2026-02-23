import { useState, useCallback } from "react";
import { generateSwrft, type GenerateSwrftRequest } from "@/lib/api/swrft";
import { downloadBlob, getErrorMessage } from "@/lib/utils";

export function useSwrft() {
  const [isGenerating, setIsGenerating] = useState(false);
  const [message, setMessage] = useState("");

  const generate = useCallback(async (request: GenerateSwrftRequest) => {
    setIsGenerating(true);
    setMessage("Generating SWRFT reports...");

    try {
      const blob = await generateSwrft(request);
      const filename = `${request.fullName} - SWRFT - ${request.year}.xlsx`;
      downloadBlob(blob, filename);
      setMessage("Success! SWRFT file downloaded.");
      return true;
    } catch (error) {
      setMessage(getErrorMessage(error, "Generation failed"));
      return false;
    } finally {
      setIsGenerating(false);
    }
  }, []);

  const clearMessage = useCallback(() => {
    setMessage("");
  }, []);

  return {
    isGenerating,
    message,
    generate,
    clearMessage,
  };
}
