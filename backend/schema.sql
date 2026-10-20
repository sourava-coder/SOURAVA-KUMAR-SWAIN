CREATE TABLE IF NOT EXISTS portfolio_profile (
    id smallint PRIMARY KEY CHECK (id = 1),
    name text NOT NULL, display_name text NOT NULL, role text NOT NULL, city text NOT NULL, timezone text NOT NULL,
    photo_url text NOT NULL DEFAULT '', photo_alt text NOT NULL DEFAULT '', photo_position text NOT NULL DEFAULT '50% 20%',
    email text NOT NULL, whatsapp text NOT NULL, available boolean NOT NULL DEFAULT true,
    phrases jsonb NOT NULL DEFAULT '[]', about jsonb NOT NULL DEFAULT '[]', facts jsonb NOT NULL DEFAULT '[]',
    summary text NOT NULL DEFAULT '', resume_url text NOT NULL DEFAULT ''
);
CREATE TABLE IF NOT EXISTS skill_categories (
    id uuid PRIMARY KEY, name text NOT NULL UNIQUE, position integer NOT NULL
);
CREATE TABLE IF NOT EXISTS skills (
    id uuid PRIMARY KEY, category_id uuid NOT NULL REFERENCES skill_categories(id) ON DELETE CASCADE,
    name text NOT NULL, level smallint NOT NULL CHECK (level BETWEEN 1 AND 5), position integer NOT NULL
);
CREATE TABLE IF NOT EXISTS projects (
    id uuid PRIMARY KEY, title text NOT NULL, category text NOT NULL, description text NOT NULL,
    live_url text NOT NULL DEFAULT '', source_url text NOT NULL DEFAULT '', image_url text NOT NULL DEFAULT '',
    featured boolean NOT NULL DEFAULT false, published boolean NOT NULL DEFAULT true, position integer NOT NULL
);
CREATE TABLE IF NOT EXISTS project_tags (
    id uuid PRIMARY KEY, project_id uuid NOT NULL REFERENCES projects(id) ON DELETE CASCADE,
    name text NOT NULL, position integer NOT NULL
);
CREATE TABLE IF NOT EXISTS social_links (
    id uuid PRIMARY KEY, name text NOT NULL, url text NOT NULL, position integer NOT NULL
);
CREATE TABLE IF NOT EXISTS journey_entries (
    id uuid PRIMARY KEY, period text NOT NULL, title text NOT NULL, organization text NOT NULL,
    description text NOT NULL, position integer NOT NULL
);
CREATE TABLE IF NOT EXISTS education (
    id uuid PRIMARY KEY, title text NOT NULL, organization text NOT NULL, period text NOT NULL,
    description text NOT NULL, position integer NOT NULL
);
CREATE TABLE IF NOT EXISTS certifications (
    id uuid PRIMARY KEY, title text NOT NULL, organization text NOT NULL, period text NOT NULL, position integer NOT NULL
);
CREATE TABLE IF NOT EXISTS website_settings (
    id smallint PRIMARY KEY CHECK (id = 1),
    title text NOT NULL, description text NOT NULL DEFAULT '', hero_intro text NOT NULL DEFAULT '',
    footer text NOT NULL DEFAULT '', maintenance_notice text NOT NULL DEFAULT '',
    nav_labels jsonb NOT NULL DEFAULT '{}', updated_at timestamptz NOT NULL DEFAULT now()
);

ALTER TABLE portfolio_profile ENABLE ROW LEVEL SECURITY;
ALTER TABLE skill_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE skills ENABLE ROW LEVEL SECURITY;
ALTER TABLE projects ENABLE ROW LEVEL SECURITY;
ALTER TABLE project_tags ENABLE ROW LEVEL SECURITY;
ALTER TABLE social_links ENABLE ROW LEVEL SECURITY;
ALTER TABLE journey_entries ENABLE ROW LEVEL SECURITY;
ALTER TABLE education ENABLE ROW LEVEL SECURITY;
ALTER TABLE certifications ENABLE ROW LEVEL SECURITY;
ALTER TABLE website_settings ENABLE ROW LEVEL SECURITY;
REVOKE ALL ON TABLE portfolio_profile, skill_categories,
    skills, projects, project_tags, social_links, journey_entries, education, certifications, website_settings
    FROM anon, authenticated;
