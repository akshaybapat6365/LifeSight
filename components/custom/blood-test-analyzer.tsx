"use client";

import { useState } from "react";
import Image from "next/image";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { AlertCircle, Loader2, UploadCloud } from "lucide-react";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";

export function BloodTestAnalyzer() {
  const [file, setFile] = useState<File | null>(null);
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const selectedFile = e.target.files[0];
      
      // Check if it's an image
      if (!selectedFile.type.startsWith("image/")) {
        setError("Please upload an image file (JPEG, PNG)");
        return;
      }
      
      // Check file size (max 5MB)
      const MAX_SIZE = 5 * 1024 * 1024; // 5MB
      if (selectedFile.size > MAX_SIZE) {
        setError("File size exceeds the 5MB limit");
        return;
      }
      
      setFile(selectedFile);
      setError(null);
      
      // Create preview
      const reader = new FileReader();
      reader.onload = (e) => {
        setImagePreview(e.target?.result as string);
      };
      reader.readAsDataURL(selectedFile);
    }
  };

  const analyzeBloodTest = async () => {
    if (!file) {
      setError("Please select a file to analyze");
      return;
    }

    setLoading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", file);

      const response = await fetch("/api/analyze", {
        method: "POST",
        body: formData,
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || "Failed to analyze the image");
      }

      setAnalysis(data.analysis);
      console.log("Analysis completed successfully:", data.analysis);
    } catch (error) {
      console.error("Error analyzing blood test:", error);
      setError(error instanceof Error ? error.message : "Failed to analyze the image");
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFile(null);
    setImagePreview(null);
    setAnalysis(null);
    setError(null);
  };

  return (
    <div className="w-full max-w-4xl mx-auto bg-white dark:bg-gray-800 rounded-lg shadow-md overflow-hidden">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h2 className="text-2xl font-bold text-gray-900 dark:text-gray-100">Blood Test Analyzer</h2>
        <p className="text-sm text-gray-500 dark:text-gray-400 mb-2">
          Upload a blood test report image for AI analysis
        </p>
      </div>

      <div className="p-6 space-y-6">
        {loading && (
          <div className="flex flex-col items-center justify-center py-10">
            <Loader2 className="h-12 w-12 animate-spin text-primary mb-4" />
            <p className="text-lg font-medium">Analyzing your blood test results...</p>
            <p className="text-sm text-muted-foreground mt-2">This may take up to 30 seconds</p>
          </div>
        )}

        {!loading && !analysis && (
          <div className="space-y-4">
            <div className="flex items-center justify-center w-full">
              <label
                htmlFor="blood-test-file"
                className="flex flex-col items-center justify-center w-full h-64 border-2 border-dashed rounded-lg cursor-pointer bg-gray-50 dark:hover:bg-gray-700 dark:bg-gray-800 hover:bg-gray-100 dark:border-gray-600"
              >
                <div className="flex flex-col items-center justify-center pt-5 pb-6">
                  <UploadCloud className="w-8 h-8 mb-4 text-gray-500 dark:text-gray-400" />
                  <p className="mb-2 text-sm text-gray-500 dark:text-gray-400">
                    <span className="font-semibold">Click to upload</span> or drag and drop
                  </p>
                  <p className="text-xs text-gray-500 dark:text-gray-400">
                    PNG, JPG (MAX. 5MB)
                  </p>
                </div>
                <Input
                  id="blood-test-file"
                  type="file"
                  className="hidden"
                  accept="image/*"
                  onChange={handleFileChange}
                />
              </label>
            </div>
            
            {imagePreview && (
              <div className="mt-4">
                <p className="text-sm font-medium mb-2">Preview:</p>
                <div className="relative w-full h-64 overflow-hidden rounded-lg">
                  <Image 
                    src={imagePreview} 
                    alt="Preview" 
                    fill 
                    style={{ objectFit: 'contain' }} 
                    unoptimized
                  />
                </div>
              </div>
            )}
            
            {error && (
              <Alert variant="destructive">
                <AlertCircle className="h-4 w-4" />
                <AlertTitle>Error</AlertTitle>
                <AlertDescription>{error}</AlertDescription>
              </Alert>
            )}

            <div className="flex justify-center">
              <Button 
                onClick={analyzeBloodTest} 
                disabled={!file || loading}
                className="px-6"
              >
                Analyze Blood Test
              </Button>
            </div>
          </div>
        )}

        {!loading && analysis && (
          <div className="space-y-4">
            <div className="flex flex-col md:flex-row gap-6">
              {imagePreview && (
                <div className="relative w-full md:w-1/3 h-72 overflow-hidden rounded-lg">
                  <Image 
                    src={imagePreview} 
                    alt="Blood Test" 
                    fill 
                    style={{ objectFit: 'contain' }} 
                    unoptimized
                  />
                </div>
              )}
              <div className="flex-1 overflow-auto max-h-96 bg-gray-50 dark:bg-gray-900 p-4 rounded-lg">
                <h3 className="text-lg font-semibold mb-2">Analysis Results</h3>
                <pre className="whitespace-pre-wrap text-sm">{analysis}</pre>
              </div>
            </div>

            <div className="flex justify-center mt-4">
              <Button variant="outline" onClick={resetForm}>
                Analyze Another Image
              </Button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
} 