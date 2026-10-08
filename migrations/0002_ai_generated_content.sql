-- Uploader's declaration that the presentation contains AI-generated content.
ALTER TABLE presentations ADD COLUMN ai_generated_content INTEGER DEFAULT 0;
