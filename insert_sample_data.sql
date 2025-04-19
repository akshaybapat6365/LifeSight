-- Insert sample data into the tables

-- Sample users
INSERT INTO "User" (id, email, password)
VALUES 
  ('a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11', 'user1@example.com', 'password123'),
  ('b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22', 'user2@example.com', 'password456');

-- Sample chats
INSERT INTO "Chat" (id, "createdAt", messages, "userId")
VALUES 
  ('c2eebc99-9c0b-4ef8-bb6d-6bb9bd380a33', CURRENT_TIMESTAMP, '[{"role":"user","content":"Hello AI!"},{"role":"assistant","content":"Hello! How can I help you today?"}]'::jsonb, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
  ('d3eebc99-9c0b-4ef8-bb6d-6bb9bd380a44', CURRENT_TIMESTAMP, '[{"role":"user","content":"I need help with my trip"},{"role":"assistant","content":"I''d be happy to help with your trip planning!"}]'::jsonb, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22');

-- Sample reservations
INSERT INTO "Reservation" (id, "createdAt", details, "hasCompletedPayment", "userId")
VALUES 
  ('e4eebc99-9c0b-4ef8-bb6d-6bb9bd380a55', CURRENT_TIMESTAMP, '{"destination":"Paris","startDate":"2025-05-01","endDate":"2025-05-10","guests":2}'::jsonb, true, 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11'),
  ('f5eebc99-9c0b-4ef8-bb6d-6bb9bd380a66', CURRENT_TIMESTAMP, '{"destination":"Tokyo","startDate":"2025-06-15","endDate":"2025-06-25","guests":1}'::jsonb, false, 'b1eebc99-9c0b-4ef8-bb6d-6bb9bd380a22'); 