export interface ServiceFaq {
  qEn: string;
  qTa: string;
  aEn: string;
  aTa: string;
}

export interface ServiceInfo {
  slug: string;
  icon: string; // lucide icon name used in ServicesSection
  en: string;
  ta: string;
  descEn: string;
  descTa: string;
  aboutEn: string;
  aboutTa: string;
  highlightsEn: string[];
  highlightsTa: string[];
  faqs: ServiceFaq[];
}

const faq = (qEn: string, aEn: string, qTa: string, aTa: string): ServiceFaq => ({ qEn, aEn, qTa, aTa });

export const services: ServiceInfo[] = [
  {
    slug: "general-dentistry",
    icon: "Smile",
    en: "General Dentistry",
    ta: "பொது பல் மருத்துவம்",
    descEn: "Check-ups, consultation, scaling and polishing",
    descTa: "பரிசோதனை, ஆலோசனை, ஸ்கேலிங் மற்றும் பாலிஷிங்",
    aboutEn:
      "Routine dental care keeps small problems small. Our general dentistry visits include a full oral examination, digital X-rays when needed, professional scaling to remove tartar, and polishing for a smooth, stain-free finish.",
    aboutTa:
      "வழக்கமான பல் பராமரிப்பு சிறிய பிரச்சனைகளை பெரிதாகாமல் தடுக்கிறது. முழு வாய் பரிசோதனை, தேவைப்பட்டால் டிஜிட்டல் எக்ஸ்-ரே, ஸ்கேலிங் மற்றும் பாலிஷிங் ஆகியவை அடங்கும்.",
    highlightsEn: ["Full oral examination", "Ultrasonic scaling & polishing", "Digital X-ray / RVG", "Preventive advice & recall reminders"],
    highlightsTa: ["முழு வாய் பரிசோதனை", "ஸ்கேலிங் & பாலிஷிங்", "டிஜிட்டல் எக்ஸ்-ரே / RVG", "தடுப்பு ஆலோசனை மற்றும் நினைவூட்டல்"],
    faqs: [
      faq("How often should I get a dental check-up?", "Once every six months for most people; every three to four months if you have gum disease, diabetes or smoke.", "எத்தனை முறை பரிசோதனை தேவை?", "பொதுவாக ஆறு மாதங்களுக்கு ஒரு முறை; ஈறு நோய், சர்க்கரை நோய் இருந்தால் 3-4 மாதங்களுக்கு ஒரு முறை."),
      faq("Does scaling loosen my teeth?", "No. Scaling removes hardened tartar. Teeth may feel different for a few days because the deposits holding them are gone, but gums tighten back as they heal.", "ஸ்கேலிங் பற்களை தளர்த்துமா?", "இல்லை. ஸ்கேலிங் கடினமான படிவுகளை மட்டுமே நீக்குகிறது; ஈறுகள் குணமாகும் போது இறுக்கமாகும்."),
      faq("Is the check-up painful?", "A check-up and scaling are not painful. Mild sensitivity for a day or two is normal and settles quickly.", "பரிசோதனை வலிக்குமா?", "இல்லை. ஓரிரு நாட்கள் லேசான உணர்திறன் இருக்கலாம், விரைவில் சரியாகிவிடும்."),
    ],
  },
  {
    slug: "dental-implants",
    icon: "ShieldCheck",
    en: "Dental Implants",
    ta: "பல் பொருத்துதல்",
    descEn: "Digital dental implantology and maxillofacial implants",
    descTa: "டிஜிட்டல் டென்டல் இம்ப்ளான்டாலஜி",
    aboutEn:
      "An implant is a titanium root placed in the jawbone to replace a missing tooth. We plan every case on CBCT so the implant sits in safe bone, and restore it with a custom crown that matches your natural teeth.",
    aboutTa:
      "இம்ப்ளான்ட் என்பது இழந்த பல்லுக்கு பதிலாக தாடை எலும்பில் பொருத்தப்படும் டைட்டானியம் வேர். ஒவ்வொரு சிகிச்சையும் CBCT மூலம் திட்டமிடப்படுகிறது.",
    highlightsEn: ["CBCT-guided planning", "Single tooth to full-arch solutions", "Immediate loading where suitable", "Custom zirconia crowns"],
    highlightsTa: ["CBCT வழிகாட்டுதல்", "ஒரு பல் முதல் முழு தாடை வரை", "தேவைப்பட்டால் உடனடி ஏற்றுதல்", "தனிப்பயன் ஜிர்கோனியா கிரீடம்"],
    faqs: [
      faq("How long does an implant last?", "With good hygiene and regular reviews, implants routinely last 15-25 years or more.", "இம்ப்ளான்ட் எவ்வளவு காலம் நிலைக்கும்?", "நல்ல பராமரிப்புடன் 15-25 ஆண்டுகள் அல்லது அதற்கு மேல்."),
      faq("Is implant surgery painful?", "It is done under local anaesthesia and most patients report less discomfort than an extraction.", "அறுவை சிகிச்சை வலிக்குமா?", "மரத்துப்போகும் மருந்துடன் செய்யப்படுகிறது; பல் எடுப்பதை விட குறைவான அசௌகரியம்."),
      faq("How long before I get the crown?", "Usually 3-4 months for the bone to integrate, though selected cases allow a temporary tooth the same day.", "கிரீடம் எப்போது பொருத்தப்படும்?", "பொதுவாக 3-4 மாதங்கள்; சில சமயம் அன்றே தற்காலிக பல் வைக்கலாம்."),
    ],
  },
  {
    slug: "root-canal",
    icon: "HeartPulse",
    en: "Root Canal",
    ta: "வேர் கால்வாய் சிகிச்சை",
    descEn: "Endodontics and conservative dentistry",
    descTa: "எண்டோடான்டிக்ஸ் மற்றும் கன்சர்வேடிவ் டென்டிஸ்ட்ரி",
    aboutEn:
      "Root canal treatment saves a tooth whose nerve is infected. The inflamed pulp is removed, the canals are cleaned and sealed, and the tooth is protected with a crown so you can chew normally again.",
    aboutTa:
      "நரம்பு தொற்று ஏற்பட்ட பல்லை காப்பாற்றும் சிகிச்சை. கால்வாய்கள் சுத்தம் செய்யப்பட்டு அடைக்கப்படுகின்றன, பின்னர் கிரீடம் பொருத்தப்படுகிறது.",
    highlightsEn: ["Single-sitting RCT where possible", "Rotary & apex locator precision", "Post-and-core build up", "Crown protection"],
    highlightsTa: ["ஒரே அமர்வில் சிகிச்சை", "ரோட்டரி கருவிகள்", "போஸ்ட் & கோர்", "கிரீடம் பாதுகாப்பு"],
    faqs: [
      faq("Is a root canal painful?", "The procedure itself is done under anaesthesia and is comfortable. It relieves the pain you came in with.", "வேர் கால்வாய் சிகிச்சை வலிக்குமா?", "மரத்துப்போகும் மருந்துடன் செய்யப்படுவதால் வலி இருக்காது; இருந்த வலி நீங்கும்."),
      faq("Do I really need a crown after?", "Yes. A treated tooth becomes brittle and a crown prevents it from fracturing.", "கிரீடம் அவசியமா?", "ஆம். சிகிச்சை பெற்ற பல் உடையக்கூடியது, கிரீடம் அதை பாதுகாக்கும்."),
      faq("How many visits will it take?", "Most teeth are completed in one or two visits; infected teeth may need a third.", "எத்தனை முறை வர வேண்டும்?", "பொதுவாக ஒன்று அல்லது இரண்டு முறை; தொற்று இருந்தால் மூன்று."),
    ],
  },
  {
    slug: "orthodontics",
    icon: "Wrench",
    en: "Orthodontics",
    ta: "பல் சீரமைப்பு",
    descEn: "Braces, retainers, space maintainers and aligners",
    descTa: "பிரேஸ்கள், ரிடெய்னர்கள், அலைனர்கள்",
    aboutEn:
      "Crooked or crowded teeth are straightened with metal, ceramic or clear aligner systems. Treatment improves bite function and makes cleaning far easier, not just appearance.",
    aboutTa:
      "வளைந்த அல்லது நெருக்கமான பற்களை மெட்டல், செராமிக் அல்லது தெளிவான அலைனர் மூலம் சீரமைக்கிறோம். கடி செயல்பாடும் சுத்தம் செய்வதும் எளிதாகும்.",
    highlightsEn: ["Metal & ceramic braces", "Clear aligners", "Space maintainers for children", "Retainers after treatment"],
    highlightsTa: ["மெட்டல் & செராமிக் பிரேஸ்", "தெளிவான அலைனர்கள்", "குழந்தைகளுக்கு ஸ்பேஸ் மெயின்டெய்னர்", "ரிடெய்னர்கள்"],
    faqs: [
      faq("How long does braces treatment take?", "Typically 12-24 months depending on how much movement is needed.", "எவ்வளவு காலம் ஆகும்?", "பொதுவாக 12-24 மாதங்கள்."),
      faq("Am I too old for braces?", "No. Healthy teeth and gums matter more than age; many adults treat in their 30s and 40s.", "வயதானவர்கள் செய்யலாமா?", "ஆம். வயதை விட ஈறு ஆரோக்கியமே முக்கியம்."),
      faq("Are aligners as effective as braces?", "For mild to moderate crowding, yes. Complex bites are still handled best with fixed braces.", "அலைனர்கள் பயனுள்ளதா?", "லேசான பிரச்சனைகளுக்கு ஆம்; சிக்கலான நிலைகளுக்கு பிரேஸ் சிறந்தது."),
    ],
  },
  {
    slug: "cosmetic-dentistry",
    icon: "Sparkles",
    en: "Cosmetic Dentistry",
    ta: "அழகு பல் மருத்துவம்",
    descEn: "Teeth whitening, bleaching, veneers and smile makeovers",
    descTa: "பற்கள் வெண்மையாக்கல், வினீர்கள், புன்னகை மாற்றம்",
    aboutEn:
      "From professional whitening to porcelain veneers and complete smile makeovers, cosmetic treatment is planned around your face, lip line and natural tooth shade.",
    aboutTa:
      "வெண்மையாக்கல் முதல் வினீர்கள் மற்றும் முழு புன்னகை மாற்றம் வரை, உங்கள் முகம் மற்றும் இயற்கை நிறத்திற்கு ஏற்ப திட்டமிடப்படுகிறது.",
    highlightsEn: ["In-office & home whitening", "Porcelain / composite veneers", "Gum contouring", "Digital smile preview"],
    highlightsTa: ["கிளினிக் & வீட்டு வெண்மையாக்கல்", "வினீர்கள்", "ஈறு வடிவமைப்பு", "டிஜிட்டல் புன்னகை முன்னோட்டம்"],
    faqs: [
      faq("Does whitening damage enamel?", "Professionally supervised whitening does not damage enamel. Temporary sensitivity is common and reversible.", "வெண்மையாக்கல் பாதிப்பு தருமா?", "மருத்துவர் மேற்பார்வையில் செய்தால் பாதிப்பில்லை; தற்காலிக உணர்திறன் மட்டுமே."),
      faq("How long do results last?", "Whitening lasts 1-2 years with care; veneers last 10-15 years.", "விளைவு எவ்வளவு காலம்?", "வெண்மையாக்கல் 1-2 ஆண்டுகள்; வினீர்கள் 10-15 ஆண்டுகள்."),
      faq("Will veneers look artificial?", "No. Shade, translucency and shape are matched to your natural teeth before they are bonded.", "வினீர்கள் செயற்கையாக தெரியுமா?", "இல்லை. நிறமும் வடிவமும் உங்கள் இயற்கை பற்களுக்கு ஏற்ப தேர்வு செய்யப்படும்."),
    ],
  },
  {
    slug: "crowns-bridges",
    icon: "Crown",
    en: "Crowns & Bridges",
    ta: "கிரீடங்கள் & பாலங்கள்",
    descEn: "Ceramic crowns, zirconia, dental crowns and bridges",
    descTa: "செராமிக் கிரீடங்கள், ஜிர்கோனியா, பாலங்கள்",
    aboutEn:
      "Crowns rebuild a broken or root-treated tooth; bridges replace a missing tooth using the neighbouring teeth for support. We use metal-free zirconia and layered ceramics for a natural look.",
    aboutTa:
      "கிரீடம் உடைந்த பல்லை மீட்டமைக்கிறது; பாலம் இழந்த பல்லுக்கு பதிலாக அமைகிறது. உலோகமற்ற ஜிர்கோனியா பயன்படுத்தப்படுகிறது.",
    highlightsEn: ["Zirconia & E-max crowns", "Metal-ceramic options", "Digital shade matching", "Trial fit before cementing"],
    highlightsTa: ["ஜிர்கோனியா & E-max", "மெட்டல்-செராமிக்", "டிஜிட்டல் நிற பொருத்தம்", "நிரந்தரமாக்கும் முன் சோதனை"],
    faqs: [
      faq("How long does a crown take?", "Usually two visits about a week apart; a temporary crown protects the tooth in between.", "எத்தனை நாட்கள் ஆகும்?", "பொதுவாக ஒரு வாரம் இடைவெளியில் இரண்டு முறை வருகை."),
      faq("Crown or bridge for a missing tooth?", "An implant with a crown preserves neighbouring teeth; a bridge is faster but requires trimming the adjacent teeth.", "கிரீடமா பாலமா?", "இம்ப்ளான்ட் அருகிலுள்ள பற்களை பாதுகாக்கும்; பாலம் விரைவானது ஆனால் அருகில் உள்ள பற்களை சீவ வேண்டும்."),
      faq("Can crowns stain?", "Ceramic crowns resist staining, but the surrounding natural teeth can darken over time.", "கிரீடம் நிறம் மாறுமா?", "செராமிக் நிறம் மாறாது; இயற்கை பற்கள் மாறலாம்."),
    ],
  },
  {
    slug: "digital-smile-design",
    icon: "Zap",
    en: "Digital Smile Design",
    ta: "டிஜிட்டல் புன்னகை வடிவமைப்பு",
    descEn: "Computer-aided smile planning and facial esthetics",
    descTa: "கணினி புன்னகை திட்டமிடல் மற்றும் முக அழகியல்",
    aboutEn:
      "We photograph and scan your smile, then design the final result on screen before any treatment begins, so you can see and approve the outcome in advance.",
    aboutTa:
      "உங்கள் புன்னகையை படமெடுத்து ஸ்கேன் செய்து, சிகிச்சை தொடங்கும் முன்பே இறுதி முடிவை திரையில் பார்த்து ஒப்புதல் அளிக்கலாம்.",
    highlightsEn: ["Photo & video smile analysis", "On-screen design preview", "Mock-up trial smile", "Predictable final result"],
    highlightsTa: ["புகைப்பட பகுப்பாய்வு", "திரையில் முன்னோட்டம்", "சோதனை புன்னகை", "நம்பகமான முடிவு"],
    faqs: [
      faq("Is the preview accurate?", "It is a close guide to the final result, refined further with a physical mock-up in your mouth.", "முன்னோட்டம் சரியாக இருக்குமா?", "மிக நெருக்கமாக இருக்கும்; வாயில் சோதனை மூலம் மேலும் சரிசெய்யப்படும்."),
      faq("Does it cost extra?", "Design planning is included when you proceed with the smile treatment.", "கூடுதல் கட்டணமா?", "சிகிச்சை தொடர்ந்தால் வடிவமைப்பு சேர்க்கப்பட்டுள்ளது."),
    ],
  },
  {
    slug: "cbct-imaging",
    icon: "Scan",
    en: "CBCT Imaging",
    ta: "CBCT படமெடுப்பு",
    descEn: "3D cone beam CT, RVG dental X-ray",
    descTa: "3D CBCT, RVG டென்டல் எக்ஸ்-ரே",
    aboutEn:
      "Cone beam CT gives a three-dimensional view of bone, nerves and sinuses. It is essential for implant planning, impacted teeth and complex root canal anatomy.",
    aboutTa:
      "CBCT எலும்பு, நரம்பு மற்றும் சைனஸ்களை முப்பரிமாணமாக காட்டுகிறது. இம்ப்ளான்ட் திட்டமிடல் மற்றும் சிக்கலான சிகிச்சைகளுக்கு அவசியம்.",
    highlightsEn: ["3D cone beam scan", "Low-dose RVG X-ray", "Reports shared to your patient portal", "Used for implant & surgical planning"],
    highlightsTa: ["3D CBCT ஸ்கேன்", "குறைந்த அளவு RVG", "நோயாளி போர்ட்டலில் அறிக்கை", "அறுவை சிகிச்சை திட்டமிடல்"],
    faqs: [
      faq("Is CBCT radiation safe?", "A dental CBCT uses a small fraction of a medical CT dose and is taken only when it changes treatment.", "கதிர்வீச்சு பாதுகாப்பானதா?", "மருத்துவ CT-யை விட மிகக் குறைவு; தேவைப்பட்டால் மட்டுமே எடுக்கப்படும்."),
      faq("How long does the scan take?", "The scan itself takes under a minute and you stay seated or standing still.", "எவ்வளவு நேரம்?", "ஒரு நிமிடத்திற்கும் குறைவு."),
      faq("Can I get a copy?", "Yes, scans and reports are uploaded to your patient portal.", "நகல் கிடைக்குமா?", "ஆம், நோயாளி போர்ட்டலில் பதிவேற்றப்படும்."),
    ],
  },
  {
    slug: "oral-surgery",
    icon: "Scissors",
    en: "Oral Surgery",
    ta: "வாய் அறுவை சிகிச்சை",
    descEn: "Wisdom teeth extraction, minor oral surgery",
    descTa: "ஞான பல் அகற்றல், சிறு அறுவை சிகிச்சை",
    aboutEn:
      "Impacted wisdom teeth, retained roots, cysts and minor jaw procedures are handled in-clinic under local anaesthesia with careful post-operative care instructions.",
    aboutTa:
      "ஞான பற்கள், மீதமுள்ள வேர்கள், நீர்க்கட்டிகள் ஆகியவை கிளினிக்கிலேயே மரத்துப்போகும் மருந்துடன் சிகிச்சை அளிக்கப்படுகிறது.",
    highlightsEn: ["Impacted wisdom tooth removal", "Surgical extractions", "Cyst & lesion removal", "Detailed aftercare support"],
    highlightsTa: ["ஞான பல் அகற்றல்", "அறுவை சிகிச்சை மூலம் பல் எடுத்தல்", "நீர்க்கட்டி நீக்கம்", "பின் பராமரிப்பு ஆலோசனை"],
    faqs: [
      faq("How long is recovery after extraction?", "Swelling settles in 2-3 days and most people return to normal routine the next day.", "குணமாக எவ்வளவு நாட்கள்?", "வீக்கம் 2-3 நாட்களில் குறையும்; அடுத்த நாளே வழக்கமான வேலைக்கு திரும்பலாம்."),
      faq("What should I eat afterwards?", "Cool, soft food for 24 hours. Avoid hot drinks, straws, spitting and smoking.", "என்ன சாப்பிடலாம்?", "24 மணி நேரம் குளிர்ந்த மென்மையான உணவு; சூடான பானம், ஸ்ட்ரா, புகைப்பிடித்தல் தவிர்க்கவும்."),
      faq("Do all wisdom teeth need removal?", "No. Only those causing pain, decay, gum infection or crowding are removed.", "எல்லா ஞான பற்களும் எடுக்க வேண்டுமா?", "இல்லை. பிரச்சனை ஏற்படுத்துபவை மட்டுமே."),
    ],
  },
  {
    slug: "pediatric-dentistry",
    icon: "Baby",
    en: "Pediatric Dentistry",
    ta: "குழந்தை பல் மருத்துவம்",
    descEn: "Child dentistry, anterior teeth, space maintainers",
    descTa: "குழந்தை பல் மருத்துவம், ஸ்பேஸ் மெயின்டெய்னர்கள்",
    aboutEn:
      "Gentle, child-friendly care covering fluoride application, pit and fissure sealants, milk-tooth fillings, pulpectomy and space maintainers after early tooth loss.",
    aboutTa:
      "குழந்தைகளுக்கு ஏற்ற மென்மையான சிகிச்சை: புளோரைடு, சீலண்ட், பால் பல் நிரப்புதல், ஸ்பேஸ் மெயின்டெய்னர்.",
    highlightsEn: ["Fluoride & sealants", "Milk tooth fillings", "Habit-breaking appliances", "Behaviour-friendly approach"],
    highlightsTa: ["புளோரைடு & சீலண்ட்", "பால் பல் நிரப்புதல்", "பழக்க திருத்தும் கருவிகள்", "குழந்தை நட்பு அணுகுமுறை"],
    faqs: [
      faq("When should a child first see a dentist?", "By the first birthday, or within six months of the first tooth appearing.", "எப்போது முதல் வருகை?", "முதல் பிறந்தநாளுக்குள் அல்லது முதல் பல் வந்த ஆறு மாதங்களுக்குள்."),
      faq("Do milk teeth with decay need treatment?", "Yes. Untreated decay causes pain, infection and can damage the permanent tooth developing below.", "பால் பல்லுக்கு சிகிச்சை தேவையா?", "ஆம். சிகிச்சை இல்லாவிட்டால் நிரந்தர பல்லும் பாதிக்கப்படும்."),
    ],
  },
  {
    slug: "dentures",
    icon: "CircleDot",
    en: "Dentures",
    ta: "செயற்கை பற்கள்",
    descEn: "Artificial teeth, full mouth rehabilitation",
    descTa: "செயற்கை பற்கள், முழு வாய் மறுவாழ்வு",
    aboutEn:
      "Complete and partial dentures restore chewing and facial support. Implant-supported overdentures are available when a conventional denture feels loose.",
    aboutTa:
      "முழு மற்றும் பகுதி செயற்கை பற்கள் மெல்லும் திறனை மீட்கின்றன. தளர்வாக இருந்தால் இம்ப்ளான்ட் ஆதரவு பற்கள் கிடைக்கும்.",
    highlightsEn: ["Complete & partial dentures", "Flexible / BPS options", "Implant-supported overdentures", "Repairs & relining"],
    highlightsTa: ["முழு & பகுதி பற்கள்", "நெகிழ்வான வகைகள்", "இம்ப்ளான்ட் ஆதரவு", "பழுது & ரிலைனிங்"],
    faqs: [
      faq("How long to get used to dentures?", "Two to four weeks for speech and chewing to feel natural.", "பழக எவ்வளவு நாள்?", "இரண்டு முதல் நான்கு வாரங்கள்."),
      faq("Can dentures be made in a week?", "Yes, most conventional dentures are delivered within 5-7 days across a few visits.", "ஒரு வாரத்தில் கிடைக்குமா?", "ஆம், பொதுவாக 5-7 நாட்களில்."),
    ],
  },
  {
    slug: "tooth-jewellery",
    icon: "Gem",
    en: "Tooth Jewellery",
    ta: "பல் நகை",
    descEn: "Cosmetic tooth jewellery and accessories",
    descTa: "அழகு பல் நகைகள்",
    aboutEn:
      "A small crystal is bonded to the enamel surface with no drilling. It is painless, fully reversible and takes about fifteen minutes.",
    aboutTa:
      "சிறிய படிகம் பல் மேற்பரப்பில் ஒட்டப்படுகிறது; துளையிடல் இல்லை, வலியில்லை, 15 நிமிடங்களில் முடியும்.",
    highlightsEn: ["No drilling, no pain", "Removable any time", "15-minute appointment", "Wide crystal selection"],
    highlightsTa: ["துளையிடல் இல்லை", "எப்போது வேண்டுமானாலும் நீக்கலாம்", "15 நிமிட சிகிச்சை", "பல வகை படிகங்கள்"],
    faqs: [
      faq("Does it harm the tooth?", "No. It is bonded like an orthodontic bracket and leaves the enamel intact when removed.", "பல்லுக்கு பாதிப்பா?", "இல்லை. நீக்கிய பின்னும் பல் பாதுகாப்பாக இருக்கும்."),
      faq("How long does it stay?", "Typically six months to a year, sometimes longer.", "எவ்வளவு காலம் இருக்கும்?", "பொதுவாக ஆறு மாதம் முதல் ஒரு வருடம்."),
    ],
  },
  {
    slug: "oral-cancer-screening",
    icon: "Search",
    en: "Oral Cancer Screening",
    ta: "வாய் புற்றுநோய் பரிசோதனை",
    descEn: "Oral cancer screening and surgical intervention",
    descTa: "வாய் புற்றுநோய் பரிசோதனை மற்றும் அறுவை சிகிச்சை",
    aboutEn:
      "A quick, painless examination of the cheeks, tongue, palate and throat for early signs of pre-cancerous change — especially important for tobacco and areca nut users.",
    aboutTa:
      "கன்னம், நாக்கு, அண்ணம் மற்றும் தொண்டையை விரைவாக, வலியின்றி பரிசோதிப்பது. புகையிலை/பாக்கு பயன்படுத்துபவர்களுக்கு மிக முக்கியம்.",
    highlightsEn: ["Painless 5-minute screening", "Tobacco cessation counselling", "Biopsy & referral when needed", "Regular follow-up"],
    highlightsTa: ["5 நிமிட பரிசோதனை", "புகையிலை நிறுத்த ஆலோசனை", "தேவைப்பட்டால் பயாப்ஸி", "தொடர் கண்காணிப்பு"],
    faqs: [
      faq("Who should be screened?", "Anyone using tobacco, areca nut or alcohol, and anyone with a mouth ulcer lasting over two weeks.", "யார் பரிசோதிக்க வேண்டும்?", "புகையிலை, பாக்கு, மது பயன்படுத்துபவர்கள்; இரண்டு வாரங்களுக்கு மேல் புண் இருந்தால்."),
      faq("Is a white or red patch serious?", "It needs assessment. Many are harmless, but persistent patches must be examined and sometimes biopsied.", "வெள்ளை/சிவப்பு புள்ளி ஆபத்தானதா?", "பரிசோதனை தேவை. பல பாதிப்பில்லாதவை, ஆனால் நீடித்தால் ஆய்வு அவசியம்."),
    ],
  },
  {
    slug: "gum-surgery",
    icon: "Syringe",
    en: "Gum Surgery",
    ta: "ஈறு அறுவை சிகிச்சை",
    descEn: "Post and core, filling and restoration",
    descTa: "ஈறு சிகிச்சை, நிரப்புதல் மற்றும் மறுசீரமைப்பு",
    aboutEn:
      "Treatment for bleeding, receding or swollen gums — from deep cleaning and curettage to flap surgery and gum grafting for advanced periodontitis.",
    aboutTa:
      "இரத்தம் வடியும், பின்வாங்கும் அல்லது வீங்கிய ஈறுகளுக்கு ஆழ்ந்த சுத்தம் முதல் ஃபிளாப் அறுவை சிகிச்சை வரை.",
    highlightsEn: ["Deep cleaning & root planing", "Flap surgery", "Gum grafting & depigmentation", "Maintenance programme"],
    highlightsTa: ["ஆழ்ந்த சுத்தம்", "ஃபிளாப் அறுவை சிகிச்சை", "ஈறு ஒட்டுதல்", "தொடர் பராமரிப்பு"],
    faqs: [
      faq("Why do my gums bleed?", "Almost always from plaque and tartar causing gingivitis. It is reversible if treated early.", "ஈறு ஏன் இரத்தம் வடிகிறது?", "பெரும்பாலும் படிவுகளால் ஏற்படும் ஈறு அழற்சி; ஆரம்பத்திலேயே சரிசெய்யலாம்."),
      faq("Can loose teeth be saved?", "Often yes, with gum treatment and splinting, if enough bone support remains.", "தளர்ந்த பல்லை காப்பாற்ற முடியுமா?", "எலும்பு ஆதரவு இருந்தால் பெரும்பாலும் முடியும்."),
    ],
  },
  {
    slug: "geriatric-dentistry",
    icon: "Eye",
    en: "Geriatric Dentistry",
    ta: "முதியோர் பல் மருத்துவம்",
    descEn: "Specialized dental care for elderly patients",
    descTa: "முதியோருக்கான சிறப்பு பல் சிகிச்சை",
    aboutEn:
      "Care designed around older patients: dry mouth management, denture comfort, root caries, and coordination with medical conditions and blood thinners. Home visits are available through Smile on the Go.",
    aboutTa:
      "முதியோருக்கான சிறப்பு பராமரிப்பு: வறண்ட வாய், செயற்கை பல் வசதி, வேர் சொத்தை மற்றும் மருத்துவ நிலைகளுடன் ஒருங்கிணைப்பு. வீட்டு வருகையும் உண்டு.",
    highlightsEn: ["Home visits available", "Denture comfort & relining", "Dry mouth management", "Safe care with medical conditions"],
    highlightsTa: ["வீட்டு வருகை", "செயற்கை பல் வசதி", "வறண்ட வாய் சிகிச்சை", "மருத்துவ நிலைகளுக்கு ஏற்ற பாதுகாப்பு"],
    faqs: [
      faq("Do you visit patients at home?", "Yes. Our Smile on the Go service brings check-ups and simple treatment to patients with limited mobility.", "வீட்டிற்கு வருவீர்களா?", "ஆம். Smile on the Go சேவை மூலம் வீட்டிலேயே சிகிச்சை."),
      faq("Is treatment safe on blood thinners?", "Usually yes, with planning. Bring your medication list and we coordinate with your physician.", "இரத்த மெல்லிய மருந்து எடுத்தால் பாதுகாப்பானதா?", "பொதுவாக ஆம். மருந்து பட்டியலை கொண்டு வாருங்கள்."),
    ],
  },
];

export const getService = (slug?: string) => services.find((s) => s.slug === slug);
