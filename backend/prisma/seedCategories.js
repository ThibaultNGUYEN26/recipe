import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function seedCategories() {
  console.log("🌱 Seeding categories...");

  const categories = [
    { slug: "cakes", label: "Gâteaux & Desserts" },
    { slug: "main-dishes", label: "Plats principaux" },
    { slug: "appetizers", label: "Entrées" },
    { slug: "drinks", label: "Boissons" },
    { slug: "breakfast", label: "Petit-déjeuner" },
    { slug: "snacks", label: "En-cas" },
  ];

  for (const category of categories) {
    await prisma.category.upsert({
      where: { slug: category.slug },
      update: {
        label: category.label,
      },
      create: category,
    });

    console.log(`  ✅ ${category.slug}`);
  }

  console.log("✅ Categories seeded");
}

seedCategories()
  .catch(console.error)
  .finally(() => prisma.$disconnect());
