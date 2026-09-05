import { PrismaClient, type Prisma } from "@prisma/client";
import { hashPassword } from "../src/lib/password";
import { assertDisposableDatabase, readSeedSafetyConfig } from "../scripts/postgresql-test-safety.cjs";

let prisma: PrismaClient;

function createSyntheticPhone(sequence: number): string {
  return `09${String(sequence).padStart(9, "0")}`;
}

function getSeedPassword(): string {
  const password = process.env.SEED_DEFAULT_PASSWORD?.trim();
  const normalizedPassword = password?.toLowerCase() || "";
  const isKnownUnsafeDefault =
    normalizedPassword === "123456" ||
    normalizedPassword === "password" ||
    normalizedPassword === "devadmin#2026" ||
    normalizedPassword === "changeme";

  if (!password || password.length < 12 || isKnownUnsafeDefault) {
    throw new Error(
      "SEED_DEFAULT_PASSWORD باید در فایل محیط محلی با یک رمز منحصربه‌فرد حداقل ۱۲ نویسه‌ای تنظیم شود."
    );
  }

  return password;
}

async function clearSeedData(client: Prisma.TransactionClient) {
  await client.auditLog.deleteMany();
  await client.notification.deleteMany();
  await client.automationRule.deleteMany();
  await client.installment.deleteMany();
  await client.payment.deleteMany();
  await client.orderItem.deleteMany();
  await client.order.deleteMany();
  await client.followUp.deleteMany();
  await client.deal.deleteMany();
  await client.inventoryMovement.deleteMany();
  await client.productVariant.deleteMany();
  await client.product.deleteMany();
  await client.carpetNeedProfile.deleteMany();
  await client.lead.deleteMany();
  await client.customer.deleteMany();
  await client.user.deleteMany();
}

async function main() {
  const environment = { ...process.env };
  const localSqlite = !environment.POSTGRES_TEST_DATABASE_URL &&
    environment.DATABASE_URL?.startsWith("file:");
  const initialPassword = getSeedPassword();

  if (localSqlite) {
    if (!["development", "test"].includes(environment.NODE_ENV || "development")) {
      throw new Error("SQLite seed is allowed only in local development/test.");
    }
    prisma = new PrismaClient({ datasourceUrl: environment.DATABASE_URL });
    // A PostgreSQL-generated Client cannot enter cleanup by claiming a file URL.
    await prisma.$queryRawUnsafe("PRAGMA database_list");
    await clearSeedData(prisma);
  } else {
    const { url } = readSeedSafetyConfig(environment);
    // Never use the ordinary application DATABASE_URL for PostgreSQL seed.
    prisma = new PrismaClient({ datasourceUrl: url });
    await prisma.$transaction(async tx => {
      await assertDisposableDatabase(tx, environment);
      // Marker remains locked through cleanup; no cached runner authorization.
      await clearSeedData(tx);
    }, { maxWait: 30_000, timeout: 60_000 });
  }

  console.log("🌱 شروع ایجاد داده‌های اولیه سامانه فروش و CRM فرش...");

  // 2. Create Users
  const defaultPasswordHash = await hashPassword(initialPassword);

  const admin = await prisma.user.create({
    data: {
      name: "مدیر ارشد آزمایشی",
      email: "admin@example.invalid",
      phone: createSyntheticPhone(1),
      passwordHash: defaultPasswordHash,
      role: "ADMIN",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "مدیر فروش آزمایشی",
      email: "manager@example.invalid",
      phone: createSyntheticPhone(2),
      passwordHash: defaultPasswordHash,
      role: "SALES_MANAGER",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    },
  });

  const rep1 = await prisma.user.create({
    data: {
      name: "کارشناس فروش آزمایشی ۱",
      email: "rep1@example.invalid",
      phone: createSyntheticPhone(3),
      passwordHash: defaultPasswordHash,
      role: "SALES_REP",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    },
  });

  const rep2 = await prisma.user.create({
    data: {
      name: "کارشناس فروش آزمایشی ۲",
      email: "rep2@example.invalid",
      phone: createSyntheticPhone(4),
      passwordHash: defaultPasswordHash,
      role: "SALES_REP",
      avatar: "https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80",
    },
  });

  const allReps = [rep1, rep2, manager];

  console.log("✅ ۴ کاربر سازمانی با نقش‌های ADMIN, SALES_MANAGER, SALES_REP ایجاد شدند.");

  // 3. Create Carpet Products & Variants
  const carpetData = [
    {
      code: "CRP-101",
      name: "فرش لچک ترنج اصفهان شاه‌عباسی",
      pattern: "شاه‌عباسی",
      collection: "اصفهان سلطنتی",
      shane: 1500,
      density: 4500,
      colorCount: 8,
      yarnMaterial: "۱۰۰٪ اکریلیک درالون آلمان هایبالک",
      weavingMachine: "وندویل HCI X3 بلژیک",
      style: "کلاسیک",
      primaryColor: "سرمه‌ای",
      images: [
        "https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=600&auto=format&fit=crop&q=80",
      ],
      description: "طرح اصیل شاه‌عباسی اصفهان با بافت فوق‌ریز ۱۵۰۰ شانه، ضد پرز و حساسیت با لطافت ابریشم‌گونه.",
      variants: [
        { size: "3x4", area: 12, cash: 48000000, inst: 54000000, stock: 8 },
        { size: "2.5x3.5", area: 9, cash: 36000000, inst: 41000000, stock: 12 },
        { size: "2x3", area: 6, cash: 24000000, inst: 27500000, stock: 15 },
        { size: "1.5x2.25", area: 3.37, cash: 14000000, inst: 16000000, stock: 6 },
      ],
    },
    {
      code: "CRP-102",
      name: "فرش افشان اسلیمی کاشان طلاکوب",
      pattern: "افشان",
      collection: "کاشان ممتاز",
      shane: 1200,
      density: 3600,
      colorCount: 10,
      yarnMaterial: "اکریلیک هیت‌ست شده با رگه‌های طلاکوب",
      weavingMachine: "شونهر آلمان",
      style: "نئوکلاسیک",
      primaryColor: "کرم صدفی",
      images: [
        "https://images.unsplash.com/photo-1579656381226-5fc0f0100c3b?w=600&auto=format&fit=crop&q=80",
      ],
      description: "نقشه افشان بدون ترنج مرکزی، مناسب دکوراسیون‌های مدرن و کلاسیک با رنگ‌بندی گرم و روشن.",
      variants: [
        { size: "3x4", area: 12, cash: 38000000, inst: 43000000, stock: 10 },
        { size: "2.5x3.5", area: 9, cash: 29000000, inst: 33000000, stock: 14 },
        { size: "2x3", area: 6, cash: 19000000, inst: 22000000, stock: 20 },
      ],
    },
    {
      code: "CRP-103",
      name: "فرش شکارگاه تبریز سالاری لاکی",
      pattern: "شکارگاه",
      collection: "تبریز سالاری",
      shane: 1500,
      density: 4500,
      colorCount: 12,
      yarnMaterial: "ابریشم بامبو ترکیبی با اکریلیک ترک",
      weavingMachine: "وندویل بلژیک",
      style: "کلاسیک",
      primaryColor: "لاکی زرشکی",
      images: [
        "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=600&auto=format&fit=crop&q=80",
      ],
      description: "اثر ماندگار با طرح سنتی شکارگاه و صحنه‌های حماسی با رنگ لاکی روناسی طبیعی.",
      variants: [
        { size: "3x4", area: 12, cash: 52000000, inst: 59000000, stock: 4 },
        { size: "2.5x3.5", area: 9, cash: 39000000, inst: 45000000, stock: 7 },
        { size: "2x3", area: 6, cash: 26000000, inst: 30000000, stock: 11 },
      ],
    },
    {
      code: "CRP-104",
      name: "فرش مدرن طوسی طلایی کهنه‌نما (وینتیج)",
      pattern: "وینتیج پتینه",
      collection: "مدرن آرت",
      shane: 1200,
      density: 3600,
      colorCount: 8,
      yarnMaterial: "میکرو فیلامنت و نخ ترک ضد حساسیت",
      weavingMachine: "شونهر آلمان",
      style: "مدرن",
      primaryColor: "طوسی نقره‌ای",
      images: [
        "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&auto=format&fit=crop&q=80",
      ],
      description: "طرح پتینه برجسته طلاکوب مدرن با هارمونی طوسی و متالیک، انتخابی ایده‌آل برای منازل لوکس مدرن.",
      variants: [
        { size: "3x4", area: 12, cash: 35000000, inst: 40000000, stock: 9 },
        { size: "2.5x3.5", area: 9, cash: 27000000, inst: 31000000, stock: 16 },
        { size: "2x3", area: 6, cash: 18000000, inst: 21000000, stock: 18 },
        { size: "1x1.5", area: 1.5, cash: 4800000, inst: 5500000, stock: 25 },
      ],
    },
    {
      code: "CRP-105",
      name: "فرش خشتی بختیاری اصیل چند رنگ",
      pattern: "خشتی",
      collection: "عشایری زاگرس",
      shane: 700,
      density: 2550,
      colorCount: 10,
      yarnMaterial: "۱۰۰٪ اکریلیک خالص بدون پرزدهی",
      weavingMachine: "وندویل HCP",
      style: "عشایری",
      primaryColor: "گردویی چندرنگ",
      images: [
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80",
      ],
      description: "نقوش خشت‌های باستانی ایران، گل و مرغ، درخت زندگی با ضخامت بالا و پاخور عالی.",
      variants: [
        { size: "3x4", area: 12, cash: 22000000, inst: 25500000, stock: 12 },
        { size: "2.5x3.5", area: 9, cash: 17000000, inst: 19500000, stock: 15 },
        { size: "2x3", area: 6, cash: 11500000, inst: 13000000, stock: 22 },
        { size: "1x3", area: 3, cash: 6000000, inst: 7000000, stock: 10 },
      ],
    },
    {
      code: "CRP-106",
      name: "فرش نائین ۹ لا گنبدی حاشیه‌دار",
      pattern: "گنبدی ترنج",
      collection: "نائین کویر",
      shane: 1000,
      density: 3000,
      colorCount: 10,
      yarnMaterial: "اکریلیک پشم‌گونه هیت‌ست",
      weavingMachine: "شونهر آلمان",
      style: "کلاسیک",
      primaryColor: "کرم فیروزه‌ای",
      images: [
        "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80",
      ],
      description: "طرح چشم‌نواز مسجد شیخ لطف‌الله اصفهان با تلفیق کرم و فیروزه‌ای اصیل ایرانی.",
      variants: [
        { size: "3x4", area: 12, cash: 31000000, inst: 36000000, stock: 6 },
        { size: "2.5x3.5", area: 9, cash: 24000000, inst: 27500000, stock: 9 },
        { size: "2x3", area: 6, cash: 16000000, inst: 18500000, stock: 14 },
      ],
    },
    {
      code: "CRP-107",
      name: "فرش مدرن اسکاندیناوی مینیمال",
      pattern: "مینیمال ژئومتریک",
      collection: "نوردیک مود",
      shane: 1200,
      density: 3600,
      colorCount: 6,
      yarnMaterial: "سوپر سافت پلی‌استر ترک",
      weavingMachine: "وندویل بلژیک",
      style: "مدرن",
      primaryColor: "کرم طوسی",
      images: [
        "https://images.unsplash.com/photo-1544457070-4cd773b4d71e?w=600&auto=format&fit=crop&q=80",
      ],
      description: "طراحی مدرن مینیمال با خطوط هندسی محو، سازگار با چیدمان‌های مدرن و مینیمالیستی.",
      variants: [
        { size: "2.5x3.5", area: 9, cash: 25000000, inst: 29000000, stock: 8 },
        { size: "2x3", area: 6, cash: 17000000, inst: 19500000, stock: 12 },
        { size: "1.5x2.25", area: 3.37, cash: 10000000, inst: 11500000, stock: 15 },
      ],
    },
    {
      code: "CRP-108",
      name: "فرش ابریشم‌گونه قم طرح محرابی درختی",
      pattern: "محرابی",
      collection: "ابریشم قم",
      shane: 1500,
      density: 4500,
      colorCount: 12,
      yarnMaterial: "۱۰۰٪ ابریشم مصنوعی تنسل",
      weavingMachine: "وندویل HCI",
      style: "کلاسیک",
      primaryColor: "سرمه‌ای طلایی",
      images: [
        "https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=600&auto=format&fit=crop&q=80",
      ],
      description: "ظرافت بی‌مانند مشابه فرش‌های دستباف ۱۰۰ رج قم، دارای درخشش نور با تغییر زاویه دید.",
      variants: [
        { size: "3x4", area: 12, cash: 58000000, inst: 66000000, stock: 3 },
        { size: "2.5x3.5", area: 9, cash: 44000000, inst: 50000000, stock: 5 },
        { size: "2x3", area: 6, cash: 29000000, inst: 33000000, stock: 7 },
      ],
    },
  ];

  const createdProducts = [];
  for (const item of carpetData) {
    const prod = await prisma.product.create({
      data: {
        code: item.code,
        name: item.name,
        pattern: item.pattern,
        collection: item.collection,
        shane: item.shane,
        density: item.density,
        colorCount: item.colorCount,
        yarnMaterial: item.yarnMaterial,
        weavingMachine: item.weavingMachine,
        style: item.style,
        primaryColor: item.primaryColor,
        images: item.images,
        description: item.description,
        variants: {
          create: item.variants.map((v) => ({
            sku: `${item.code}-${v.size.toUpperCase()}`,
            size: v.size,
            areaSquareMeters: v.area,
            cashPrice: v.cash,
            installmentPrice: v.inst,
            stock: v.stock,
            reservedStock: 1,
            soldStock: 3,
          })),
        },
      },
      include: { variants: true },
    });
    createdProducts.push(prod);
  }

  console.log(`✅ ${createdProducts.length} تخته فرش کاتالوگ با تمامی تنوع‌های سایز و قیمت ثبت شد.`);

  // 4. Create explicitly synthetic customers. Never copy real customer data into this file.
  const customerFixtures = [
    { prov: "تهران", city: "تهران", code: "CST-1001" },
    { prov: "اصفهان", city: "اصفهان", code: "CST-1002" },
    { prov: "فارس", city: "شیراز", code: "CST-1003" },
    { prov: "خراسان رضوی", city: "مشهد", code: "CST-1004" },
    { prov: "آذربایجان شرقی", city: "تبریز", code: "CST-1005" },
    { prov: "گیلان", city: "رشت", code: "CST-1006" },
    { prov: "مازندران", city: "ساری", code: "CST-1007" },
    { prov: "قم", city: "قم", code: "CST-1008" },
    { prov: "یزد", city: "یزد", code: "CST-1009" },
    { prov: "البرز", city: "کرج", code: "CST-1010" },
    { prov: "خوزستان", city: "اهواز", code: "CST-1011" },
    { prov: "مرکزی", city: "اراک", code: "CST-1012" },
    { prov: "اصفهان", city: "کاشان", code: "CST-1013" },
    { prov: "تهران", city: "شهریار", code: "CST-1014" },
    { prov: "همدان", city: "همدان", code: "CST-1015" },
  ];

  const createdCustomers = [];
  for (let i = 0; i < customerFixtures.length; i++) {
    const customerFixture = customerFixtures[i];
    const rep = allReps[i % allReps.length];
    const cust = await prisma.customer.create({
      data: {
        code: customerFixture.code,
        firstName: "مشتری",
        lastName: `آزمایشی ${i + 1}`,
        phone: createSyntheticPhone(100 + i),
        province: customerFixture.prov,
        city: customerFixture.city,
        address: `نشانی ساختگی مشتری آزمایشی ${i + 1}`,
        assignedToId: rep.id,
        needProfiles: {
          create: {
            preferredSizes: ["3x4", "2.5x3.5"],
            preferredShane: i % 2 === 0 ? "1200" : "1500",
            preferredDensity: i % 2 === 0 ? "3600" : "4500",
            preferredColors: i % 2 === 0 ? ["سرمه‌ای", "کرم"] : ["طوسی", "لاکی"],
            preferredStyle: i % 3 === 0 ? "مدرن" : "کلاسیک",
            budgetMin: 20000000,
            budgetMax: 60000000,
            quantity: 2,
            paymentPreference: i % 2 === 0 ? "INSTALLMENT" : "CASH",
            spaceType: "پذیرایی بزرگ و نشیمن",
            notes: "علاقه‌مند به طرح‌های ریزبافت بدون پرز با گارانتی ۵ ساله.",
          },
        },
      },
    });
    createdCustomers.push(cust);
  }

  console.log(`✅ ${createdCustomers.length} مشتری با پروفایل نیازسنجی کامل ایجاد شدند.`);

  // 5. Create Leads
  const leadSources = [
    "INSTAGRAM",
    "WHATSAPP",
    "WEBSITE",
    "CALL",
    "REFERRAL",
    "STORE",
  ] as const;

  const leadStatuses = [
    "NEW",
    "CONTACTED",
    "QUALIFIED",
    "NEEDS_ASSESSMENT",
    "PROPOSAL_SENT",
    "NEGOTIATION",
    "DECISION_PENDING",
    "WON",
    "LOST",
  ] as const;

  const leadFixtures = [
    { prov: "تهران", city: "تهران", score: 75, temp: "HOT" as const, budget: 50000000 },
    { prov: "اصفهان", city: "اصفهان", score: 65, temp: "HOT" as const, budget: 35000000 },
    { prov: "فارس", city: "شیراز", score: 45, temp: "WARM" as const, budget: 25000000 },
    { prov: "خراسان رضوی", city: "مشهد", score: 50, temp: "WARM" as const, budget: 40000000 },
    { prov: "آذربایجان شرقی", city: "تبریز", score: 20, temp: "COLD" as const, budget: 20000000 },
    { prov: "گیلان", city: "رشت", score: 80, temp: "HOT" as const, budget: 60000000 },
    { prov: "مازندران", city: "بابل", score: 35, temp: "WARM" as const, budget: 30000000 },
    { prov: "قم", city: "قم", score: 10, temp: "COLD" as const, budget: 15000000 },
    { prov: "یزد", city: "میبد", score: 60, temp: "HOT" as const, budget: 45000000 },
    { prov: "البرز", city: "کرج", score: 40, temp: "WARM" as const, budget: 28000000 },
    { prov: "خوزستان", city: "دزفول", score: 70, temp: "HOT" as const, budget: 55000000 },
    { prov: "مرکزی", city: "ساوه", score: 25, temp: "COLD" as const, budget: 18000000 },
  ];

  const createdLeads = [];
  for (let i = 0; i < leadFixtures.length; i++) {
    const leadFixture = leadFixtures[i];
    const rep = allReps[i % allReps.length];
    const source = leadSources[i % leadSources.length];
    const status = leadStatuses[i % leadStatuses.length];

    const lead = await prisma.lead.create({
      data: {
        firstName: "سرنخ",
        lastName: `آزمایشی ${i + 1}`,
        phone: createSyntheticPhone(200 + i),
        province: leadFixture.prov,
        city: leadFixture.city,
        source: source,
        campaign: i % 2 === 0 ? "کمپین تخفیف بهاره اینستاگرام" : "تبلیغات گوگل و پیامک",
        status: status,
        score: leadFixture.score,
        temperature: leadFixture.temp,
        estimatedBudget: leadFixture.budget,
        purchaseTimeframe: i % 2 === 0 ? "فوری (طی هفته جاری)" : "تا پایان ماه",
        notes: "نیاز به فرش ۹ متری ۱۲۰۰ شانه با زمینه روشن برای جهیزیه.",
        assignedToId: rep.id,
        needProfile: {
          create: {
            preferredSizes: ["2.5x3.5", "3x4"],
            preferredShane: "1200",
            preferredDensity: "3600",
            preferredColors: ["کرم صدفی", "طوسی"],
            preferredStyle: "نئوکلاسیک",
            budgetMin: leadFixture.budget * 0.7,
            budgetMax: leadFixture.budget,
            quantity: 2,
            paymentPreference: "INSTALLMENT",
            spaceType: "پذیرایی",
          },
        },
      },
    });
    createdLeads.push(lead);
  }

  console.log(`✅ ${createdLeads.length} لید با امتیازدهی هوشمند و پروفایل نیازمندی‌ها ایجاد شد.`);

  // 6. Create Pipeline Deals
  for (let i = 0; i < createdLeads.length; i++) {
    const lead = createdLeads[i];
    const prod = createdProducts[i % createdProducts.length];
    const variant = prod.variants[0];
    const stage = lead.status;

    await prisma.deal.create({
      data: {
        title: `معامله ۲ تخته فرش ${prod.name}`,
        value: variant.cashPrice * 2,
        stage: stage,
        priority: lead.temperature === "HOT" ? "HIGH" : "MEDIUM",
        leadId: lead.id,
        productId: prod.id,
        variantId: variant.id,
        assignedToId: lead.assignedToId,
        expectedCloseDate: new Date(Date.now() + (i + 3) * 24 * 60 * 60 * 1000),
        notes: `مشتری استعلام قیمت نقدی و اقساطی گرفته است.`,
      },
    });
  }

  console.log("✅ معاملات پایپ‌لاین فروش ایجاد شدند.");

  // 7. Create Follow-Ups
  const followUpTypes = [
    "CALL",
    "WHATSAPP",
    "SEND_CARPET_PHOTO",
    "SEND_PRICE",
    "NEGOTIATION",
    "PAYMENT_REMINDER",
  ] as const;

  for (let i = 0; i < createdLeads.length; i++) {
    const lead = createdLeads[i];
    const isOverdue = i === 0 || i === 3;
    const isDone = i % 2 === 0;

    await prisma.followUp.create({
      data: {
        title: `پیگیری انتخاب نقشه و هماهنگی ارسال: ${lead.firstName} ${lead.lastName}`,
        type: followUpTypes[i % followUpTypes.length],
        priority: lead.temperature === "HOT" ? "URGENT" : "MEDIUM",
        status: isOverdue ? "OVERDUE" : isDone ? "DONE" : "PENDING",
        scheduledAt: isOverdue
          ? new Date(Date.now() - 2 * 24 * 60 * 60 * 1000)
          : new Date(Date.now() + i * 12 * 60 * 60 * 1000),
        completedAt: isDone ? new Date() : null,
        resultNote: isDone ? "مشتری کاتالوگ را مشاهده کرد و طرح افشان را پسندید." : null,
        leadId: lead.id,
        assignedToId: lead.assignedToId,
      },
    });
  }

  console.log("✅ برنامه‌ریزی پیگیری‌ها و یادآورهای فروش ایجاد شدند.");

  // 8. Create Orders, Payments & Installments
  for (let i = 0; i < 4; i++) {
    const cust = createdCustomers[i];
    const prod = createdProducts[i];
    const variant = prod.variants[0];
    const seller = allReps[i % allReps.length];

    const qty = 2;
    const total = variant.cashPrice * qty;
    const discount = 1000000;
    const finalAmt = total - discount;
    const isInstallment = i % 2 === 1;

    const order = await prisma.order.create({
      data: {
        orderNumber: `ORD-1403-${1000 + i}`,
        customerId: cust.id,
        sellerId: seller.id,
        totalAmount: total,
        discountAmount: discount,
        finalAmount: finalAmt,
        paymentMethod: isInstallment ? "INSTALLMENT" : "POS",
        paidAmount: isInstallment ? finalAmt * 0.4 : finalAmt,
        remainingAmount: isInstallment ? finalAmt * 0.6 : 0,
        status: "CONFIRMED",
        shippingAddress: cust.address,
        shippingStatus: "PREPARING",
        notes: "ارسال با بسته‌بندی ضد آب و باربری اختصاصی فرش.",
        items: {
          create: {
            variantId: variant.id,
            quantity: qty,
            unitPrice: variant.cashPrice,
            totalPrice: total,
            notes: `شامل شناسنامه اصالت و ضمانت‌نامه ۵ ساله کتبی کارخانه`,
          },
        },
      },
    });

    // Add initial payment
    await prisma.payment.create({
      data: {
        orderId: order.id,
        amount: isInstallment ? finalAmt * 0.4 : finalAmt,
        method: "POS",
        trackingNumber: `TRK-8854${i}`,
        status: "CONFIRMED",
        notes: isInstallment ? "پیش‌پرداخت اولیه خرید اقساطی ۴۰٪" : "تسویه کامل نقدی دستگاه کارتخوان",
      },
    });

    // If installment, create schedule
    if (isInstallment) {
      const installmentCount = 3;
      const installmentAmt = (finalAmt * 0.6) / installmentCount;

      for (let instIdx = 1; instIdx <= installmentCount; instIdx++) {
        const dueDate = new Date();
        dueDate.setMonth(dueDate.getMonth() + instIdx);

        await prisma.installment.create({
          data: {
            orderId: order.id,
            installmentNumber: instIdx,
            amount: installmentAmt,
            dueDate: dueDate,
            status: instIdx === 1 ? "PAID" : "PENDING",
            paidDate: instIdx === 1 ? new Date() : null,
            chequeNumber: `CHQ-77889${instIdx}`,
            notes: `چک صیادی شماره ${instIdx} عهده بانک ملت`,
          },
        });
      }
    }
  }

  console.log("✅ فاکتورهای رسمی فروش، پرداخت‌ها و دفترچه اقساط ثبت شدند.");

  // 9. Create Notifications & Automation Rules
  await prisma.automationRule.create({
    data: {
      name: "هشدار فوری لید داغ (امتیاز بالای ۵۵)",
      triggerType: "HOT_LEAD",
      conditions: { scoreMin: 55 },
      actions: { notifyRep: true, notifyManager: true, priority: "URGENT" },
    },
  });

  await prisma.automationRule.create({
    data: {
      name: "یادآوری سررسید اقساط ۳ روز قبل از موعد",
      triggerType: "INSTALLMENT_DUE",
      conditions: { daysBefore: 3 },
      actions: { sendSmsToCustomer: true, notifySeller: true },
    },
  });

  await prisma.notification.create({
    data: {
      userId: rep1.id,
      title: "🔥 لید داغ جدید تخصیص داده شد",
      message: "یک لید آزمایشی داغ با بودجهٔ ۵۰ میلیون تومان به شما واگذار شد.",
      type: "HOT_LEAD",
      linkUrl: `/leads`,
    },
  });

  await prisma.notification.create({
    data: {
      userId: manager.id,
      title: "📦 هشدار کمبود موجودی فرش لچک ترنج",
      message: "موجودی ابعاد ۳×۴ کد انبار CRP-101 به کمتر از ۴ تخته رسیده است.",
      type: "LOW_STOCK",
      linkUrl: `/inventory`,
    },
  });

  console.log("🎉 داده‌های اولیه سامانه فروش فرش با موفقیت در پایگاه داده ثبت شدند!");
}

main()
  .catch(() => {
    // Prisma errors can contain connection details or record values.
    console.error("❌ اجرای seed ناموفق بود؛ جزئیات حساس نمایش داده نمی‌شود.");
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma?.$disconnect();
  });
