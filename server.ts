import express from "express";
import { createServer as createViteServer } from "vite";
import Database from "better-sqlite3";
import path from "path";
import { fileURLToPath } from "url";
import { createClient } from "@supabase/supabase-js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const db = new Database("app.db");

// Initialize Supabase Client (if keys are provided)
const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
const supabase = (supabaseUrl && supabaseKey) ? createClient(supabaseUrl, supabaseKey) : null;

if (supabase) {
  console.log("Supabase connection initialized.");
} else {
  console.log("Supabase keys not found. Falling back to local SQLite.");
}

// Initialize database tables (SQLite)
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL,
    role TEXT
  );

  CREATE TABLE IF NOT EXISTS companies (
    id TEXT PRIMARY KEY,
    user_id INTEGER NOT NULL,
    name TEXT NOT NULL,
    nif TEXT NOT NULL,
    sector TEXT,
    size TEXT,
    location TEXT,
    gps TEXT,
    especializacao_vertical TEXT,
    volume_projetos_anual TEXT,
    maturidade_workflow TEXT,
    integracao_digital TEXT,
    presenca_cadeia_valor TEXT,
    is_client INTEGER DEFAULT 0,
    full_data TEXT NOT NULL,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (user_id) REFERENCES users (id)
  );
`);

// Try to add the gps and is_client columns if they don't exist (for existing databases)
try {
  db.exec("ALTER TABLE companies ADD COLUMN gps TEXT");
} catch (e) {
  // Column already exists
}
try {
  db.exec("ALTER TABLE companies ADD COLUMN is_client INTEGER DEFAULT 0");
} catch (e) {
  // Column already exists
}

async function startServer() {
  const app = express();
  const PORT = 3000;

  app.use(express.json());

  // API Routes

  // Auth: Register
  app.post("/api/auth/register", async (req, res) => {
    const { name, email, password, role } = req.body;
    
    if (supabase) {
      const { data, error } = await supabase
        .from("users")
        .insert([{ name, email, password, role }])
        .select()
        .single();
      
      if (error) {
        if (error.code === "23505") return res.status(400).json({ error: "Email already exists" });
        return res.status(500).json({ error: error.message });
      }
      return res.json(data);
    }

    try {
      const stmt = db.prepare("INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)");
      const info = stmt.run(name, email, password, role);
      res.json({ id: info.lastInsertRowid, name, email, role });
    } catch (error: any) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        res.status(400).json({ error: "Email already exists" });
      } else {
        res.status(500).json({ error: "Database error" });
      }
    }
  });

  // Auth: Login
  app.post("/api/auth/login", async (req, res) => {
    const { email, password } = req.body;

    if (supabase) {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .eq("password", password)
        .single();
      
      if (error || !data) return res.status(401).json({ error: "Invalid credentials" });
      return res.json({ id: data.id, name: data.name, email: data.email, role: data.role });
    }

    const stmt = db.prepare("SELECT * FROM users WHERE email = ? AND password = ?");
    const user = stmt.get(email, password) as any;
    
    if (user) {
      res.json({ id: user.id, name: user.name, email: user.email, role: user.role });
    } else {
      res.status(401).json({ error: "Invalid credentials" });
    }
  });

  // Auth: Forgot Password (Simulated)
  app.post("/api/auth/forgot-password", async (req, res) => {
    const { email } = req.body;

    if (supabase) {
      const { data } = await supabase.from("users").select("id").eq("email", email).single();
      if (data) return res.json({ success: true, message: "Link de recuperação enviado para o seu email." });
      return res.status(404).json({ error: "Utilizador não encontrado." });
    }

    const stmt = db.prepare("SELECT * FROM users WHERE email = ?");
    const user = stmt.get(email) as any;
    
    if (user) {
      res.json({ success: true, message: "Link de recuperação enviado para o seu email." });
    } else {
      res.status(404).json({ error: "Utilizador não encontrado." });
    }
  });

  // Auth: Reset Password (Simulated)
  app.post("/api/auth/reset-password", async (req, res) => {
    const { email, newPassword } = req.body;

    if (supabase) {
      const { error } = await supabase.from("users").update({ password: newPassword }).eq("email", email);
      if (error) return res.status(500).json({ error: "Erro ao repor a palavra-passe." });
      return res.json({ success: true });
    }

    try {
      const stmt = db.prepare("UPDATE users SET password = ? WHERE email = ?");
      const result = stmt.run(newPassword, email);
      if (result.changes > 0) {
        res.json({ success: true });
      } else {
        res.status(404).json({ error: "Utilizador não encontrado." });
      }
    } catch (error) {
      res.status(500).json({ error: "Erro ao repor a palavra-passe." });
    }
  });

  // Users: Update
  app.put("/api/users/:id", async (req, res) => {
    const { id } = req.params;
    const { name, email, role, password } = req.body;

    if (supabase) {
      const updateData: any = { name, email, role };
      if (password) updateData.password = password;
      
      const { error } = await supabase.from("users").update(updateData).eq("id", id);
      if (error) {
        if (error.code === "23505") return res.status(400).json({ error: "Email already exists" });
        return res.status(500).json({ error: "Failed to update user" });
      }
      return res.json({ success: true });
    }

    try {
      if (password) {
        const stmt = db.prepare("UPDATE users SET name = ?, email = ?, role = ?, password = ? WHERE id = ?");
        stmt.run(name, email, role, password, id);
      } else {
        const stmt = db.prepare("UPDATE users SET name = ?, email = ?, role = ? WHERE id = ?");
        stmt.run(name, email, role, id);
      }
      res.json({ success: true });
    } catch (error: any) {
      if (error.code === "SQLITE_CONSTRAINT_UNIQUE") {
        res.status(400).json({ error: "Email already exists" });
      } else {
        res.status(500).json({ error: "Failed to update user" });
      }
    }
  });

  // Companies: Save
  app.post("/api/companies", async (req, res) => {
    const { userId, companyId, name, nif, sector, size, location, gps, isClient, fullData } = req.body;
    const qual = fullData.qualificacao_eplan;

    if (supabase) {
      const { error } = await supabase.from("companies").insert([{
        id: companyId,
        user_id: userId,
        name,
        nif,
        sector,
        size,
        location,
        gps: gps ? JSON.stringify(gps) : null,
        especializacao_vertical: qual.especializacao_vertical,
        volume_projetos_anual: qual.volume_projetos_anual,
        maturidade_workflow: qual.maturidade_workflow,
        integracao_digital: qual.integracao_digital,
        presenca_cadeia_valor: qual.presenca_cadeia_valor,
        is_client: isClient ? 1 : 0,
        full_data: fullData
      }]);
      if (error) {
        console.error("Supabase error:", error);
        return res.status(500).json({ error: "Failed to save company" });
      }
      return res.json({ success: true });
    }

    try {
      const stmt = db.prepare(`
        INSERT INTO companies (
          id, user_id, name, nif, sector, size, location, gps,
          especializacao_vertical, volume_projetos_anual, maturidade_workflow, 
          integracao_digital, presenca_cadeia_valor, is_client, full_data
        )
        VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
      `);
      stmt.run(
        companyId, 
        userId, 
        name, 
        nif, 
        sector, 
        size, 
        location,
        gps ? JSON.stringify(gps) : null,
        qual.especializacao_vertical,
        qual.volume_projetos_anual,
        qual.maturidade_workflow,
        qual.integracao_digital,
        qual.presenca_cadeia_valor,
        isClient ? 1 : 0,
        JSON.stringify(fullData)
      );
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to save company" });
    }
  });

  // Companies: Get by User
  app.get("/api/companies/:userId", async (req, res) => {
    const { userId } = req.params;

    if (supabase) {
      const { data, error } = await supabase
        .from("companies")
        .select("*")
        .eq("user_id", userId)
        .order("created_at", { ascending: false });
      
      if (error) return res.status(500).json({ error: "Failed to fetch companies" });
      
      const formatted = data.map(c => ({
        id: c.id,
        name: c.name,
        nif: c.nif,
        sector: c.sector,
        size: c.size,
        location: c.location,
        gps: c.gps ? JSON.parse(c.gps) : null,
        isClient: c.is_client === 1 || c.is_client === true,
        fullData: c.full_data,
        createdAt: c.created_at
      }));
      return res.json(formatted);
    }

    try {
      const stmt = db.prepare("SELECT * FROM companies WHERE user_id = ? ORDER BY created_at DESC");
      const companies = stmt.all(userId) as any[];
      
      const formatted = companies.map(c => ({
        id: c.id,
        name: c.name,
        nif: c.nif,
        sector: c.sector,
        size: c.size,
        location: c.location,
        gps: c.gps ? JSON.parse(c.gps) : null,
        isClient: c.is_client === 1,
        fullData: JSON.parse(c.full_data),
        createdAt: c.created_at
      }));
      
      res.json(formatted);
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch companies" });
    }
  });

  // Companies: Get by ID
  app.get("/api/company/:id", async (req, res) => {
    const { id } = req.params;

    if (supabase) {
      const { data, error } = await supabase.from("companies").select("*").eq("id", id).single();
      if (error || !data) return res.status(404).json({ error: "Company not found" });
      
      return res.json({
        id: data.id,
        name: data.name,
        nif: data.nif,
        sector: data.sector,
        size: data.size,
        location: data.location,
        gps: data.gps ? JSON.parse(data.gps) : null,
        isClient: data.is_client === 1 || data.is_client === true,
        fullData: data.full_data,
        createdAt: data.created_at
      });
    }

    try {
      const stmt = db.prepare("SELECT * FROM companies WHERE id = ?");
      const company = stmt.get(id) as any;
      
      if (company) {
        res.json({
          id: company.id,
          name: company.name,
          nif: company.nif,
          sector: company.sector,
          size: company.size,
          location: company.location,
          gps: company.gps ? JSON.parse(company.gps) : null,
          isClient: company.is_client === 1,
          fullData: JSON.parse(company.full_data),
          createdAt: company.created_at
        });
      } else {
        res.status(404).json({ error: "Company not found" });
      }
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to fetch company" });
    }
  });

  // Companies: Update GPS
  app.patch("/api/company/:id/gps", async (req, res) => {
    const { id } = req.params;
    const { gps } = req.body;

    if (!gps) return res.status(400).json({ error: "GPS coordinates are required" });

    if (supabase) {
      const { error } = await supabase
        .from("companies")
        .update({ gps: JSON.stringify(gps) })
        .eq("id", id);
      
      if (error) return res.status(500).json({ error: "Failed to update GPS" });
      return res.json({ success: true });
    }

    try {
      const stmt = db.prepare("UPDATE companies SET gps = ? WHERE id = ?");
      stmt.run(JSON.stringify(gps), id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update GPS" });
    }
  });

  // Companies: Update Full Data
  app.put("/api/company/:id", async (req, res) => {
    const { id } = req.params;
    const { name, nif, sector, size, location, gps, isClient, fullData } = req.body;
    
    if (!fullData) return res.status(400).json({ error: "Full data is required" });
    
    const qual = fullData.qualificacao_eplan;

    if (supabase) {
      const { error } = await supabase
        .from("companies")
        .update({
          name,
          nif,
          sector,
          size,
          location,
          gps: gps ? JSON.stringify(gps) : null,
          especializacao_vertical: qual.especializacao_vertical,
          volume_projetos_anual: qual.volume_projetos_anual,
          maturidade_workflow: qual.maturidade_workflow,
          integracao_digital: qual.integracao_digital,
          presenca_cadeia_valor: qual.presenca_cadeia_valor,
          is_client: isClient ? 1 : 0,
          full_data: fullData
        })
        .eq("id", id);
      
      if (error) return res.status(500).json({ error: "Failed to update company" });
      return res.json({ success: true });
    }

    try {
      const stmt = db.prepare(`
        UPDATE companies SET 
          name = ?, nif = ?, sector = ?, size = ?, location = ?, gps = ?,
          especializacao_vertical = ?, volume_projetos_anual = ?, maturidade_workflow = ?, 
          integracao_digital = ?, presenca_cadeia_valor = ?, is_client = ?, full_data = ?
        WHERE id = ?
      `);
      stmt.run(
        name, nif, sector, size, location, gps ? JSON.stringify(gps) : null,
        qual.especializacao_vertical, qual.volume_projetos_anual, qual.maturidade_workflow,
        qual.integracao_digital, qual.presenca_cadeia_valor, isClient ? 1 : 0, JSON.stringify(fullData),
        id
      );
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to update company" });
    }
  });

  // Companies: Delete
  app.delete("/api/company/:id", async (req, res) => {
    const { id } = req.params;

    if (supabase) {
      const { error } = await supabase.from("companies").delete().eq("id", id);
      if (error) return res.status(500).json({ error: "Failed to delete company" });
      return res.json({ success: true });
    }

    try {
      const stmt = db.prepare("DELETE FROM companies WHERE id = ?");
      stmt.run(id);
      res.json({ success: true });
    } catch (error) {
      console.error(error);
      res.status(500).json({ error: "Failed to delete company" });
    }
  });

  // Admin: Migrate existing data to new columns
  app.post("/api/admin/migrate-data", async (req, res) => {
    try {
      let companies: any[] = [];
      
      if (supabase) {
        const { data, error } = await supabase.from("companies").select("*");
        if (error) throw error;
        companies = data || [];
      } else {
        companies = db.prepare("SELECT * FROM companies").all();
      }

      let updatedCount = 0;

      for (const company of companies) {
        const fullData = typeof company.full_data === 'string' 
          ? JSON.parse(company.full_data) 
          : company.full_data;
        
        const qual = fullData?.qualificacao_eplan;
        if (!qual) continue;

        const updateObj = {
          especializacao_vertical: qual.especializacao_vertical || null,
          volume_projetos_anual: qual.volume_projetos_anual || null,
          maturidade_workflow: qual.maturidade_workflow || null,
          integracao_digital: qual.integracao_digital || null,
          presenca_cadeia_valor: qual.presenca_cadeia_valor || null
        };

        if (supabase) {
          const { error } = await supabase.from("companies").update(updateObj).eq("id", company.id);
          if (error) console.error(`Failed to migrate company ${company.id}:`, error);
          else updatedCount++;
        } else {
          const stmt = db.prepare(`
            UPDATE companies SET 
              especializacao_vertical = ?, 
              volume_projetos_anual = ?, 
              maturidade_workflow = ?, 
              integracao_digital = ?, 
              presenca_cadeia_valor = ?
            WHERE id = ?
          `);
          stmt.run(
            updateObj.especializacao_vertical,
            updateObj.volume_projetos_anual,
            updateObj.maturidade_workflow,
            updateObj.integracao_digital,
            updateObj.presenca_cadeia_valor,
            company.id
          );
          updatedCount++;
        }
      }

      res.json({ success: true, message: `Migração concluída. ${updatedCount} empresas atualizadas.` });
    } catch (error: any) {
      console.error("Migration error:", error);
      res.status(500).json({ error: "Erro durante a migração: " + error.message });
    }
  });

  // Vite middleware for development
  if (process.env.NODE_ENV !== "production") {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: "spa",
    });
    app.use(vite.middlewares);
  } else {
    app.use(express.static(path.join(__dirname, "dist")));
    app.get("*", (req, res) => {
      res.sendFile(path.join(__dirname, "dist", "index.html"));
    });
  }

  app.listen(PORT, "0.0.0.0", () => {
    console.log(`Server running on http://localhost:${PORT}`);
  });
}

startServer();
