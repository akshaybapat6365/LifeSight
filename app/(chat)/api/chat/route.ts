import { convertToCoreMessages, Message, streamText } from "ai";
import { NextResponse } from 'next/server';
import { z } from "zod";

import { geminiProModel } from "@/ai";
import {
  generateReservationPrice,
  generateSampleFlightSearchResults,
  generateSampleFlightStatus,
  generateSampleSeatSelection,
} from "@/ai/actions";
import { auth } from "@/app/(auth)/auth";
import {
  createReservation,
  deleteChatById,
  getChatById,
  getReservationById,
  saveChat,
} from "@/db/queries";
import { generateUUID } from "@/lib/utils";
import { getBaseURL, toAbsoluteURL } from "@/lib/utils/url";

// Simple version of reservation price generation
const generateSimpleReservationPrice = () => {
  return {
    totalPriceInUSD: Math.floor(Math.random() * 500) + 200
  };
};

export async function POST(request: Request) {
  try {
    const { id, messages }: { id: string; messages: Array<Message> } =
      await request.json();

    const session = await auth();

    if (!session) {
      return new Response("Unauthorized", { status: 401 });
    }

    // Process messages with attachments
    const processedMessages = messages.map(message => {
      if (message.experimental_attachments && message.experimental_attachments.length > 0) {
        // Create a properly typed copy of the attachments
        const typedAttachments = message.experimental_attachments.map(attachment => {
          // For Gemini: use fileId if it exists (using "in" operator for type safety)
          if ('fileId' in attachment && attachment.fileId) {
            return {
              url: '', // Add a dummy URL to satisfy the Attachment type
              fileId: attachment.fileId,
              // Size property would be added in the streaming handler internally
            };
          }
          
          // For OpenAI: convert relative URL to absolute URL
          if ('url' in attachment && attachment.url) {
            if (attachment.url.startsWith('/')) {
              return { 
                url: toAbsoluteURL(attachment.url) 
              };
            }
            return { url: attachment.url };
          }
          
          // Fallback to ensure type safety
          return { url: '' };
        });

        return {
          ...message,
          experimental_attachments: typedAttachments
        };
      }
      return message;
    });

    const coreMessages = convertToCoreMessages(processedMessages).filter(
      (message) => message.content.length > 0,
    );

    const result = await streamText({
      model: geminiProModel,
      system: `\n
          - you help users book flights!
          - keep your responses limited to a sentence.
          - DO NOT output lists.
          - after every tool call, pretend you're showing the result to the user and keep your response limited to a phrase.
          - today's date is ${new Date().toLocaleDateString()}.
          - ask follow up questions to nudge user into the optimal flow
          - ask for any details you don't know, like name of passenger, etc.'
          - C and D are aisle seats, A and F are window seats, B and E are middle seats
          - assume the most popular airports for the origin and destination
          - here's the optimal flow
            - search for flights
            - choose flight
            - select seats
            - create reservation (ask user whether to proceed with payment or change reservation)
            - authorize payment (requires user consent, wait for user to finish payment and let you know when done)
            - display boarding pass (DO NOT display boarding pass without verifying payment)
          '
        `,
      messages: coreMessages,
      tools: {
        findFlights: {
          description: "Searches for flights based on the origin, destination, and date.",
          parameters: z.object({
            origin: z
              .string()
              .describe("Origin airport code (3 letters) or city name"),
            destination: z
              .string()
              .describe("Destination airport code (3 letters) or city name"),
            date: z.string().describe("Date of travel (YYYY-MM-DD)"),
            returnDate: z
              .string()
              .optional()
              .describe("Return date (YYYY-MM-DD) for round trip flights"),
            passengers: z
              .number()
              .int()
              .positive()
              .optional()
              .describe("Number of passengers"),
            cabinClass: z
              .string()
              .optional()
              .describe("Cabin class (economy, premium, business, first)"),
          }),
          execute: async ({ origin, destination }) => {
            return generateSampleFlightSearchResults({ origin, destination });
          },
        },
        getFlightStatus: {
          description: "Gets the status of a flight by flight number and date.",
          parameters: z.object({
            flightNumber: z
              .string()
              .describe(
                "Flight number, including airline code and number (e.g., BA142)",
              ),
            date: z.string().describe("Date of the flight (YYYY-MM-DD)"),
          }),
          execute: async ({ flightNumber, date }) => {
            return generateSampleFlightStatus({ flightNumber, date });
          },
        },
        selectSeats: {
          description: "Selects seats for passengers on a particular flight. Returns available and selected seats.",
          parameters: z.object({
            flightNumber: z
              .string()
              .describe(
                "Flight number, including airline code and number (e.g., BA142)",
              ),
            date: z.string().describe("Date of the flight (YYYY-MM-DD)"),
            passengers: z
              .array(
                z.object({
                  name: z.string().describe("Passenger name"),
                  seat: z
                    .string()
                    .describe(
                      "Seat number (e.g., 12A, 12B). Format is [row number][seat letter].",
                    ),
                }),
              )
              .describe("Array of passengers and their selected seats"),
          }),
          execute: async ({ flightNumber }) => {
            return generateSampleSeatSelection({ flightNumber });
          },
        },
        createReservation: {
          description: "Creates a reservation with the selected flights, passenger information, and selected seats.",
          parameters: z.object({
            flightNumber: z
              .string()
              .describe(
                "Flight number, including airline code and number (e.g., BA142)",
              ),
            date: z.string().describe("Date of the flight (YYYY-MM-DD)"),
            passengers: z
              .array(
                z.object({
                  name: z.string().describe("Passenger name"),
                  email: z
                    .string()
                    .email()
                    .optional()
                    .describe("Passenger email"),
                  seat: z
                    .string()
                    .describe(
                      "Seat number (e.g., 12A, 12B). Format is [row number][seat letter].",
                    ),
                }),
              )
              .describe("Array of passengers and their selected seats"),
            returnFlight: z
              .object({
                flightNumber: z
                  .string()
                  .describe(
                    "Return flight number, including airline code and number (e.g., BA143)",
                  ),
                date: z
                  .string()
                  .describe("Date of the return flight (YYYY-MM-DD)"),
                passengers: z
                  .array(
                    z.object({
                      name: z.string().describe("Passenger name"),
                      seat: z
                        .string()
                        .describe(
                          "Seat number (e.g., 12A, 12B). Format is [row number][seat letter].",
                        ),
                    }),
                  )
                  .describe("Array of passengers and their selected seats"),
              })
              .optional()
              .describe("Return flight information"),
          }),
          execute: async ({ flightNumber, date, passengers }) => {
            const reservationId = generateUUID();
            // Create a reservation details object with all the necessary information
            const reservationDetails = {
              flightNumber,
              date,
              passengers,
              price: generateSimpleReservationPrice().totalPriceInUSD
            };
            
            // Get current session
            const currentSession = await auth();
            if (!currentSession?.user?.id) {
              throw new Error('User not authenticated');
            }
            
            // Call createReservation with the correct parameters format
            await createReservation({
              id: reservationId,
              userId: currentSession.user.id,
              details: reservationDetails
            });
            
            return { 
              reservationId, 
              price: reservationDetails.price
            };
          },
        },
        getReservation: {
          description: "Gets a reservation by ID.",
          parameters: z.object({
            reservationId: z.string().describe("Reservation ID"),
          }),
          execute: async ({ reservationId }) => {
            const reservation = await getReservationById(reservationId);
            return reservation;
          },
        },
        authorizePayment: {
          description: "Authorizes a payment for a reservation. Returns the payment details.",
          parameters: z.object({
            reservationId: z.string().describe("Reservation ID"),
            paymentMethod: z
              .string()
              .describe("Payment method (credit_card, paypal, apple_pay)"),
            amount: z.number().describe("Payment amount"),
            currency: z
              .string()
              .describe("Payment currency (USD, EUR, GBP, etc.)"),
          }),
          execute: async ({ reservationId }) => {
            return {
              paymentId: generateUUID(),
              reservationId,
              status: "authorized",
              transactionDate: new Date().toISOString(),
            };
          },
        },
        verifyPayment: {
          description: "Verifies a payment by payment ID.",
          parameters: z.object({
            paymentId: z.string().describe("Payment ID"),
          }),
          execute: async () => {
            return {
              status: "verified",
              verificationDate: new Date().toISOString(),
            };
          },
        },
        getBoardingPass: {
          description: "Gets a boarding pass by reservation ID.",
          parameters: z.object({
            reservationId: z.string().describe("Reservation ID"),
            paymentId: z.string().describe("Payment ID"),
          }),
          execute: async ({ reservationId }) => {
            return {
              boardingPassId: generateUUID(),
              reservationId,
              gateNumber: "B12",
              boardingTime: "10:30",
              gateCloseTime: "10:50",
              terminal: "2",
            };
          },
        },
      },
    });

    // Save the chat
    if (id && coreMessages.length > 0) {
      try {
        // Ensure session and user ID exist before saving
        if (!session?.user?.id) {
          console.error("Error saving chat: User ID is missing from session.");
        } else {
          await saveChat({ 
            id, 
            userId: session.user.id, 
            messages: coreMessages 
          });
        }
      } catch (error) {
        console.error("Error saving chat:", error);
      }
    }

    return result.toDataStreamResponse();
  } catch (err) {
    console.error('Chat route error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}

export async function DELETE(request: Request) {
  const { searchParams } = new URL(request.url);
  const id = searchParams.get("id");
  const session = await auth();

  if (!session) {
    return new Response("Unauthorized", { status: 401 });
  }

  if (!id) {
    return Response.json({ error: "Missing chat ID" }, { status: 400 });
  }

  // Check if the chat belongs to the user
  const chat = await getChatById({ id });
  // Ensure session.user.id exists before comparison
  if (!chat || !session.user || chat.userId !== session.user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  try {
    // Pass id as an object
    await deleteChatById({ id });
    return Response.json({ success: true });
  } catch (err) {
    console.error('Chat route error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
