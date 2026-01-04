-- Construction Estimator SaaS Database Schema
-- This script creates the necessary tables for the construction estimator application

-- Create database if it doesn't exist
-- Note: This line should be run separately if the database doesn't exist
-- CREATE DATABASE construction_estimator;

-- Drop tables if they exist (for clean migration)
DROP TABLE IF EXISTS projects CASCADE;
DROP TABLE IF EXISTS laborers CASCADE;
DROP TABLE IF EXISTS boq_items CASCADE;
DROP TABLE IF EXISTS rates CASCADE;

-- Create rates table
CREATE TABLE rates (
    id SERIAL PRIMARY KEY,
    item_name VARCHAR(255) NOT NULL,
    unit VARCHAR(50) NOT NULL,
    rate_value DECIMAL(10, 2) NOT NULL CHECK (rate_value >= 0),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create BOQ items table
CREATE TABLE boq_items (
    id SERIAL PRIMARY KEY,
    description TEXT NOT NULL,
    quantity DECIMAL(15, 3) NOT NULL CHECK (quantity >= 0),
    unit VARCHAR(50) NOT NULL,
    remarks TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- Create laborers table
CREATE TABLE laborers (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    skill_set VARCHAR(100) NOT NULL,
    current_status VARCHAR(50) NOT NULL DEFAULT 'Available',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_status CHECK (current_status IN ('Available', 'Assigned', 'On Leave', 'Inactive'))
);

-- Create projects table
CREATE TABLE projects (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    start_date DATE NOT NULL,
    end_date DATE,
    status VARCHAR(50) NOT NULL DEFAULT 'Planning',
    budget DECIMAL(15, 2) NOT NULL CHECK (budget >= 0),
    location VARCHAR(255),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT valid_project_status CHECK (status IN ('Planning', 'In Progress', 'On Hold', 'Completed', 'Cancelled')),
    CONSTRAINT valid_dates CHECK (end_date IS NULL OR end_date >= start_date)
);

-- Create indexes for better performance
CREATE INDEX idx_rates_item_name ON rates(item_name);
CREATE INDEX idx_boq_items_description ON boq_items(description);
CREATE INDEX idx_laborers_skill_set ON laborers(skill_set);
CREATE INDEX idx_laborers_status ON laborers(current_status);
CREATE INDEX idx_projects_status ON projects(status);
CREATE INDEX idx_projects_dates ON projects(start_date, end_date);

-- Insert sample data for testing

-- Sample rates
INSERT INTO rates (item_name, unit, rate_value) VALUES
('Concrete Mix (Grade 30)', 'm³', 85.00),
('Steel Reinforcement', 'kg', 1.25),
('Brickwork', 'm²', 45.50),
('Cement', 'bag', 8.75),
('Sand (Fine)', 'm³', 35.00),
('Skilled Labor (Mason)', 'hr', 25.00),
('General Labor', 'hr', 15.00),
('Paint (Interior)', 'L', 12.50);

-- Sample BOQ items
INSERT INTO boq_items (description, quantity, unit, remarks) VALUES
('Foundation Excavation', 150.00, 'm³', 'Excavation depth 2.5m average'),
('Concrete Foundation', 120.00, 'm³', 'Grade 30 concrete with waterproofing'),
('Brick Masonry Walls', 850.00, 'm²', '9-inch thick walls, first quality bricks'),
('Steel Reinforcement', 2500.00, 'kg', 'TMT bars Fe-500, various diameters'),
('Roof Concrete Slab', 200.00, 'm³', '6-inch thick RCC slab'),
('Interior Plastering', 750.00, 'm²', '12mm thick cement plaster'),
('External Painting', 400.00, 'm²', 'Weather-resistant exterior paint');

-- Sample laborers
INSERT INTO laborers (name, skill_set, current_status) VALUES
('John Smith', 'Mason', 'Available'),
('Mike Johnson', 'Carpenter', 'Assigned'),
('Carlos Rodriguez', 'Electrician', 'Available'),
('Ahmed Ali', 'Plumber', 'Available'),
('Robert Brown', 'General Labor', 'Available'),
('David Wilson', 'Supervisor', 'Assigned'),
('James Davis', 'Operator', 'On Leave'),
('William Garcia', 'Mason', 'Available');

-- Sample projects
INSERT INTO projects (name, description, start_date, end_date, status, budget, location) VALUES
('Downtown Office Complex', 'Modern 5-story office building with parking', '2025-02-01', '2025-12-15', 'Planning', 2500000.00, 'Downtown Business District'),
('Residential Villa Project', 'Luxury 3-bedroom villa with garden', '2025-01-15', '2025-08-30', 'In Progress', 450000.00, 'Hillside Estates'),
('Warehouse Renovation', 'Complete renovation of existing warehouse facility', '2024-11-01', '2025-03-30', 'In Progress', 180000.00, 'Industrial Park Zone'),
('Shopping Mall Extension', 'Extension of existing shopping center', '2025-03-01', '2025-11-30', 'Planning', 1200000.00, 'City Center Mall');

-- Function to update the updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = CURRENT_TIMESTAMP;
    RETURN NEW;
END;
$$ language 'plpgsql';

-- Create triggers to automatically update the updated_at column
CREATE TRIGGER update_rates_updated_at BEFORE UPDATE ON rates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_boq_items_updated_at BEFORE UPDATE ON boq_items
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_laborers_updated_at BEFORE UPDATE ON laborers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TRIGGER update_projects_updated_at BEFORE UPDATE ON projects
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Grant permissions (adjust as needed for your environment)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_db_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_db_user;

-- Display success message
SELECT 'Database schema created successfully!' AS status;