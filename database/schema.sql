CREATE TABLE users (
    name VARCHAR(255) NOT NULL,
    username VARCHAR(255) PRIMARY KEY,
    email VARCHAR(255) UNIQUE NOT NULL,
    password VARCHAR(255) NOT NULL, # need to secure later??
);