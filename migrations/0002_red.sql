-- La red desde la que llega la visita (asOrganization de Cloudflare: "Telefonica
-- de Espana", "OVH SAS"...). No identifica a nadie, y sirve para separar a los
-- robots que se hacen pasar por navegador desde servidores alquilados.
ALTER TABLE visitas ADD COLUMN red TEXT NOT NULL DEFAULT '';
