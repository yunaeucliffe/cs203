-- MOCK USER

INSERT INTO users (
    name,
    username,
    email,
    password_hash
)
VALUES (
    'Mary Tan',
    'marytan',
    'mary@example.com',
    '$2b$10$/B7iA0I2hZg2Yz2nolaZGOEHifBwClsKJ/43ZftaN3mUIRUWqhsGu'
)
ON CONFLICT (username) DO UPDATE SET
    name = EXCLUDED.name,
    email = EXCLUDED.email,
    password_hash = EXCLUDED.password_hash;


-- MOCK USER PREFERENCES

INSERT INTO user_preferences (
    user_id,
    walking_speed,
    walking_tolerance,
    prefer_sheltered
)
SELECT
    id,
    'Slow',
    'Short',
    TRUE
FROM users
WHERE username = 'marytan'
ON CONFLICT (user_id) DO UPDATE SET
    walking_speed = EXCLUDED.walking_speed,
    walking_tolerance = EXCLUDED.walking_tolerance,
    prefer_sheltered = EXCLUDED.prefer_sheltered;


-- MOCK SAVED PLACE: HOME

INSERT INTO saved_places (
    user_id,
    label,
    address,
    latitude,
    longitude
)
SELECT
    id,
    'Home',
    'Tampines, Singapore',
    1.3521,
    103.9447
FROM users
WHERE username = 'marytan'
ON CONFLICT (user_id, label) DO NOTHING;


-- MOCK SAVED PLACE: SMU

INSERT INTO saved_places (
    user_id,
    label,
    address,
    latitude,
    longitude
)
SELECT
    id,
    'SMU',
    'Singapore Management University, 81 Victoria Street, Singapore',
    1.2966,
    103.8520
FROM users
WHERE username = 'marytan'
ON CONFLICT (user_id, label) DO NOTHING;