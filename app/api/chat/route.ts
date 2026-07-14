import { NextResponse } from "next/server";
import fs from "fs/promises";
import path from "path";
import { exec } from "child_process";
import { promisify } from "util";

const execAsync = promisify(exec);

// ⚠️ Dossier dans lequel Hety a le droit d'écrire / d'exécuter des commandes.
const WORKSPACE_DIR = process.cwd();

// ---------- Sécurité : empêche de sortir du workspace ----------
function safePath(relPath: string): string {
  const full = path.normalize(path.join(WORKSPACE_DIR, relPath));
  if (!full.startsWith(WORKSPACE_DIR)) {
    throw new Error(`Chemin interdit : ${relPath}`);
  }
  return full;
}

// ---------- Les vrais outils ----------
async function writeFile(relPath: string, content: string) {
  const full = safePath(relPath);
  await fs.mkdir(path.dirname(full), { recursive: true });
  await fs.writeFile(full, content, "utf-8");
  return `Fichier écrit : ${relPath} (${content.length} caractères)`;
}

async function readFile(relPath: string) {
  const full = safePath(relPath);
  try {
    return await fs.readFile(full, "utf-8");
  } catch {
    return `ERREUR : ${relPath} n'existe pas`;
  }
}

async function listFiles(relDir: string = ".") {
  const full = safePath(relDir);
  const ignore = new Set(["node_modules", ".next", ".git"]);
  const out: string[] = [];
  async function walk(dir: string) {
    const entries = await fs.readdir(dir, { withFileTypes: true });
    for (const entry of entries) {
      if (ignore.has(entry.name)) continue;
      const fullEntry = path.join(dir, entry.name);
      if (entry.isDirectory()) {
        await walk(fullEntry);
      } else {
        out.push(path.relative(WORKSPACE_DIR, fullEntry));
      }
    }
  }
  await walk(full);
  return out.join("\n") || "(dossier vide)";
}

async function runCommand(command: string) {
  try {
    const { stdout, stderr } = await execAsync(command, {
      cwd: WORKSPACE_DIR,
      timeout: 60_000,
      maxBuffer: 1024 * 1024,
    });
    return `stdout:\n${stdout}\nstderr:\n${stderr}`;
  } catch (err: any) {
    return `ERREUR (exit ${err.code}):\n${err.stdout || ""}\n${err.stderr || err.message}`;
  }
}

const TOOL_FUNCTIONS: Record<string, (...args: any[]) => Promise<string>> = {
  write_file: (args) => writeFile(args.path, args.content),
  read_file: (args) => readFile(args.path),
  list_files: (args) => listFiles(args.directory ?? "."),
  run_command: (args) => runCommand(args.command),
};

const TOOLS = [
  {
    type: "function",
    function: {
      name: "write_file",
      description: "Crée ou remplace un fichier avec le contenu donné (chemin relatif au projet).",
      parameters: {
        type: "object",
        properties: {
          path: { type: "string" },
          content: { type: "string" },
        },
        required: ["path", "content"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "read_file",
      description: "Lit le contenu d'un fichier existant du projet.",
      parameters: {
        type: "object",
        properties: { path: { type: "string" } },
        required: ["path"],
      },
    },
  },
  {
    type: "function",
    function: {
      name: "list_files",
      description: "Liste les fichiers du projet (ou d'un sous-dossier).",
      parameters: {
        type: "object",
        properties: { directory: { type: "string" } },
      },
    },
  },
  {
    type: "function",
    function: {
      name: "run_command",
      description: "Exécute une commande shell dans le dossier du projet (npm install, npm run build, node script.js, etc.).",
      parameters: {
        type: "object",
        properties: { command: { type: "string" } },
        required: ["command"],
      },
    },
  },
];

const SYSTEM_PROMPT = `Tu es Hety, l'IA d'élite créée par Hugo GALMICHE. Tu es un agent codeur.
Quand on te demande de coder quelque chose, tu DOIS utiliser les outils (write_file, read_file, list_files, run_command)
pour créer de vrais fichiers, un par un. Ne mets JAMAIS de code dans ta réponse texte : le code va dans des fichiers réels via write_file.
Vérifie ton travail avec run_command quand c'est pertinent (ex: node fichier.js, npm run build).
Réponds en français.`;

export async function POST(req: Request) {
  try {
    const { messages, fileName } = await req.json();

    const chatMessages: any[] = [
      { role: "system", content: SYSTEM_PROMPT },
      ...messages,
    ];

    if (fileName) {
      chatMessages.push({
        role: "user",
        content: `[FICHIER ATTACHÉ : ${fileName}]`,
      });
    }

    const actionsLog: string[] = [];
    let finalText = "";
    
    // Consigne de codage propre
    chatMessages.unshift({ 
      role: "system", 
      content: "Tu es un assistant développeur expert. Quand tu écris du code, tu as l'INTERDICTION ABSOLUE de tout écrire attaché sur une seule ligne. Tu DOIS obligatoirement sauter des lignes, faire des indentations propres, et entourer ton code avec les balises de code Markdown de ton choix." 
    });

    // ---- Boucle d'agent : jusqu'à 15 aller-retours avec les outils ----
    for (let turn = 0; turn < 15; turn++) {
      
      // OPTION A : Version Pollinations GRATUITE (avec le modèle "openai" qui supporte les outils)
      const response = await fetch("https://text.pollinations.ai/openai", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          model: "openai", // Remplacement de "kimi" par "openai" pour activer le support des outils
          messages: chatMessages,
          tools: TOOLS,
          tool_choice: "auto",
        }),
      });

      /* 
      // OPTION B : Si tu as payé et veux utiliser TA propre clé OpenAI, commente l'Option A et décommente celle-ci :
      const response = await fetch("https://api.openai.com/v1/chat/completions", {
        method: "POST",
        headers: { 
          "Content-Type": "application/json",
          "Authorization": `Bearer ${process.env.OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: chatMessages,
          tools: TOOLS,
          tool_choice: "auto",
        }),
      });
      */

      const data = await response.json();
      const message = data.choices?.[0]?.message;
      console.log("Réponse modèle:", JSON.stringify(message, null, 2));

      if (!message) {
        return NextResponse.json(
          { content: "Hety : réponse invalide de l'API." },
          { status: 500 }
        );
      }

      chatMessages.push(message);

      // Pas d'appel d'outil -> l'IA a fini, on renvoie sa réponse texte
      if (!message.tool_calls || message.tool_calls.length === 0) {
        finalText = message.content ?? "";
        break;
      }

      // Exécute chaque outil demandé, un par un
      for (const call of message.tool_calls) {
        const func = TOOL_FUNCTIONS[call.function.name];
        let result: string;
        try {
          const args = JSON.parse(call.function.arguments);
          result = func ? await func(args) : `Outil inconnu : ${call.function.name}`;
        } catch (e: any) {
          result = `ERREUR : ${e.message}`;
        }
        actionsLog.push(`${call.function.name}(${call.function.arguments}) -> ${result.slice(0, 200)}`);

        chatMessages.push({
          role: "tool",
          tool_call_id: call.id,
          content: result,
        });
      }
    }

    const summary = actionsLog.length
      ? `\n\n---\n🔧 Actions effectuées :\n${actionsLog.join("\n")}`
      : "";

    return NextResponse.json({ content: finalText + summary });
  } catch (error) {
    console.error(error);
    return NextResponse.json(
      { content: "Hety : Erreur de flux." },
      { status: 500 }
    );
  }
}