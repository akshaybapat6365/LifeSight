import { BloodTestAnalyzer } from "@/components/custom/blood-test-analyzer";

export default function AnalyzeTestPage() {
  return (
    <div className="container mx-auto py-10">
      <h1 className="text-2xl font-bold mb-6">Blood Test Analyzer (Test Mode)</h1>
      <p className="text-muted-foreground mb-8">
        This is a test page that uses the analyze-test endpoint which doesn't require authentication.
      </p>
      <div className="max-w-2xl mx-auto">
        <BloodTestAnalyzer useTestEndpoint={true} />
      </div>
    </div>
  );
} 