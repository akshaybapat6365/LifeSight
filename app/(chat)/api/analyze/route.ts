import { NextResponse } from 'next/server';
import { auth } from '@/app/(auth)/auth';
import { promises as fs } from 'fs';
import { join } from 'path';
import { randomUUID } from 'crypto';

// Import the correct Google Generative AI SDK
import { GoogleGenAI } from '@google/genai';

// Configure the AI client
const configureAI = () => {
  const apiKey = process.env.GOOGLE_GENERATIVE_AI_API_KEY;
  if (!apiKey) {
    throw new Error('GOOGLE_GENERATIVE_AI_API_KEY is not defined');
  }
  return new GoogleGenAI({ apiKey });
};

// Ensure upload directory exists
const createUploadDir = async () => {
  const uploadDir = join(process.cwd(), 'public', 'uploads');
  try {
    await fs.mkdir(uploadDir, { recursive: true });
  } catch (error) {
    console.error('Failed to create uploads directory:', error);
  }
  return uploadDir;
};

export async function POST(request: Request) {
  // Check authentication
  const session = await auth();
  if (!session) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get('file') as File;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    // Check if it's an image file
    if (!file.type.startsWith('image/')) {
      return NextResponse.json(
        { error: 'Only image files are supported' },
        { status: 400 }
      );
    }

    // Check file size (max 5MB)
    const MAX_SIZE = 5 * 1024 * 1024; // 5MB
    if (file.size > MAX_SIZE) {
      return NextResponse.json(
        { error: 'File size exceeds the 5MB limit' },
        { status: 400 }
      );
    }

    // Save the file locally for preview
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    const uniqueFilename = `${randomUUID()}.${fileExt}`;
    const uploadDir = await createUploadDir();
    const filePath = join(uploadDir, uniqueFilename);
    const fileBuffer = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(fileBuffer));
    
    // Generate URL for the public path
    const publicPath = `/uploads/${uniqueFilename}`;

    try {
      console.log(`Processing file: ${file.name}, size: ${file.size} bytes, type: ${file.type}`);
      
      // Convert the file to a Blob for uploading to Gemini API
      const fileBlob = new Blob([Buffer.from(fileBuffer)], { type: file.type });
      
      // Configure AI client
      const ai = configureAI();
      
      console.log("Uploading image to Gemini API...");
      
      // Upload the file to Gemini API
      const uploadedFile = await ai.files.upload({
        file: fileBlob,
      });
      
      console.log("File uploaded successfully, getting model...");
      
      // Configure the model for analysis
      const model = 'gemini-2.5-pro-preview-03-25';
      const config = {
        responseMimeType: 'text/plain',
        systemInstruction: [
          {
            text: `You are BloodInsight AI, an assistant specialized in analyzing and explaining blood test and lab reports. 
Your task is to:
1. Extract key metrics and values from the provided lab report
2. Identify which values are within normal range and which are outside normal range
3. Provide a clear, simple explanation of what each metric means and its significance
4. Offer general insights about the overall health picture based on these results
5. Suggest potential lifestyle modifications or follow-up actions when appropriate

Important notes:
- Always clarify that your analysis is for educational purposes only and not a substitute for medical advice
- Use plain, accessible language that a non-medical person can understand
- When values are outside normal range, explain the potential implications without causing alarm
- Organize information in a structured, easy-to-read format
- Focus on factual information and avoid speculative diagnoses`,
          }
        ],
      };
      
      console.log("Generating content with Gemini API...");
      
      // Create the prompt with the file reference
      const contents = [
        {
          role: 'user',
          parts: [
            {
              fileData: {
                fileUri: uploadedFile.uri,
                mimeType: uploadedFile.mimeType,
              }
            },
          ],
        }
      ];
      
      // Generate content
      const response = await ai.models.generateContent({
        model,
        config,
        contents,
      });
      
      console.log("Successfully received analysis from Gemini API");
      
      const text = response.text;
      
      // Return the analysis and the URL for the saved image
      return NextResponse.json({
        analysis: text,
        imageUrl: publicPath
      });
      
    } catch (error: any) {
      console.error('Error analyzing image:', error);
      
      // Provide more specific error messages based on error type
      let errorMessage = 'Failed to analyze the image';
      let statusCode = 500;
      
      if (error.message?.includes('quota')) {
        errorMessage = 'API quota exceeded. Please try again later.';
        statusCode = 429;
      } else if (error.message?.includes('permission') || error.message?.includes('access')) {
        errorMessage = 'API access permission error. Please check your API key.';
        statusCode = 403;
      } else if (error.message?.includes('format') || error.message?.includes('parse')) {
        errorMessage = 'The image format is not supported or is corrupted.';
        statusCode = 400;
      } else if (error.message?.includes('size_bytes')) {
        // Specifically handle the size_bytes error from the logs
        errorMessage = 'API configuration issue with image size. Please try a smaller image.';
        statusCode = 400;
      }
      
      return NextResponse.json(
        { error: errorMessage },
        { status: statusCode }
      );
    }
  } catch (error) {
    console.error('Request processing error:', error);
    return NextResponse.json(
      { error: 'Failed to process request' },
      { status: 500 }
    );
  }
} 