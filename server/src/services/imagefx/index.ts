import crypto from "crypto";

const DefaultHeader = {
  Origin: "https://labs.google",
  "content-type": "application/json",
  Referer: "https://labs.google/fx/tools/image-fx"
};

export class ImageFXError extends Error {
  code: number | undefined;
  constructor(message: string, code?: number) { super(message); this.name = "ImageFXError"; this.code = code; }
}

export class Account {
  cookie: string; user: any = null; token: string | null = null; tokenExpiry: Date | null = null;
  constructor(cookie: string) { if (!cookie?.trim()) throw new ImageFXError("Cookie obrigatório"); this.cookie = cookie; }

  async refreshSession() {
    if (!this.token || !this.tokenExpiry || this.tokenExpiry <= new Date(Date.now() + 30000)) {
      const session: any = await this.fetchSession();
      if (!session?.access_token || !session?.expires) throw new ImageFXError("Sessão inválida. Atualize o cookie.");
      this.user = session.user; this.token = session.access_token; this.tokenExpiry = new Date(session.expires);
    }
  }

  getAuthHeaders() {
    if (!this.token) throw new ImageFXError("Token ausente");
    return { ...DefaultHeader, Cookie: this.cookie, Authorization: "Bearer " + this.token };
  }

  async fetchSession() {
    const res = await fetch("https://labs.google/fx/api/auth/session", {
      headers: { Origin: "https://labs.google", Referer: "https://labs.google/fx/tools/image-fx", Cookie: this.cookie }
    });
    if (!res.ok) {
      if ([401, 403].includes(res.status)) throw new ImageFXError("Cookie expirado ou inválido. Atualize nas Configurações.", res.status);
      throw new ImageFXError(`Erro ${res.status}`, res.status);
    }
    return res.json();
  }
}

export class ImageFX {
  account: Account;
  constructor(cookie: string) { this.account = new Account(cookie); }

  async generate(promptText: string, options: { aspectRatio?: string; numberOfImages?: number } = {}) {
    await this.account.refreshSession();

    const payload = {
      userInput: { candidatesCount: options.numberOfImages || 1, prompts: [promptText], seed: Math.floor(Math.random() * 2147483647) },
      clientContext: { sessionId: `${Date.now()}-${crypto.randomBytes(8).toString("hex")}`, tool: "IMAGE_FX" },
      modelInput: { modelNameType: "IMAGEN_3_5" },
      aspectRatio: options.aspectRatio || "IMAGE_ASPECT_RATIO_LANDSCAPE"
    };

    const res = await fetch("https://aisandbox-pa.googleapis.com/v1:runImageFx", {
      method: "POST", body: JSON.stringify(payload), headers: this.account.getAuthHeaders()
    });

    if (!res.ok) {
      const errText = await res.text();
      const msg = this.parseError(errText, res.status);
      throw new ImageFXError(msg, res.status);
    }

    const json = await res.json() as any;
    const images = json?.imagePanels?.[0]?.generatedImages;
    if (!images?.length) throw new ImageFXError("Nenhuma imagem gerada");

    return images.map((img: any) => ({
      base64: img.encodedImage,
      url: `data:image/png;base64,${img.encodedImage}`,
      seed: img.seed,
      mediaId: img.mediaGenerationId
    }));
  }

  parseError(text: string, status: number): string {
    try {
      const json = JSON.parse(text);
      const reason = json?.error?.details?.[0]?.reason;
      if (reason === "PUBLIC_ERROR_UNSAFE_GENERATION") return "Prompt bloqueado: conteúdo inseguro";
      if (reason === "PUBLIC_ERROR_PROMINENT_PEOPLE_FILTER_FAILED") return "Prompt bloqueado: pessoas famosas";
      if (reason?.includes("QUALITY") || reason?.includes("AESTHETIC")) return "Prompt bloqueado: qualidade baixa";
      return json?.error?.message || `Erro ${status}`;
    } catch { return status === 429 ? "Limite de requisições atingido. Aguarde." : `Erro ${status}: ${text.slice(0, 200)}`; }
  }
}
