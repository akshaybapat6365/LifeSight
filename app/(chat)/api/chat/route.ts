import { convertToCoreMessages, Message, streamText } from "ai";
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
        return {
          ...message,
          experimental_attachments: message.experimental_attachments.map(attachment => {
            // For Gemini: use fileId
            if (attachment.fileId) {
              return { 
                fileId: attachment.fileId,
                // Include size property for Gemini if available
                ...(attachment.size && { sizeBytes: attachment.size })
              };
            }
            
            // For OpenAI: convert relative URL to absolute URL
            if (attachment.url && attachment.url.startsWith('/')) {
              return { 
                url: toAbsoluteURL(attachment.url) 
              };
            }
            
            return attachment;
          })
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
      tools: [
        {
          type: "function",
          function: {
            name: "findFlights",
            description:
              "Searches for flights based on the origin, destination, and date.",
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
            handler: () => {
              return generateSampleFlightSearchResults();
            },
          },
        },
        {
          type: "function",
          function: {
            name: "getFlightStatus",
            description: "Gets the status of a flight by flight number and date.",
            parameters: z.object({
              flightNumber: z
                .string()
                .describe(
                  "Flight number, including airline code and number (e.g., BA142)",
                ),
              date: z.string().describe("Date of the flight (YYYY-MM-DD)"),
            }),
            handler: () => {
              return generateSampleFlightStatus();
            },
          },
        },
        {
          type: "function",
          function: {
            name: "selectSeats",
            description:
              "Selects seats for passengers on a particular flight. Returns available and selected seats.",
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
            handler: () => {
              return generateSampleSeatSelection();
            },
          },
        },
        {
          type: "function",
          function: {
            name: "createReservation",
            description:
              "Creates a reservation with the selected flights, passenger information, and selected seats.",
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
            handler: async ({ flightNumber, date, passengers }) => {
              const reservationId = generateUUID();
              await createReservation(
                reservationId,
                flightNumber,
                date,
                JSON.stringify(passengers),
                generateReservationPrice(),
              );
              return { reservationId, price: generateReservationPrice() };
            },
          },
        },
        {
          type: "function",
          function: {
            name: "getReservation",
            description: "Gets a reservation by ID.",
            parameters: z.object({
              reservationId: z.string().describe("Reservation ID"),
            }),
            handler: async ({ reservationId }) => {
              const reservation = await getReservationById(reservationId);
              return reservation;
            },
          },
        },
        {
          type: "function",
          function: {
            name: "authorizePayment",
            description:
              "Authorizes a payment for a reservation. Returns the payment details.",
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
            handler: ({ reservationId }) => {
              return {
                paymentId: generateUUID(),
                reservationId,
                status: "authorized",
                transactionDate: new Date().toISOString(),
              };
            },
          },
        },
        {
          type: "function",
          function: {
            name: "verifyPayment",
            description: "Verifies a payment by payment ID.",
            parameters: z.object({
              paymentId: z.string().describe("Payment ID"),
            }),
            handler: () => {
              return {
                status: "verified",
                verificationDate: new Date().toISOString(),
              };
            },
          },
        },
        {
          type: "function",
          function: {
            name: "getBoardingPass",
            description: "Gets a boarding pass by reservation ID.",
            parameters: z.object({
              reservationId: z.string().describe("Reservation ID"),
              paymentId: z.string().describe("Payment ID"),
            }),
            handler: ({ reservationId }) => {
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
      ],
    });

    // Save the chat
    if (id && coreMessages.length > 0) {
      try {
        await saveChat(id, session.user.id, coreMessages);
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
  if (!chat || chat.userId !== session.user.id) {
    return Response.json({ error: "Not found" }, { status: 404 });
  }

  try {
    await deleteChatById(id);
    return Response.json({ success: true });
  } catch (err) {
    console.error('Chat route error', err);
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
