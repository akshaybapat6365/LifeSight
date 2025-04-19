import { randomUUID } from 'crypto';
import { promises as fs } from 'fs';
import { join } from 'path';

import { NextResponse } from "next/server";
import { z } from "zod";

import { auth } from "@/app/(auth)/auth";

const FileSchema = z.object({
  file: z
    .instanceof(File)
    .refine((file) => file.size <= 5 * 1024 * 1024, {
      message: "File size should be less than 5MB",
    })
    .refine(
      (file) =>
        ["image/jpeg", "image/png", "application/pdf"].includes(file.type),
      {
        message: "File type should be JPEG, PNG, or PDF",
      },
    ),
});

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
  const session = await auth();

  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  if (request.body === null) {
    return new Response("Request body is empty", { status: 400 });
  }

  try {
    const formData = await request.formData();
    const file = formData.get("file") as File;

    if (!file) {
      return NextResponse.json({ error: "No file uploaded" }, { status: 400 });
    }

    const validatedFile = FileSchema.safeParse({ file });

    if (!validatedFile.success) {
      const errorMessage = validatedFile.error.errors
        .map((error) => error.message)
        .join(", ");

      return NextResponse.json({ error: errorMessage }, { status: 400 });
    }

    // Get file extension
    const fileExt = file.name.split('.').pop()?.toLowerCase();
    
    // Generate unique filename
    const uniqueFilename = `${randomUUID()}.${fileExt}`;
    
    // Create uploads directory
    const uploadDir = await createUploadDir();
    
    // Save file path
    const filePath = join(uploadDir, uniqueFilename);
    
    // Convert file to buffer and save
    const fileBuffer = await file.arrayBuffer();
    await fs.writeFile(filePath, Buffer.from(fileBuffer));
    
    // Generate URL for the saved file
    const url = `/uploads/${uniqueFilename}`;

    return NextResponse.json({
      url,
      pathname: url,
      contentType: file.type,
      size: file.size,
      fileId: url,  // Add fileId for Gemini compatibility
    });
  } catch (err) {
    console.error('Chat route error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
