import { PrismaClient } from "@prisma/client";
import bcrypt from "bcryptjs";

const prisma = new PrismaClient();

async function main() {
  if (process.env.NODE_ENV === "production" && process.env.ALLOW_PRODUCTION_SEED !== "true") {
    console.error("⚠️ هشدار امنیتی: اجرای اسکریپت seed در محیط Production مجاز نیست مگر اینکه متغیر ALLOW_PRODUCTION_SEED=true تنظیم شده باشد.");
    process.exit(1);
  }

  console.log("🌱 شروع ایجاد داده‌های اولیه سامانه فروش و CRM فرش (DEVELOPMENT ONLY)...");

  // 1. Clean existing records
  await prisma.auditLog.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.automationRule.deleteMany();
  await prisma.installment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.orderItem.deleteMany();
  await prisma.order.deleteMany();
  await prisma.followUp.deleteMany();
  await prisma.deal.deleteMany();
  await prisma.inventoryMovement.deleteMany();
  await prisma.productVariant.deleteMany();
  await prisma.product.deleteMany();
  await prisma.carpetNeedProfile.deleteMany();
  await prisma.lead.deleteMany();
  await prisma.customer.deleteMany();
  await prisma.user.deleteMany();

  // 2. Create Users (DEVELOPMENT ONLY DEMO PASSWORDS)
  const initialPassword = process.env.SEED_DEFAULT_PASSWORD || "123456";
  const defaultPasswordHash = await bcrypt.hash(initialPassword, 10);

  const admin = await prisma.user.create({
    data: {
      name: "مهندس علیرضا کاشانی",
      email: "admin@carpet-crm.ir",
      phone: "09121111111",
      passwordHash: defaultPasswordHash,
      role: "ADMIN",
      avatar: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80",
    },
  });

  const manager = await prisma.user.create({
    data: {
      name: "سارا حسینی (مدیر فروش)",
      email: "manager@carpet-crm.ir",
      phone: "09122222222",
      passwordHash: defaultPasswordHash,
      role: "SALES_MANAGER",
      avatar: "https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80",
    },
  });

  const rep1 = await prisma.user.create({
    data: {
      name: "محمد رضایی (کارشناس ارشد فرش)",
      email: "rep1@carpet-crm.ir",
      phone: "09123333333",
      passwordHash: defaultPasswordHash,
      role: "SALES_REP",
      avatar: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80",
    },
  });

  const rep2 = await prisma.user.create({
    data: {
      name: "مریم ابراهیمی (مشاور دکوراسیون)",
      email: "rep2@carpet-crm.ir",
      phone: "09124444444",
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
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=600&auto=format&fit=crop&q=80",
      ]),
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
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1579656381226-5fc0f0100c3b?w=600&auto=format&fit=crop&q=80",
      ]),
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
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1596178065887-1198b6148b2b?w=600&auto=format&fit=crop&q=80",
      ]),
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
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1584100936595-c0654b55a2e2?w=600&auto=format&fit=crop&q=80",
      ]),
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
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1600585154340-be6161a56a0c?w=600&auto=format&fit=crop&q=80",
      ]),
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
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1513694203232-719a280e022f?w=600&auto=format&fit=crop&q=80",
      ]),
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
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1544457070-4cd773b4d71e?w=600&auto=format&fit=crop&q=80",
      ]),
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
      images: JSON.stringify([
        "https://images.unsplash.com/photo-1600121848594-d8644e57abab?w=600&auto=format&fit=crop&q=80",
      ]),
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

  // 4. Create Customers with Realistic Iranian Names
  const customerNames = [
    { fn: "حسین", ln: "مرادی", prov: "تهران", city: "تهران", phone: "09121458963", code: "CST-1001" },
    { fn: "زهرا", ln: "صادقیان", prov: "اصفهان", city: "اصفهان", phone: "09132569874", code: "CST-1002" },
    { fn: "امیرحسین", ln: "فروتن", prov: "فارس", city: "شیراز", phone: "09173698521", code: "CST-1003" },
    { fn: "فاطمه", ln: "رستمی", prov: "خراسان رضوی", city: "مشهد", phone: "09151234567", code: "CST-1004" },
    { fn: "مهدی", ln: "کیانی", prov: "آذربایجان شرقی", city: "تبریز", phone: "09149876543", code: "CST-1005" },
    { fn: "نرگس", ln: "خسروی", prov: "گیلان", city: "رشت", phone: "09113216549", code: "CST-1006" },
    { fn: "علیرضا", ln: "تقوی", prov: "مازندران", city: "ساری", phone: "09118529631", code: "CST-1007" },
    { fn: "مریم", ln: "باقری", prov: "قم", city: "قم", phone: "09127539514", code: "CST-1008" },
    { fn: "سعید", ln: "یزدانی", prov: "یزد", city: "یزد", phone: "09139517532", code: "CST-1009" },
    { fn: "پروانه", ln: "جعفری", prov: "البرز", city: "کرج", phone: "09351478523", code: "CST-1010" },
    { fn: "کامران", ln: "افشار", prov: "خوزستان", city: "اهواز", phone: "09163214569", code: "CST-1011" },
    { fn: "آرزو", ln: "مختاری", prov: "مرکزی", city: "اراک", phone: "09187412589", code: "CST-1012" },
    { fn: "پیمان", ln: "شجاعی", prov: "اصفهان", city: "کاشان", phone: "09133612587", code: "CST-1013" },
    { fn: "سیمین", ln: "دانشور", prov: "تهران", city: "شهریار", phone: "09128521479", code: "CST-1014" },
    { fn: "داوود", ln: "طاهری", prov: "همدان", city: "همدان", phone: "09183124569", code: "CST-1015" },
  ];

  const createdCustomers = [];
  for (let i = 0; i < customerNames.length; i++) {
    const c = customerNames[i];
    const rep = allReps[i % allReps.length];
    const cust = await prisma.customer.create({
      data: {
        code: c.code,
        firstName: c.fn,
        lastName: c.ln,
        phone: c.phone,
        province: c.prov,
        city: c.city,
        address: `خیابان اصلی، کوچه صبا، پلاک ${i + 12}`,
        assignedToId: rep.id,
        needProfiles: {
          create: {
            preferredSizes: JSON.stringify(["3x4", "2.5x3.5"]),
            preferredShane: i % 2 === 0 ? "1200" : "1500",
            preferredDensity: i % 2 === 0 ? "3600" : "4500",
            preferredColors: JSON.stringify(i % 2 === 0 ? ["سرمه‌ای", "کرم"] : ["طوسی", "لاکی"]),
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

  const leadNames = [
    { fn: "آرش", ln: "سرمدی", prov: "تهران", city: "تهران", phone: "09129998877", score: 75, temp: "HOT" as const, budget: 50000000 },
    { fn: "مهسا", ln: "نیک‌بین", prov: "اصفهان", city: "اصفهان", phone: "09138887766", score: 65, temp: "HOT" as const, budget: 35000000 },
    { fn: "رضا", ln: "قاسمی", prov: "فارس", city: "شیراز", phone: "09177776655", score: 45, temp: "WARM" as const, budget: 25000000 },
    { fn: "الهام", ln: "صابری", prov: "خراسان رضوی", city: "مشهد", phone: "09156665544", score: 50, temp: "WARM" as const, budget: 40000000 },
    { fn: "بهنام", ln: "کریمی", prov: "آذربایجان شرقی", city: "تبریز", phone: "09145554433", score: 20, temp: "COLD" as const, budget: 20000000 },
    { fn: "نیلوفر", ln: "حسنی", prov: "گیلان", city: "رشت", phone: "09114443322", score: 80, temp: "HOT" as const, budget: 60000000 },
    { fn: "ساسان", ln: "انصاری", prov: "مازندران", city: "بابل", phone: "09113332211", score: 35, temp: "WARM" as const, budget: 30000000 },
    { fn: "شیدا", ln: "کاظمی", prov: "قم", city: "قم", phone: "09122221100", score: 10, temp: "COLD" as const, budget: 15000000 },
    { fn: "کیوان", ln: "مطهری", prov: "یزد", city: "میبد", phone: "09131110099", score: 60, temp: "HOT" as const, budget: 45000000 },
    { fn: "سمیرا", ln: "عباسی", prov: "البرز", city: "کرج", phone: "09350009988", score: 40, temp: "WARM" as const, budget: 28000000 },
    { fn: "مسعود", ln: "نادری", prov: "خوزستان", city: "دزفول", phone: "09169990011", score: 70, temp: "HOT" as const, budget: 55000000 },
    { fn: "فرزانه", ln: "ایزدی", prov: "مرکزی", city: "ساوه", phone: "09188881122", score: 25, temp: "COLD" as const, budget: 18000000 },
  ];

  const createdLeads = [];
  for (let i = 0; i < leadNames.length; i++) {
    const l = leadNames[i];
    const rep = allReps[i % allReps.length];
    const source = leadSources[i % leadSources.length];
    const status = leadStatuses[i % leadStatuses.length];

    const lead = await prisma.lead.create({
      data: {
        firstName: l.fn,
        lastName: l.ln,
        phone: l.phone,
        province: l.prov,
        city: l.city,
        source: source,
        campaign: i % 2 === 0 ? "کمپین تخفیف بهاره اینستاگرام" : "تبلیغات گوگل و پیامک",
        status: status,
        score: l.score,
        temperature: l.temp,
        estimatedBudget: l.budget,
        purchaseTimeframe: i % 2 === 0 ? "فوری (طی هفته جاری)" : "تا پایان ماه",
        notes: "نیاز به فرش ۹ متری ۱۲۰۰ شانه با زمینه روشن برای جهیزیه.",
        assignedToId: rep.id,
        needProfile: {
          create: {
            preferredSizes: JSON.stringify(["2.5x3.5", "3x4"]),
            preferredShane: "1200",
            preferredDensity: "3600",
            preferredColors: JSON.stringify(["کرم صدفی", "طوسی"]),
            preferredStyle: "نئوکلاسیک",
            budgetMin: l.budget * 0.7,
            budgetMax: l.budget,
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
      conditions: JSON.stringify({ scoreMin: 55 }),
      actions: JSON.stringify({ notifyRep: true, notifyManager: true, priority: "URGENT" }),
    },
  });

  await prisma.automationRule.create({
    data: {
      name: "یادآوری سررسید اقساط ۳ روز قبل از موعد",
      triggerType: "INSTALLMENT_DUE",
      conditions: JSON.stringify({ daysBefore: 3 }),
      actions: JSON.stringify({ sendSmsToCustomer: true, notifySeller: true }),
    },
  });

  await prisma.notification.create({
    data: {
      userId: rep1.id,
      title: "🔥 لید داغ جدید تخصیص داده شد",
      message: "لید آرش سرمدی با بودجه ۵۰ میلیون تومان به شما واگذار شد. لطفا سریعا اقدام کنید.",
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
  .catch((e) => {
    console.error("❌ خطا در اجرای Seeder:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
