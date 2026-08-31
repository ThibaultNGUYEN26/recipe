import { describe, expect, it, vi } from "vitest";
import { captionToRecipeDraft, fetchTikTokImport, resolveTikTokUrl, validateTikTokUrl } from "../lib/tiktokImport.js";

describe("TikTok recipe import", () => {
  it("accepts official TikTok video and short-link hosts only", () => {
    expect(validateTikTokUrl("https://www.tiktok.com/@chef/video/123?x=1#comments")).toBe("https://www.tiktok.com/@chef/video/123?x=1");
    expect(validateTikTokUrl("https://vm.tiktok.com/ZM123/ ")).toBe("https://vm.tiktok.com/ZM123/");
    expect(validateTikTokUrl("https://tiktok.com.evil.example/@chef/video/123")).toBeNull();
    expect(validateTikTokUrl("http://www.tiktok.com/@chef/video/123")).toBeNull();
    expect(validateTikTokUrl("Check this recipe https://www.tiktok.com/@chef/video/123?is_from_webapp=1 copied from TikTok")).toBe("https://www.tiktok.com/@chef/video/123?is_from_webapp=1");
  });

  it("expands short links and removes disposable tracking parameters", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      headers: new Headers({ location: "https://www.tiktok.com/@chef/video/123?_t=abc&is_from_webapp=1" }),
    });
    await expect(resolveTikTokUrl("https://vm.tiktok.com/ZM123/", fetchImpl)).resolves.toBe("https://www.tiktok.com/@chef/video/123");
    expect(fetchImpl).toHaveBeenCalledWith("https://vm.tiktok.com/ZM123/", expect.objectContaining({ method: "HEAD", redirect: "manual" }));
  });

  it("extracts editable ingredients and steps from a structured caption", () => {
    const draft = captionToRecipeDraft(`Creamy tomato pasta\nIngredients:\n- 200 g pasta\n- 2 tbsp olive oil\nInstructions:\n1. Boil the pasta\n2. Stir in the sauce`);
    expect(draft.title).toBe("Creamy tomato pasta");
    expect(draft.ingredients).toEqual([
      { amount: "200", unit: "g", name: "pasta" },
      { amount: "2", unit: "tbsp", name: "olive oil" },
    ]);
    expect(draft.instructions).toEqual([
      { step: 1, text: "Boil the pasta" },
      { step: 2, text: "Stir in the sauce" },
    ]);
    expect(draft.description).toBe("");
    expect(draft.warnings).toEqual([]);
  });

  it("keeps introductory prose without duplicating parsed recipe sections", () => {
    const draft = captionToRecipeDraft(`Lemon pasta\nA bright dinner for warm evenings.\nIngredients:\n- 200 g pasta\n- 1 lemon\nInstructions:\n1. Boil the pasta\n2. Add the lemon`);

    expect(draft.title).toBe("Lemon pasta");
    expect(draft.description).toBe("A bright dinner for warm evenings.");
    expect(draft.description).not.toMatch(/200 g pasta|Boil the pasta/);
  });

  it("returns an editable partial draft instead of inventing missing details", () => {
    const draft = captionToRecipeDraft("My easiest weeknight pasta #dinner");
    expect(draft.title).toBe("My easiest weeknight pasta");
    expect(draft.description).toBe("My easiest weeknight pasta #dinner");
    expect(draft.ingredients).toEqual([]);
    expect(draft.instructions).toEqual([]);
    expect(draft.warnings).toHaveLength(2);
  });

  it("extracts a dense one-paragraph TikTok recipe caption", () => {
    const caption = "Creamy pasta recipe 🍝✨  1/2 onion 2 cloves fresh garlic 3 tbsp tomato paste 1 1/4 cup heavy cream 1/3 cup shredded mozzarella Salt, pepper, paprika to taste 1 tsp chicken bouillon powder (optional) Parsley In a pan, add oil and fry the onion and garlic until softened. Then add the tomato paste and heavy cream, mix well. Next, add the spices and stir well. Add the pasta and mozzarella cheese. Top with parsley. 👀 Add the mozzarella cheese little by little. I suggest cooking on medium low heat so the cheese melts slowly and the sauce doesn’t get thick. You can also add a little pasta water to help make the sauce extra creamy.  #creamypasta #pasta #easyrecipe";
    const draft = captionToRecipeDraft(caption);

    expect(draft.title).toBe("Creamy pasta recipe 🍝✨");
    expect(draft.ingredients).toEqual([
      { amount: "1/2", unit: "", name: "onion" },
      { amount: "2", unit: "", name: "cloves fresh garlic" },
      { amount: "3", unit: "tbsp", name: "tomato paste" },
      { amount: "1 1/4", unit: "cup", name: "heavy cream" },
      { amount: "1/3", unit: "cup", name: "shredded mozzarella" },
      { amount: "", unit: "", name: "Salt, pepper, paprika to taste" },
      { amount: "1", unit: "tsp", name: "chicken bouillon powder (optional)" },
      { amount: "", unit: "", name: "Parsley" },
    ]);
    expect(draft.instructions).toHaveLength(5);
    expect(draft.instructions[0].text).toBe("In a pan, add oil and fry the onion and garlic until softened.");
    expect(draft.tips).toHaveLength(3);
    expect(draft.tags).toEqual(["creamypasta", "pasta", "easyrecipe"]);
    expect(draft.description).toBe("");
    expect(draft.warnings).toEqual([]);
  });

  it("loads official oEmbed metadata without downloading the TikTok video", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({
      ok: true,
      json: async () => ({ title: "Lemon pasta", author_name: "Chef Ana", author_url: "https://www.tiktok.com/@ana", thumbnail_url: "https://cdn.example/cover.jpg" }),
    });
    const result = await fetchTikTokImport("https://www.tiktok.com/@ana/video/42", fetchImpl);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(String(fetchImpl.mock.calls[0][0])).toContain("https://www.tiktok.com/oembed");
    expect(result.source).toMatchObject({ platform: "tiktok", author: "Chef Ana" });
    expect(result.draft.title).toBe("Lemon pasta");
  });

  it("extracts inline French sections from a TikTok caption", () => {
    const caption = "Mon iconic banana bread 🍌 👉🏻Ingrédients : 3 bananes (2 pour la pâte, 1 pour la déco) 2 œufs 2 petits suisses (ou 120g de yaourt nature) pour le moelleux Arôme vanille ou 1 sachet de sucre vanillé 180g de farine 1 sachet de levure chimique 1 grosse pincée de sel 1 grosse pincée de cannelle Environ 40 ml de lait (à ajuster selon la texture) Gros morceaux de chocolat noir Optionnel : sucrant au choix (j’ajoute parfois 1 c. à soupe de miel) Beurre de cacahuète (facultatif, pour le topping) 👉🏻Préparation : Écrasez les 2 bananes dans un saladier. Ajoutez les œufs et mélangez bien. 👉🏻Avant d’enfourner : Déposez la banane restante sur le dessus. 👉🏻Cuisson : Enfournez à 180°C pendant environ 30 minutes. #bananabread #recette";
    const draft = captionToRecipeDraft(caption);

    expect(draft.title).toBe("Mon iconic banana bread 🍌");
    expect(draft.ingredients).toHaveLength(12);
    expect(draft.ingredients).toEqual(expect.arrayContaining([
      { amount: "3", unit: "", name: "bananes (2 pour la pâte, 1 pour la déco)" },
      { amount: "180", unit: "g", name: "de farine" },
      { amount: "40", unit: "ml", name: "de lait (à ajuster selon la texture)" },
      { amount: "", unit: "", name: "Arôme vanille ou 1 sachet de sucre vanillé" },
      { amount: "", unit: "", name: "Beurre de cacahuète (facultatif, pour le topping)" },
    ]));
    expect(draft.instructions).toHaveLength(4);
    expect(draft.instructions[0].text).toBe("Écrasez les 2 bananes dans un saladier.");
    expect(draft.instructions[3].text).toBe("Enfournez à 180°C pendant environ 30 minutes.");
    expect(draft.description).toBe("");
    expect(draft.warnings).toEqual([]);
  });

  it("keeps a valid source connected when oEmbed is temporarily unavailable", async () => {
    const fetchImpl = vi.fn().mockResolvedValue({ ok: false, status: 503 });
    const result = await fetchTikTokImport("https://www.tiktok.com/@ana/video/42", fetchImpl);
    expect(result.source.url).toBe("https://www.tiktok.com/@ana/video/42");
    expect(result.draft.warnings[0]).toMatch(/temporarily unavailable/);
  });
});
