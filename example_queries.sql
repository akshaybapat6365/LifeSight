-- Example queries to run against the database

-- 1. Get all users
SELECT * FROM "User";

-- 2. Get all chats with their associated user email
SELECT c.id, c."createdAt", c.messages, u.email 
FROM "Chat" c
JOIN "User" u ON c."userId" = u.id;

-- 3. Get all reservations with completed payments
SELECT r.id, r."createdAt", r.details, u.email
FROM "Reservation" r
JOIN "User" u ON r."userId" = u.id
WHERE r."hasCompletedPayment" = true;

-- 4. Get user reservation counts
SELECT u.email, COUNT(r.id) as reservation_count
FROM "User" u
LEFT JOIN "Reservation" r ON u.id = r."userId"
GROUP BY u.email
ORDER BY reservation_count DESC;

-- 5. Get all messages for a specific user
SELECT c.messages
FROM "Chat" c
WHERE c."userId" = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

-- 6. Complex query: Get users who have both chats and reservations
SELECT DISTINCT u.id, u.email
FROM "User" u
JOIN "Chat" c ON u.id = c."userId"
JOIN "Reservation" r ON u.id = r."userId"; 