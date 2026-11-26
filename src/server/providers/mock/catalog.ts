/**
 * Demo catalogue for the MOCK provider. Prices are realistic Indian street prices (INR, 2026)
 * but entirely illustrative – every offer generated from here is labelled "Demo data" in the UI.
 * This file must stay free of server-only imports because the seed script uses it too.
 */
import type { RetailerId } from "@/features/retailers/retailers";

export type MockCategory = "Mobiles" | "Laptops" | "Audio" | "TVs" | "Wearables" | "Appliances" | "Fashion" | "Footwear" | "Beauty" | "Grocery";

export interface MockProduct {
  key: string;
  name: string;
  brand: string;
  category: MockCategory;
  basePrice: number;
  tags: string[];
  specs: Record<string, string>;
  description: string;
  pros: string[];
  cons: string[];
  /** Days since launch, used for the "newest" sort. */
  launchedDaysAgo: number;
}

export const CATEGORY_RETAILERS: Record<MockCategory, RetailerId[]> = {
  Mobiles: ["amazon", "flipkart", "croma", "reliance", "vijaysales", "tatacliq", "jiomart"],
  Laptops: ["amazon", "flipkart", "croma", "reliance", "vijaysales", "tatacliq"],
  Audio: ["amazon", "flipkart", "croma", "reliance", "tatacliq", "myntra", "blinkit"],
  TVs: ["amazon", "flipkart", "croma", "reliance", "vijaysales", "tatacliq", "jiomart"],
  Wearables: ["amazon", "flipkart", "croma", "reliance", "myntra", "tatacliq"],
  Appliances: ["amazon", "flipkart", "croma", "reliance", "vijaysales", "tatacliq", "jiomart"],
  Fashion: ["myntra", "ajio", "amazon", "flipkart", "tatacliq"],
  Footwear: ["myntra", "ajio", "amazon", "flipkart", "tatacliq"],
  Beauty: ["nykaa", "amazon", "flipkart", "myntra", "tatacliq", "blinkit", "zepto"],
  Grocery: ["blinkit", "zepto", "bigbasket", "jiomart", "amazon", "flipkart"],
};

const p = (x: MockProduct) => x;

export const MOCK_CATALOG: MockProduct[] = [
  p({ key: "apple-iphone-16-128gb", name: "Apple iPhone 16 (128 GB) – Ultramarine", brand: "Apple", category: "Mobiles", basePrice: 74900, tags: ["iphone", "phone", "smartphone", "ios", "5g"], launchedDaysAgo: 430,
    specs: { Display: '6.1" Super Retina XDR OLED', Chip: "A18 Bionic", Storage: "128 GB", Camera: "48 MP Fusion + 12 MP Ultra Wide", Battery: "Up to 22 hrs video", OS: "iOS 18" },
    description: "Apple's 2024 flagship with Camera Control, Apple Intelligence support and the A18 chip.", pros: ["Excellent camera", "Long software support", "Great build quality"], cons: ["60 Hz display", "Slow 20W charging"] }),
  p({ key: "apple-iphone-16-pro-256gb", name: "Apple iPhone 16 Pro (256 GB) – Desert Titanium", brand: "Apple", category: "Mobiles", basePrice: 129900, tags: ["iphone", "pro", "phone", "smartphone", "5g"], launchedDaysAgo: 430,
    specs: { Display: '6.3" ProMotion 120 Hz', Chip: "A18 Pro", Storage: "256 GB", Camera: "48 MP + 48 MP UW + 12 MP 5x", Build: "Titanium" },
    description: "Pro iPhone with 5x telephoto, titanium design and 4K120 Dolby Vision recording.", pros: ["Best-in-class video", "120 Hz ProMotion", "5x zoom"], cons: ["Expensive", "Heavy"] }),
  p({ key: "samsung-galaxy-s25-ultra-256gb", name: "Samsung Galaxy S25 Ultra 5G (12 GB / 256 GB) – Titanium Silverblue", brand: "Samsung", category: "Mobiles", basePrice: 129999, tags: ["samsung", "galaxy", "phone", "android", "5g", "s pen"], launchedDaysAgo: 300,
    specs: { Display: '6.9" QHD+ Dynamic AMOLED 2X', Chip: "Snapdragon 8 Elite for Galaxy", RAM: "12 GB", Storage: "256 GB", Camera: "200 MP + 50 MP UW + 50 MP 5x + 10 MP 3x", Battery: "5000 mAh" },
    description: "Samsung's top Android flagship with built-in S Pen and Galaxy AI.", pros: ["Stunning display", "Versatile cameras", "7 years of updates"], cons: ["45W charging only", "Large and heavy"] }),
  p({ key: "samsung-galaxy-s24-fe-128gb", name: "Samsung Galaxy S24 FE 5G (8 GB / 128 GB) – Mint", brand: "Samsung", category: "Mobiles", basePrice: 36999, tags: ["samsung", "galaxy", "phone", "android", "5g"], launchedDaysAgo: 420,
    specs: { Display: '6.7" FHD+ 120 Hz AMOLED', Chip: "Exynos 2400e", RAM: "8 GB", Storage: "128 GB", Battery: "4700 mAh" },
    description: "Fan Edition flagship features at a mid-range price.", pros: ["Flagship-grade camera", "IP68"], cons: ["Runs warm under load"] }),
  p({ key: "oneplus-13-256gb", name: "OnePlus 13 5G (12 GB / 256 GB) – Midnight Ocean", brand: "OnePlus", category: "Mobiles", basePrice: 69999, tags: ["oneplus", "phone", "android", "5g"], launchedDaysAgo: 320,
    specs: { Display: '6.82" 2K LTPO 120 Hz', Chip: "Snapdragon 8 Elite", RAM: "12 GB", Storage: "256 GB", Battery: "6000 mAh, 100W wired" },
    description: "Hasselblad-tuned cameras and a huge 6000 mAh battery with 100W charging.", pros: ["Battery life", "Very fast charging", "Smooth software"], cons: ["Bulky camera island"] }),
  p({ key: "google-pixel-9-128gb", name: "Google Pixel 9 (12 GB / 128 GB) – Obsidian", brand: "Google", category: "Mobiles", basePrice: 79999, tags: ["pixel", "google", "phone", "android", "5g"], launchedDaysAgo: 450,
    specs: { Display: '6.3" Actua 120 Hz OLED', Chip: "Google Tensor G4", RAM: "12 GB", Storage: "128 GB", Camera: "50 MP + 48 MP UW" },
    description: "Clean Android with Gemini built in and Google's computational photography.", pros: ["Superb photos", "7 years of updates"], cons: ["Average battery", "Slow charging"] }),
  p({ key: "redmi-note-14-pro-plus", name: "Redmi Note 14 Pro+ 5G (8 GB / 256 GB) – Titan Black", brand: "Xiaomi", category: "Mobiles", basePrice: 31999, tags: ["redmi", "xiaomi", "phone", "android", "5g", "budget"], launchedDaysAgo: 330,
    specs: { Display: '6.67" 1.5K AMOLED 120 Hz', Chip: "Snapdragon 7s Gen 3", Camera: "200 MP main", Battery: "6200 mAh, 90W" },
    description: "Value champion with a 200 MP camera and IP68/69 durability.", pros: ["Great value", "Durable"], cons: ["Bloatware"] }),
  p({ key: "apple-macbook-air-m4-13", name: 'Apple MacBook Air 13" M4 (16 GB / 256 GB) – Sky Blue', brand: "Apple", category: "Laptops", basePrice: 99900, tags: ["macbook", "laptop", "apple", "mac", "m4"], launchedDaysAgo: 250,
    specs: { Chip: "Apple M4 (10-core CPU, 8-core GPU)", RAM: "16 GB unified", Storage: "256 GB SSD", Display: '13.6" Liquid Retina', Battery: "Up to 18 hrs", Weight: "1.24 kg" },
    description: "Fanless, ultra-light laptop with all-day battery and Apple Intelligence.", pros: ["Silent fanless design", "Battery life", "Display"], cons: ["Only 256 GB base storage"] }),
  p({ key: "dell-inspiron-14-i5", name: "Dell Inspiron 14 5440 (Core i5-1334U / 16 GB / 512 GB SSD)", brand: "Dell", category: "Laptops", basePrice: 62990, tags: ["dell", "laptop", "windows", "intel"], launchedDaysAgo: 520,
    specs: { CPU: "Intel Core i5-1334U", RAM: "16 GB DDR5", Storage: "512 GB SSD", Display: '14" FHD+ 16:10', OS: "Windows 11 + MS Office" },
    description: "Reliable everyday productivity laptop with Office included.", pros: ["Good keyboard", "Office bundled"], cons: ["Average display brightness"] }),
  p({ key: "hp-victus-15-rtx4050", name: "HP Victus 15 Gaming (Ryzen 5 8645HS / RTX 4050 / 16 GB / 512 GB)", brand: "HP", category: "Laptops", basePrice: 72990, tags: ["hp", "gaming", "laptop", "rtx", "windows"], launchedDaysAgo: 380,
    specs: { CPU: "AMD Ryzen 5 8645HS", GPU: "NVIDIA RTX 4050 6 GB", RAM: "16 GB", Display: '15.6" FHD 144 Hz' },
    description: "Entry-level gaming laptop that handles esports titles at high refresh rates.", pros: ["Strong GPU for price", "144 Hz panel"], cons: ["Heavy", "Mediocre battery"] }),
  p({ key: "lenovo-ideapad-slim-5", name: "Lenovo IdeaPad Slim 5 (Ryzen 7 8845HS / 16 GB / 1 TB SSD) OLED", brand: "Lenovo", category: "Laptops", basePrice: 78990, tags: ["lenovo", "laptop", "oled", "ryzen"], launchedDaysAgo: 360,
    specs: { CPU: "AMD Ryzen 7 8845HS", RAM: "16 GB LPDDR5x", Storage: "1 TB SSD", Display: '14" 2.8K OLED 120 Hz' },
    description: "Slim OLED laptop with a powerful Ryzen 7 and 1 TB storage.", pros: ["Gorgeous OLED", "Fast CPU"], cons: ["Glossy screen reflections"] }),
  p({ key: "sony-wh-1000xm5", name: "Sony WH-1000XM5 Wireless Noise Cancelling Headphones – Black", brand: "Sony", category: "Audio", basePrice: 29990, tags: ["sony", "headphones", "anc", "wireless", "bluetooth"], launchedDaysAgo: 1200,
    specs: { Type: "Over-ear", ANC: "Yes, 8 mics", Battery: "30 hrs", Charging: "3 min = 3 hrs", Codecs: "LDAC, AAC, SBC" },
    description: "Industry-leading noise cancellation with excellent call quality.", pros: ["Best-in-class ANC", "Comfortable", "Long battery"], cons: ["Doesn't fold"] }),
  p({ key: "apple-airpods-pro-2", name: "Apple AirPods Pro (2nd Gen) with MagSafe Case (USB-C)", brand: "Apple", category: "Audio", basePrice: 24900, tags: ["airpods", "earbuds", "apple", "anc", "tws"], launchedDaysAgo: 800,
    specs: { Type: "In-ear TWS", ANC: "Yes, Adaptive Audio", Battery: "6 hrs (30 with case)", Chip: "H2" },
    description: "Apple's premium earbuds with adaptive ANC and hearing-health features.", pros: ["Great ANC", "Seamless with iPhone"], cons: ["Limited on Android"] }),
  p({ key: "boat-airdopes-141", name: "boAt Airdopes 141 ANC TWS Earbuds – Gunmetal Black", brand: "boAt", category: "Audio", basePrice: 1499, tags: ["boat", "earbuds", "tws", "budget", "bluetooth"], launchedDaysAgo: 600,
    specs: { Type: "In-ear TWS", ANC: "Yes (32 dB)", Battery: "42 hrs total", Latency: "50 ms BEAST mode" },
    description: "India's best-selling budget earbuds with ANC.", pros: ["Very affordable", "Long playback"], cons: ["Average mic"] }),
  p({ key: "jbl-flip-6", name: "JBL Flip 6 Portable Bluetooth Speaker – Blue", brand: "JBL", category: "Audio", basePrice: 11999, tags: ["jbl", "speaker", "bluetooth", "portable"], launchedDaysAgo: 1100,
    specs: { Output: "30 W", Battery: "12 hrs", Rating: "IP67", Connectivity: "Bluetooth 5.1" },
    description: "Rugged, waterproof speaker with punchy sound.", pros: ["Loud and clear", "Waterproof"], cons: ["No aux input"] }),
  p({ key: "samsung-55-crystal-4k", name: 'Samsung 138 cm (55") Crystal 4K Vivid Pro Smart LED TV UA55DUE77AKLXL', brand: "Samsung", category: "TVs", basePrice: 52990, tags: ["samsung", "tv", "4k", "smart tv", "led", "television"], launchedDaysAgo: 540,
    specs: { Size: '55"', Resolution: "4K UHD", OS: "Tizen", HDR: "HDR10+", Audio: "20 W" },
    description: "Popular 4K smart TV with Tizen and Crystal Processor 4K.", pros: ["Good picture for price", "Smooth UI"], cons: ["60 Hz panel"] }),
  p({ key: "lg-65-oled-c4", name: 'LG 164 cm (65") OLED evo C4 4K Smart TV OLED65C46LA', brand: "LG", category: "TVs", basePrice: 239990, tags: ["lg", "oled", "tv", "4k", "television", "smart tv"], launchedDaysAgo: 560,
    specs: { Size: '65"', Panel: "OLED evo, 144 Hz", HDR: "Dolby Vision, HDR10", Gaming: "4x HDMI 2.1, G-Sync" },
    description: "Reference-grade OLED TV loved by gamers and movie buffs.", pros: ["Perfect blacks", "Gaming features"], cons: ["Premium price"] }),
  p({ key: "xiaomi-43-fx-pro", name: 'Xiaomi 108 cm (43") FX Pro QLED 4K Smart Fire TV', brand: "Xiaomi", category: "TVs", basePrice: 26999, tags: ["xiaomi", "mi", "tv", "qled", "4k", "fire tv", "television"], launchedDaysAgo: 470,
    specs: { Size: '43"', Panel: "QLED 4K", OS: "Fire OS", Audio: "34 W" },
    description: "Budget QLED TV with Fire TV built-in.", pros: ["Value for money", "Loud speakers"], cons: ["Average viewing angles"] }),
  p({ key: "apple-watch-series-10", name: "Apple Watch Series 10 GPS 46mm – Jet Black Aluminium", brand: "Apple", category: "Wearables", basePrice: 49900, tags: ["apple watch", "smartwatch", "watch", "wearable"], launchedDaysAgo: 430,
    specs: { Case: "46 mm aluminium", Display: "Wide-angle OLED", Health: "ECG, SpO2, sleep apnea", Battery: "18 hrs" },
    description: "Thinnest Apple Watch with a larger, brighter display.", pros: ["Best health tracking", "Bright display"], cons: ["Daily charging"] }),
  p({ key: "noise-colorfit-pro-6", name: "Noise ColorFit Pro 6 Max Smartwatch AMOLED – Jet Black", brand: "Noise", category: "Wearables", basePrice: 5999, tags: ["noise", "smartwatch", "watch", "budget"], launchedDaysAgo: 300,
    specs: { Display: '1.96" AMOLED', Calling: "Bluetooth calling", Battery: "7 days" },
    description: "Feature-packed budget smartwatch made in India.", pros: ["Large AMOLED", "Affordable"], cons: ["Basic fitness accuracy"] }),
  p({ key: "dyson-v12-detect-slim", name: "Dyson V12 Detect Slim Absolute Cordless Vacuum Cleaner", brand: "Dyson", category: "Appliances", basePrice: 55900, tags: ["dyson", "vacuum", "cleaner", "appliance", "home"], launchedDaysAgo: 900,
    specs: { Power: "150 AW suction", Runtime: "Up to 60 min", Features: "Laser dust detection, LCD" },
    description: "Lightweight cordless vacuum with laser dust detection.", pros: ["Powerful suction", "Laser reveals dust"], cons: ["Expensive", "Small bin"] }),
  p({ key: "lg-1-5-ton-ai-dual-inverter-ac", name: "LG 1.5 Ton 5 Star AI DUAL Inverter Split AC (Copper, 6-in-1 Convertible)", brand: "LG", category: "Appliances", basePrice: 46990, tags: ["lg", "ac", "air conditioner", "inverter", "appliance"], launchedDaysAgo: 280,
    specs: { Capacity: "1.5 Ton", Rating: "5 Star (2025)", Compressor: "AI Dual Inverter", Condenser: "Copper" },
    description: "Energy-efficient split AC with AI convertible cooling modes.", pros: ["Energy efficient", "Quiet"], cons: ["Installation extra"] }),
  p({ key: "philips-air-fryer-hd9252", name: "Philips Air Fryer HD9252/90 4.1 L – Black", brand: "Philips", category: "Appliances", basePrice: 8995, tags: ["philips", "air fryer", "kitchen", "appliance"], launchedDaysAgo: 1000,
    specs: { Capacity: "4.1 L", Power: "1400 W", Tech: "Rapid Air" },
    description: "India's favourite air fryer for oil-free cooking.", pros: ["Even cooking", "Easy to clean"], cons: ["Small for big families"] }),
  p({ key: "levis-511-slim-jeans", name: "Levi's Men's 511 Slim Fit Mid-Rise Jeans – Dark Indigo", brand: "Levi's", category: "Fashion", basePrice: 3299, tags: ["levis", "jeans", "denim", "men", "clothing"], launchedDaysAgo: 200,
    specs: { Fit: "Slim", Rise: "Mid", Fabric: "99% cotton, 1% elastane", Wash: "Dark indigo" },
    description: "The classic slim-fit jean with a bit of stretch.", pros: ["Iconic fit", "Durable denim"], cons: ["Runs slightly small"] }),
  p({ key: "allen-solly-polo-tshirt", name: "Allen Solly Men's Regular Fit Polo T-Shirt – Navy", brand: "Allen Solly", category: "Fashion", basePrice: 1299, tags: ["allen solly", "polo", "tshirt", "t-shirt", "men", "clothing"], launchedDaysAgo: 150,
    specs: { Fit: "Regular", Fabric: "100% cotton pique", Sleeve: "Half" },
    description: "Smart-casual pique polo for office and weekends.", pros: ["Breathable cotton"], cons: ["Colour may fade with hot wash"] }),
  p({ key: "biba-anarkali-kurta", name: "BIBA Women's Printed Anarkali Kurta with Palazzo & Dupatta", brand: "BIBA", category: "Fashion", basePrice: 4999, tags: ["biba", "kurta", "ethnic", "women", "anarkali", "clothing"], launchedDaysAgo: 90,
    specs: { Set: "Kurta, palazzo, dupatta", Fabric: "Rayon", Occasion: "Festive" },
    description: "Festive-ready printed anarkali set.", pros: ["Rich print", "Comfortable rayon"], cons: ["Dry clean dupatta"] }),
  p({ key: "nike-air-zoom-pegasus-41", name: "Nike Air Zoom Pegasus 41 Men's Road Running Shoes", brand: "Nike", category: "Footwear", basePrice: 11895, tags: ["nike", "shoes", "running", "sneakers", "men", "footwear"], launchedDaysAgo: 400,
    specs: { Use: "Road running", Cushioning: "ReactX + Air Zoom", Drop: "10 mm" },
    description: "Everyday running workhorse with responsive ReactX foam.", pros: ["Versatile", "Comfortable"], cons: ["Narrow toe box"] }),
  p({ key: "adidas-ultraboost-light", name: "adidas Ultraboost Light Running Shoes – Core Black", brand: "adidas", category: "Footwear", basePrice: 17999, tags: ["adidas", "shoes", "running", "sneakers", "footwear"], launchedDaysAgo: 700,
    specs: { Use: "Running", Midsole: "Light BOOST", Outsole: "Continental rubber" },
    description: "The lightest Ultraboost ever with energy-returning BOOST foam.", pros: ["Plush cushioning", "Great grip"], cons: ["Pricey"] }),
  p({ key: "bata-formal-oxford", name: "Bata Men's Leather Formal Oxford Shoes – Black", brand: "Bata", category: "Footwear", basePrice: 2499, tags: ["bata", "formal", "shoes", "leather", "men", "footwear"], launchedDaysAgo: 365,
    specs: { Material: "Genuine leather", Sole: "TPR", Closure: "Lace-up" },
    description: "Classic leather oxfords for office wear.", pros: ["Genuine leather", "Affordable"], cons: ["Break-in period"] }),
  p({ key: "lakme-9to5-primer-foundation", name: "Lakmé 9 to 5 Primer + Matte Perfect Cover Foundation 25 ml – Warm Natural", brand: "Lakmé", category: "Beauty", basePrice: 675, tags: ["lakme", "foundation", "makeup", "beauty"], launchedDaysAgo: 500,
    specs: { Finish: "Matte", Coverage: "Medium-full", SPF: "20" },
    description: "Long-wear matte foundation with built-in primer.", pros: ["Long lasting", "Good shade range"], cons: ["Can feel drying"] }),
  p({ key: "minimalist-niacinamide-serum", name: "Minimalist 10% Niacinamide Face Serum 30 ml", brand: "Minimalist", category: "Beauty", basePrice: 599, tags: ["minimalist", "serum", "niacinamide", "skincare", "beauty"], launchedDaysAgo: 800,
    specs: { Actives: "10% Niacinamide + 1% Zinc", Skin: "Oily / acne-prone", Size: "30 ml" },
    description: "Cult skincare serum for blemishes and oil control.", pros: ["Effective", "Transparent formulation"], cons: ["Can pill under makeup"] }),
  p({ key: "maybelline-lash-sensational", name: "Maybelline New York Lash Sensational Sky High Mascara – Very Black", brand: "Maybelline", category: "Beauty", basePrice: 949, tags: ["maybelline", "mascara", "makeup", "beauty"], launchedDaysAgo: 900,
    specs: { Effect: "Length + volume", Formula: "Bamboo extract", Waterproof: "No" },
    description: "Viral lengthening mascara with a flexible brush.", pros: ["Dramatic length"], cons: ["Not waterproof"] }),
  p({ key: "aashirvaad-atta-10kg", name: "Aashirvaad Shudh Chakki Whole Wheat Atta 10 kg", brand: "Aashirvaad", category: "Grocery", basePrice: 545, tags: ["atta", "wheat", "flour", "grocery", "staples", "aashirvaad"], launchedDaysAgo: 2000,
    specs: { Weight: "10 kg", Type: "Whole wheat", Shelf: "3 months" },
    description: "India's most trusted chakki atta for soft rotis.", pros: ["Soft rotis", "Consistent quality"], cons: ["Bulky pack"] }),
  p({ key: "amul-butter-500g", name: "Amul Pasteurised Butter 500 g", brand: "Amul", category: "Grocery", basePrice: 285, tags: ["amul", "butter", "dairy", "grocery"], launchedDaysAgo: 3000,
    specs: { Weight: "500 g", Type: "Salted", Storage: "Refrigerate" },
    description: "The taste of India – classic salted butter.", pros: ["Iconic taste"], cons: ["Needs refrigeration"] }),
  p({ key: "tata-tea-gold-1kg", name: "Tata Tea Gold Premium Assam Tea 1 kg", brand: "Tata Tea", category: "Grocery", basePrice: 640, tags: ["tata", "tea", "chai", "grocery", "beverage"], launchedDaysAgo: 2500,
    specs: { Weight: "1 kg", Blend: "Assam with 15% long leaves" },
    description: "Rich, aromatic Assam blend for the perfect chai.", pros: ["Strong flavour"], cons: [] }),
  p({ key: "fortune-sunflower-oil-5l", name: "Fortune Sunlite Refined Sunflower Oil 5 L Jar", brand: "Fortune", category: "Grocery", basePrice: 799, tags: ["fortune", "oil", "sunflower", "cooking oil", "grocery"], launchedDaysAgo: 2500,
    specs: { Volume: "5 L", Type: "Refined sunflower" },
    description: "Light, healthy refined sunflower oil for everyday cooking.", pros: ["Light taste"], cons: [] }),
];

/** Approximate per-retailer delivery behaviour for the mock provider. */
export const RETAILER_LOGISTICS: Record<RetailerId, { eta: [number, number]; freeAbove: number; fee: number; rating: [number, number] }> = {
  amazon: { eta: [1, 2], freeAbove: 499, fee: 40, rating: [4.1, 4.6] },
  flipkart: { eta: [1, 3], freeAbove: 500, fee: 40, rating: [4.0, 4.5] },
  myntra: { eta: [2, 4], freeAbove: 799, fee: 99, rating: [4.1, 4.5] },
  ajio: { eta: [3, 6], freeAbove: 999, fee: 99, rating: [3.9, 4.4] },
  croma: { eta: [1, 3], freeAbove: 0, fee: 0, rating: [4.0, 4.5] },
  reliance: { eta: [2, 4], freeAbove: 0, fee: 0, rating: [3.9, 4.4] },
  tatacliq: { eta: [3, 5], freeAbove: 499, fee: 50, rating: [3.9, 4.4] },
  nykaa: { eta: [2, 4], freeAbove: 499, fee: 70, rating: [4.2, 4.6] },
  vijaysales: { eta: [2, 5], freeAbove: 0, fee: 0, rating: [3.9, 4.3] },
  jiomart: { eta: [1, 3], freeAbove: 199, fee: 25, rating: [3.8, 4.3] },
  blinkit: { eta: [0.006, 0.012], freeAbove: 199, fee: 25, rating: [4.2, 4.7] },
  zepto: { eta: [0.006, 0.01], freeAbove: 99, fee: 30, rating: [4.1, 4.6] },
  bigbasket: { eta: [0.08, 0.5], freeAbove: 600, fee: 50, rating: [4.0, 4.5] },
};
