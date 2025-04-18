import { BloodTestAnalyzer } from "@/components/custom/blood-test-analyzer";

export default function AnalyzePage() {
  return (
    <div className="container mx-auto py-10">
      <div className="max-w-5xl mx-auto">
        <h1 className="text-3xl font-bold mb-6">Blood Test Analysis</h1>
        <p className="text-gray-500 dark:text-gray-400 mb-8">
          Upload a blood test report image and get an AI-powered analysis of your results.
          <span className="block mt-2 text-sm italic">Note: This analysis is for educational purposes only and not a substitute for professional medical advice.</span>
        </p>
        <BloodTestAnalyzer />
      </div>
    </div>
  );
} 