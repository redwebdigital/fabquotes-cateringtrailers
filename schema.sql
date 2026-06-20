-- FabQuotes Catering Trailers Schema
-- Run this once in Hostinger phpMyAdmin

CREATE TABLE IF NOT EXISTS fq_users (
    id INT AUTO_INCREMENT PRIMARY KEY,
    username VARCHAR(50) UNIQUE NOT NULL,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fq_trailers (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fq_addons (
    id VARCHAR(36) PRIMARY KEY,
    name VARCHAR(100) NOT NULL,
    price DECIMAL(10,2) NOT NULL,
    supplier_url TEXT,
    supplier_price DECIMAL(10,2),
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fq_specs (
    id VARCHAR(36) PRIMARY KEY,
    text TEXT NOT NULL,
    sort_order INT DEFAULT 0,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS fq_quotes (
    id VARCHAR(36) PRIMARY KEY,
    user_id INT,
    trailer_id VARCHAR(36),
    trailer_name VARCHAR(100),
    trailer_price DECIMAL(10,2),
    customer_name VARCHAR(100),
    customer_phone VARCHAR(50),
    notes TEXT,
    total DECIMAL(10,2),
    addons_json LONGTEXT,
    specs_json LONGTEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Default users
INSERT IGNORE INTO fq_users (username) VALUES ('Phil123'), ('Ste123');

-- Default trailers
INSERT IGNORE INTO fq_trailers (id, name, price, sort_order) VALUES
('t1', '8ft Catering Trailer', 8500, 1),
('t2', '10ft Catering Trailer', 9500, 2),
('t3', '12ft Catering Trailer', 10500, 3);

-- Default add-ons
INSERT IGNORE INTO fq_addons (id, name, price, sort_order) VALUES
('a1',  'Stable Door', 450, 1),
('a2',  'Built In Generator Box', 600, 2),
('a3',  'External Menu Boards', 300, 3),
('a4',  'Advertising Fixed Headboard', 400, 4),
('a5',  'Customer Shelf', 250, 5),
('a6',  'Under Counter Fridge', 500, 6),
('a7',  'Tall Drinks Fridge', 650, 7),
('a8',  'Coffee Machine System', 900, 8),
('a9',  'Extraction Hood Kit', 750, 9),
('a10', 'Pizza Oven Wood/Gas', 1200, 10);

-- Default specs
INSERT IGNORE INTO fq_specs (id, text, sort_order) VALUES
('s1',  'NEW GRP Armacel light weight walls', 1),
('s2',  'Galvanised chassis', 2),
('s3',  'Satin stainless steel worktops with upstand', 3),
('s4',  'Anodised aluminium trim and corner sections', 4),
('s5',  'Water heater (ELEC or LPG)', 5),
('s6',  '2 x Sinks', 6),
('s7',  '240v Water pump', 7),
('s8',  'Mixer tap', 8),
('s9',  'Stainless steel cupboard under the sink area', 9),
('s10', 'Fold away aluminium step', 10),
('s11', 'Non slip vinyl flooring', 11),
('s12', 'Solid GRP gas box with auto changeover valve', 12),
('s13', 'Electric pack including double socket, 5ft light and 16amp fuse box with inlet', 13),
('s14', 'Lockable coupling & heavy duty jockey wheel', 14),
('s15', 'Essentials pack (waste & water carrier, first aid kit, 10m 16amp lead & fire extinguisher)', 15),
('s16', 'Gas safe certificate', 16),
('s17', 'NICEIC electrical certificate', 17),
('s18', 'VOSA approved certificate', 18);
