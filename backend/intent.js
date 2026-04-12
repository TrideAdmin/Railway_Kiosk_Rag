// // intent.js — Railway Enquiry Intent Engine
// // Now returns { intent, response, intentData } where:
// //   - intent      → intent label (string)
// //   - response    → static fallback text (used if Sarvam Chat fails)
// //   - intentData  → JSON-stringified structured facts for Sarvam Chat to use
// // Supports: English (en-IN), Hindi (hi-IN), Telugu (te-IN)

// const TRAINS = [
//   { number:"12951", name:"Mumbai Rajdhani",      nameHindi:"मुंबई राजधानी",         nameTelugu:"ముంబై రాజ్‌ధాని",          from:"Mumbai Central", to:"New Delhi",        scheduledArrival:"08:35", actualArrival:"08:52", scheduledDeparture:"08:45", actualDeparture:"09:02", platform:3, status:"delayed",  delay:17, type:"arriving"  },
//   { number:"12002", name:"Bhopal Shatabdi",      nameHindi:"भोपाल शताब्दी",          nameTelugu:"భోపాల్ శతాబ్ది",           from:"New Delhi",      to:"Habibganj",        scheduledArrival:"10:00", actualArrival:"10:00", scheduledDeparture:"06:00", actualDeparture:"06:00", platform:1, status:"on-time", delay:0,  type:"departing" },
//   { number:"22691", name:"Rajdhani Express",     nameHindi:"राजधानी एक्सप्रेस",      nameTelugu:"రాజ్‌ధాని ఎక్స్‌ప్రెస్",  from:"Bangalore",      to:"New Delhi",        scheduledArrival:"20:00", actualArrival:"21:30", scheduledDeparture:"20:10", actualDeparture:"21:40", platform:5, status:"delayed",  delay:90, type:"passing"   },
//   { number:"12301", name:"Howrah Rajdhani",      nameHindi:"हावड़ा राजधानी",          nameTelugu:"హౌరా రాజ్‌ధాని",           from:"Howrah",         to:"New Delhi",        scheduledArrival:"09:55", actualArrival:"09:55", scheduledDeparture:"10:05", actualDeparture:"10:05", platform:2, status:"on-time", delay:0,  type:"arriving"  },
//   { number:"19027", name:"Vivek Express",        nameHindi:"विवेक एक्सप्रेस",         nameTelugu:"వివేక్ ఎక్స్‌ప్రెస్",     from:"Dibrugarh",      to:"Kanyakumari",      scheduledArrival:"14:20", actualArrival:"15:05", scheduledDeparture:"14:30", actualDeparture:"15:15", platform:6, status:"delayed",  delay:45, type:"passing"   },
//   { number:"12563", name:"Bihar Sampark Kranti", nameHindi:"बिहार संपर्क क्रांति",   nameTelugu:"బీహార్ సంపర్క్ క్రాంతి",  from:"New Delhi",      to:"Rajendranagar",    scheduledArrival:"11:00", actualArrival:"11:00", scheduledDeparture:"11:05", actualDeparture:"11:05", platform:4, status:"on-time", delay:0,  type:"departing" },
//   { number:"17064", name:"Ajanta Express",       nameHindi:"अजंता एक्सप्रेस",         nameTelugu:"అజంతా ఎక్స్‌ప్రెస్",      from:"Secunderabad",   to:"Mumbai CSMT",      scheduledArrival:"13:10", actualArrival:"13:10", scheduledDeparture:"13:20", actualDeparture:"13:20", platform:3, status:"on-time", delay:0,  type:"departing" },
//   { number:"12723", name:"AP Express",           nameHindi:"एपी एक्सप्रेस",           nameTelugu:"ఏపీ ఎక్స్‌ప్రెస్",        from:"Hyderabad",      to:"Hazrat Nizamuddin",scheduledArrival:"07:30", actualArrival:"07:45", scheduledDeparture:"07:40", actualDeparture:"07:55", platform:1, status:"delayed",  delay:15, type:"arriving"  },
// ];

// const PLATFORM_FACILITIES = {
//   1: { food:["Juice Corner (near gate 1A)","Amul Parlour (mid-platform)"], washroom:["Near gate 1A (paid)","End of platform 1"], cloakroom:["Main cloakroom near gate 1 – open 24h"], waiting:["AC Waiting Hall – ground floor near gate 1"], escalator:["Gate 1 escalator (up only)"], atm:["SBI ATM near ticket counter"], pharmacy:[] },
//   2: { food:["Café Coffee Day (platform 2 entry)","Railway Canteen (mid)"], washroom:["Platform 2 – near footbridge"], cloakroom:[], waiting:["Open waiting benches"], escalator:["Footbridge escalator (both sides)"], atm:[], pharmacy:[] },
//   3: { food:["IRCTC Food Stall","Hot Meals Counter","Bisleri water stall"], washroom:["Platform 3 – near IRCTC stall (free)","End of platform 3"], cloakroom:["Cloak room near platform 3 ramp – ₹30/hr"], waiting:["Platform 3 waiting shed"], escalator:["Main escalator (platform 3 ↔ overbridge)"], atm:["HDFC ATM near ramp"], pharmacy:["MedPlus counter near gate 3"] },
//   4: { food:["Snack stall near platform 4 exit"], washroom:["Platform 4 – near exit gate"], cloakroom:[], waiting:["Covered waiting area"], escalator:[], atm:[], pharmacy:[] },
//   5: { food:["Food Court (large – 20 items)","Domino's Express","Chai & Snack corner"], washroom:["Platform 5 – near food court (paid)","Disabled-friendly washroom near ramp"], cloakroom:["Cloak room – platform 5 entry – open 6am–11pm"], waiting:["AC Lounge near platform 5 (₹50 entry)","General waiting shed"], escalator:["Escalator up/down near food court"], atm:["Axis Bank ATM inside food court"], pharmacy:["Apollo Pharmacy – platform 5 end"] },
//   6: { food:["Tea/Coffee vending machine","Snack cart"], washroom:["Platform 6 – start of platform"], cloakroom:[], waiting:["Waiting benches near gate 6"], escalator:[], atm:[], pharmacy:[] },
// };

// const TRAIN_NAME_ALIASES = [
//   { aliases:["mumbai rajdhani","12951","मुंबई राजधानी","ముంబై రాజ్‌ధాని"], number:"12951" },
//   { aliases:["bhopal shatabdi","12002","भोपाल शताब्दी","భోపాల్ శతాబ్ది"], number:"12002" },
//   { aliases:["rajdhani express","22691","राजधानी एक्सप्रेस","రాజ్‌ధాని ఎక్స్‌ప్రెస్","rajdhani"], number:"22691" },
//   { aliases:["howrah rajdhani","12301","हावड़ा राजधानी","హౌరా రాజ్‌ధాని"], number:"12301" },
//   { aliases:["vivek express","19027","विवेक एक्सप्रेस","వివేక్ ఎక్స్‌ప్రెస్","vivek"], number:"19027" },
//   { aliases:["bihar sampark","12563","बिहार संपर्क क्रांति","బీహార్ సంపర్క్ క్రాంతి","sampark kranti"], number:"12563" },
//   { aliases:["ajanta express","17064","अजंता एक्सप्रेस","అజంతా ఎక్స్‌ప్రెస్","ajanta"], number:"17064" },
//   { aliases:["ap express","12723","एपी एक्सप्रेस","ఏపీ ఎక్స్‌ప్రెస్","andhra pradesh express"], number:"12723" },
// ];

// // ── Helpers ─────────────────────────────────────────────────────────────────

// function findTrainByName(text) {
//   const lower = text.toLowerCase();
//   const numMatch = lower.match(/\b(\d{5})\b/);
//   if (numMatch) return TRAINS.find(t => t.number === numMatch[1]) || null;
//   for (const entry of TRAIN_NAME_ALIASES) {
//     if (entry.aliases.some(a => lower.includes(a.toLowerCase()))) {
//       return TRAINS.find(t => t.number === entry.number) || null;
//     }
//   }
//   return null;
// }

// function getLangBase(lang) {
//   if (lang === "hi-IN" || lang === "hi") return "hi";
//   if (lang === "te-IN" || lang === "te") return "te";
//   return "en";
// }

// function g(base, en, hi, te) {
//   if (base === "hi") return hi;
//   if (base === "te") return te;
//   return en;
// }

// /** Serialize an object to a readable key: value string for the AI */
// function toDataString(obj) {
//   return JSON.stringify(obj, null, 2);
// }

// // ── Main export ──────────────────────────────────────────────────────────────

// /**
//  * Detect the intent from user text.
//  *
//  * Returns:
//  *   intent      - intent label
//  *   response    - static fallback text (used when Sarvam Chat is unavailable)
//  *   intentData  - JSON string with all extracted facts for Sarvam Chat
//  */

// // ── Number to words converter ────────────────────────────────────────────────
// function numberToWords(num, lang) {
//   const numStr = num.toString().split("").join(" ");
//   if (lang === "en") return numStr;

//   const digits = {
//     hi: ["शून्य","एक","दो","तीन","चार","पाँच","छह","सात","आठ","नौ"],
//     te: ["సున్న","ఒకటి","రెండు","మూడు","నాలుగు","అయిదు","ఆరు","ఏడు","ఎనిమిది","తొమ్మిది"],
//   };

//   const words = digits[lang];
//   if (!words) return numStr;

//   // Speak each digit separately: 12951 → "एक दो नौ पाँच एक"
//   return num.toString().split("").map(d => words[parseInt(d)]).join(" ");
// }

// function detectIntent(text, language = "en-IN") {
//   const base = getLangBase(language);
//   const n = (number) => numberToWords(number, base);
//   const lower = (text || "").toLowerCase().trim();

//   // ── Empty input ─────────────────────────────────────────────────────────────
//   if (!lower) {
//     return {
//       intent: "fallback",
//       intentData: toDataString({ topic: "no_input" }),
//       response: g(base,
//         "Please ask about a train number, platform, timing or facilities.",
//         "कृपया ट्रेन नंबर, प्लेटफॉर्म, समय या सुविधाओं के बारे में पूछें।",
//         "దయచేసి ట్రెయిన్ నంబర్, ప్లాట్‌ఫారం లేదా సౌకర్యాల గురించి అడగండి."),
//     };
//   }

//   // ── Greeting ─────────────────────────────────────────────────────────────────
//   if (/\b(hello|hi|hey|namaste|नमस्ते|నమస్కారం|good morning|good evening)\b/i.test(lower)) {
//     return {
//       intent: "greeting",
//       intentData: toDataString({ topic: "greeting" }),
//       response: g(base,
//         "Hello! Welcome to the Railway Enquiry System. How can I help you?",
//         "नमस्ते! रेलवे पूछताछ प्रणाली में आपका स्वागत है।",
//         "నమస్కారం! రైల్వే విచారణ వ్యవస్థకు స్వాగతం."),
//     };
//   }

//   // ── Farewell ──────────────────────────────────────────────────────────────────
//   if (/\b(bye|goodbye|thank you|thanks|धन्यवाद|अलविदा|ధన్యవాదాలు|వీడ్కోలు)\b/i.test(lower)) {
//     return {
//       intent: "farewell",
//       intentData: toDataString({ topic: "farewell" }),
//       response: g(base,
//         "Thank you for using the Railway Enquiry System. Have a safe journey!",
//         "धन्यवाद। सुरक्षित यात्रा करें!",
//         "ధన్యవాదాలు. సురక్షితమైన ప్రయాణం!"),
//     };
//   }

//   // ── PNR ───────────────────────────────────────────────────────────────────────
//   if (/\b(pnr|पीएनआर|పీఎన్ఆర్)\b/i.test(lower)) {
//     return {
//       intent: "pnr_status",
//       intentData: toDataString({ topic: "pnr_status", helpline: "139", website: "indianrailways.gov.in" }),
//       response: g(base,
//         "To check your PNR status, visit the Indian Railways website or call 139.",
//         "पीएनआर स्थिति जांचने के लिए भारतीय रेलवे की वेबसाइट पर जाएं या 139 पर कॉल करें।",
//         "పీఎన్‌ఆర్ స్థితి కోసం భారతీయ రైల్వే వెబ్‌సైట్‌ను సందర్శించండి లేదా 139 కి కాల్ చేయండి."),
//     };
//   }

//   // ── Ticket booking ────────────────────────────────────────────────────────────
//   if (/ticket|booking|reservation|टिकट|బుకింగ్/i.test(lower)) {
//     return {
//       intent: "ticket_info",
//       intentData: toDataString({ topic: "ticket_booking", counter: "near main entrance", online: "IRCTC website or app", helpline: "139" }),
//       response: g(base,
//         "Ticket counters are near the main entrance. Book online via IRCTC or call 139.",
//         "टिकट काउंटर मुख्य प्रवेश के पास हैं। आईआरसीटीसी पर ऑनलाइन बुकिंग भी कर सकते हैं।",
//         "టికెట్ కౌంటర్లు ప్రధాన ప్రవేశద్వారం దగ్గర ఉన్నాయి. IRCTC ద్వారా ఆన్‌లైన్‌లో బుక్ చేయవచ్చు."),
//     };
//   }

//   // ── Train search by destination ───────────────────────────────────────────────
//   const isTrainSearch = /train|trains|available|ट्रेन|రైలు/.test(lower);
//   let destination = null;
//   const enMatch = /to\s+([a-z]+(?:\s+[a-z]+)?)/.exec(lower);
//   const hiMatch = /([^\s]+)\s+के लिए/.exec(text);
//   const teMatch = /([^\s]+)\s+(కు|కి)/.exec(text);
//   if (enMatch) destination = enMatch[1].trim();
//   else if (hiMatch) destination = hiMatch[1].trim();
//   else if (teMatch) destination = teMatch[1].trim();

//   const cityMap = {
//     "delhi":"new delhi","दिल्ली":"new delhi","దిల్లీ":"new delhi",
//     "mumbai":"mumbai central","मुंबई":"mumbai central","ముంబై":"mumbai central",
//     "hyderabad":"hyderabad","हैदराबाद":"hyderabad","హైదరాబాద్":"hyderabad",
//   };
//   if (destination) { const k = destination.toLowerCase(); if (cityMap[k]) destination = cityMap[k]; }

//   if (isTrainSearch && destination) {
//     const matched = TRAINS.filter(t => t.to.toLowerCase().includes(destination.toLowerCase()));
//     if (matched.length === 0) {
//       return {
//         intent: "train_search",
//         intentData: toDataString({ topic: "train_search", destination, trains_found: [] }),
//         response: g(base,
//           `No trains found to ${destination}.`,
//           `${destination} के लिए कोई ट्रेन नहीं मिली।`,
//           `${destination} కు రైళ్లు లేవు.`),
//       };
//     }
//     const trainList = matched.map(t => ({
//       number: t.number, name: t.name,
//       platform: t.platform, status: t.status, delay: t.delay,
//       arrival: t.actualArrival, departure: t.actualDeparture,
//     }));
//     return {
//       intent: "train_search",
//       intentData: toDataString({ topic: "train_search", destination, trains_found: trainList }),
//       response: g(base,
//         `Available trains to ${destination}: ${matched.map(t=>`${t.name} (${t.number})`).join(", ")}.`,
//         `${destination} के लिए उपलब्ध ट्रेनें: ${matched.map(t=>`${t.name} (${t.number})`).join(", ")}।`,
//         `${destination} కు వెళ్లే రైళ్లు: ${matched.map(t=>`${t.name} (${t.number})`).join(", ")}.`),
//     };
//   }

//   // ── Platform number extraction ─────────────────────────────────────────────────
//   // Handles: "platform 3", "3 platform", "प्लेटफॉर्म 3", "3 प्लेटफॉर्म", "ప్లాట్‌ఫారం 3"
// const pfRaw = lower.match(/platform\s*(?:no\.?|number)?\s*(\d+)|(\d+)\s*(?:नंबर\s*)?(?:प्लेटफॉर्म|platform)|(?:प्लेटफॉर्म|ప్లాట్‌ఫారం)\s*(\d+)/i);
//   const pfNum = pfRaw ? parseInt(pfRaw[1] || pfRaw[2] || pfRaw[3]) : null;

//   // ── Facility flags ──────────────────────────────────────────────────────────────
//   const isFoodQ      = /food|eat|stall|restaurant|canteen|cafe|snack|खाना|భోజనం/i.test(lower);
//   const isWashroomQ  = /washroom|toilet|restroom|bathroom|శౌచాలయం|వాష్‌రూమ్/i.test(lower);
//   const isCloakQ     = /cloak|luggage|locker/i.test(lower);
//   const isWaitingQ   = /waiting|lounge|wait/i.test(lower);
//   const isEscalatorQ = /escalat|lift|elevator/i.test(lower);
//   const isAnyFacility = isFoodQ || isWashroomQ || isCloakQ || isWaitingQ || isEscalatorQ;

//   // ── Timing flags ────────────────────────────────────────────────────────────────
//   const isArrivalQ   = /arriv|reach|incoming|आगमन|రాక/i.test(lower);
//   const isDepartureQ = /depart|leav|going|प्रस्थान|వెళ్తుంది/i.test(lower);
//   const isTimingQ    = /time|when|schedule|कब|ఎప్పుడు/i.test(lower);
//   const isWhereQ     = /where|कहाँ|ఎక్కడ/i.test(lower);
//   const isPlatformQ  = /platform|प्लेटफॉर्म|ప్లాట్‌ఫారం/i.test(lower);

//   // ── Find train ─────────────────────────────────────────────────────────────────
//   const train = findTrainByName(lower);

//   if (train) {
//     const trainInfo = {
//       number: train.number,
//       name: train.name,
//       from: train.from,
//       to: train.to,
//       platform: train.platform,
//       scheduled_arrival: train.scheduledArrival,
//       actual_arrival: train.actualArrival,
//       scheduled_departure: train.scheduledDeparture,
//       actual_departure: train.actualDeparture,
//       status: train.status,
//       delay_minutes: train.delay,
//       type: train.type,
//     };

//     if (isWhereQ) {
//       return {
//         intent: "train_status",
//         intentData: toDataString({ topic: "train_location", train: trainInfo }),
//         response: g(base,
//           `Train ${train.number} ${train.name} is at Platform ${train.platform}.`,
//           `ट्रेन नंबर ${train.number} ${train.nameHindi} प्लेटफॉर्म ${train.platform} पर है।`,
//           `ట్రెయిన్ నంబర్ ${train.number} ${train.nameTelugu} ప్లాట్‌ఫారం ${train.platform}లో ఉంది.`), 
//       };
//     }

//     if (isPlatformQ && !isTimingQ) {
//       return {
//         intent: "platform_query",
//         intentData: toDataString({ topic: "train_platform", train: trainInfo }),
//         response: g(base,
//           `${train.name}, train number ${train.number}, will arrive at Platform ${train.platform}.`,
//           `${train.nameHindi}, ट्रेन नंबर ${train.number}, प्लेटफॉर्म ${train.platform} पर आएगी।`,
//           `${train.nameTelugu}, రైలు నంబర్ ${train.number}, ప్లాట్‌ఫారం ${train.platform}కి వస్తుంది.`), 
//       };
//     }

//     if (isArrivalQ && !isDepartureQ) {
//       return {
//         intent: "arrival_time",
//         intentData: toDataString({ topic: "train_arrival", train: trainInfo }),
//         response: g(base,
//           `Train ${train.number} ${train.name} arrives at ${train.actualArrival} on Platform ${train.platform}.`,
//           `ट्रेन नंबर ${train.number} ${train.nameHindi} ${train.actualArrival} बजे प्लेटफॉर्म ${train.platform} पर आएगी।`,
//           `ట్రెయిన్ నంబర్ ${train.number} ${train.nameTelugu} ${train.actualArrival}కు ప్లాట్‌ఫారం ${train.platform}కి వస్తుంది.`), 
//       };
//     }

//     if (isDepartureQ && !isArrivalQ) {
//       return {
//         intent: "departure_time",
//         intentData: toDataString({ topic: "train_departure", train: trainInfo }),
//         response: g(base,
//          `Train ${train.number} ${train.name} departs at ${train.actualDeparture} from Platform ${train.platform}.`,
//          `ट्रेन नंबर ${train.number} ${train.nameHindi} ${train.actualDeparture} बजे प्लेटफॉर्म ${train.platform} से जाएगी।`,
//          `ట్రెయిన్ నంబర్ ${train.number} ${train.nameTelugu} ${train.actualDeparture}కు ప్లాట్‌ఫారం ${train.platform} నుంచి వెళ్తుంది.`),
//       };
//     }

//     if (isTimingQ) {
//       return {
//         intent: "timing",
//         intentData: toDataString({ topic: "train_timing", train: trainInfo }),
//         response: g(base,
//           `Train ${train.number} ${train.name} arrives at ${train.actualArrival} and departs at ${train.actualDeparture} from Platform ${train.platform}.`,
//           `ट्रेन ${train.nameHindi} ${train.actualArrival} बजे आएगी और ${train.actualDeparture} बजे प्लेटफॉर्म ${train.platform} से जाएगी।`,
//           `ట్రెయిన్ ${train.nameTelugu} ${train.actualArrival}కు వస్తుంది మరియు ${train.actualDeparture}కు ప్లాట్‌ఫారం ${train.platform} నుంచి వెళ్తుంది.`),
//       };
//     }

//     if (/delay|late|देरी|लेट|ఆలస్యం/i.test(lower)) {
//       return {
//         intent: "train_delay",
//         intentData: toDataString({ topic: "train_delay", train: trainInfo }),
//         response: g(base,
//           train.delay > 0
//             ? `Train ${train.number} ${train.name} is running ${train.delay} minutes late.`
//             : `Train ${train.number} ${train.name} is running on time.`,
//           train.delay > 0
//             ? `ट्रेन ${train.nameHindi} ${train.delay} मिनट देरी से चल रही है।`
//             : `ट्रेन ${train.nameHindi} समय पर चल रही है।`,
//           train.delay > 0
//             ? `ట్రెయిన్ ${train.nameTelugu} ${train.delay} నిమిషాలు ఆలస్యంగా వస్తుంది.`
//             : `ట్రెయిన్ ${train.nameTelugu} సమయానికి వస్తుంది.`),
//       };
//     }
//     // ── Train number query ──────────────────────────────────────────────────────
//     const isTrainNumberQ = /number|नंबर|నంబర్|no\.|संख्या|సంఖ్య/i.test(lower);
//     if (isTrainNumberQ) {
//       return {
//         intent: "train_number",
//         intentData: toDataString({ topic: "train_number", train: trainInfo }),
//         response: g(base,
//       `${train.name} train number is ${train.number}. It runs from ${train.from} to ${train.to} on Platform ${train.platform}.`,
//       `${train.nameHindi} का ट्रेन नंबर ${train.number} है। यह ${train.from} से ${train.to} तक प्लेटफॉर्म ${train.platform} पर चलती है।`,
//       `${train.nameTelugu} రైలు నంబర్ ${train.number}. ఇది ${train.from} నుండి ${train.to} వరకు ప్లాట్‌ఫారం ${train.platform}లో వస్తుంది.`),
//   };
// }

//     // Generic train status — always include train number in all languages
//     return {
//       intent: "train_status",
//       intentData: toDataString({ topic: "train_status", train: trainInfo }),
//       response: g(base,
//         `${train.name}, train number ${train.number}, is at Platform ${train.platform}. Arrival: ${train.actualArrival}, Departure: ${train.actualDeparture}.`,
//         `${train.nameHindi}, ट्रेन नंबर ${train.number}, प्लेटफॉर्म ${train.platform} पर है। आगमन: ${train.actualArrival}, प्रस्थान: ${train.actualDeparture}।`,
//         `${train.nameTelugu}, రైలు నంబర్ ${train.number}, ప్లాట్‌ఫారం ${train.platform}లో ఉంది. రాక: ${train.actualArrival}, నిష్క్రమణ: ${train.actualDeparture}.`),
//     };
//   }
//   // ── Trains at a specific platform ─────────────────────────────────────────────
//   if (pfNum && !isAnyFacility) {
//     const pfTrains = TRAINS.filter(t => t.platform === pfNum);
//     const trainList = pfTrains.map(t => ({ number: t.number, name: t.name, status: t.status, delay: t.delay, arrival: t.actualArrival, departure: t.actualDeparture }));
//     return {
//       intent: "platform_trains",
//       intentData: toDataString({ topic: "platform_trains", platform_number: pfNum, trains: trainList }),
//       response: pfTrains.length === 0
//         ? g(base,
//             `No trains currently at Platform ${cardinal(pfNum)}.`,
//             `प्लेटफॉर्म ${pfNum} पर कोई ट्रेन नहीं है।`,
//             `ప్లాట్‌ఫారం ${pfNum}లో ట్రెయిన్లు లేవు.`)
//         : g(base,
//             `Trains at Platform ${cardinal(pfNum)}: ${pfTrains.map(t=>`${n(t.number)} ${t.name}`).join(", ")}.`,
//             `प्लेटफॉर्म ${pfNum} पर ट्रेनें: ${pfTrains.map(t=>`${t.number} ${t.nameHindi}`).join(", ")}।`,
//             `ప్లాట్‌ఫారం ${pfNum}లో ట్రెయిన్లు: ${pfTrains.map(t=>`${t.number} ${t.nameTelugu}`).join(", ")}.`),
//     };
//   }

//   // ── Facility at a specific platform ───────────────────────────────────────────
//   if (isAnyFacility && pfNum) {
//     const fac = PLATFORM_FACILITIES[pfNum];
//     if (!fac) {
//       return {
//         intent: "facility",
//         intentData: toDataString({ topic: "facility", platform_number: pfNum, available: false }),
//         response: g(base,
//           `Facility info for Platform ${cardinal(pfNum)} not available.`,
//           `प्लेटफॉर्म ${pfNum} के लिए सुविधा जानकारी उपलब्ध नहीं है।`,
//           `ప్లాట్‌ఫారం ${pfNum} కోసం సౌకర్యాల సమాచారం అందుబాటులో లేదు.`),
//       };
//     }

//     const facilityType = isFoodQ ? "food" : isWashroomQ ? "washroom" : isCloakQ ? "cloakroom" : isWaitingQ ? "waiting" : "escalator";
//     const facilityItems = fac[facilityType] || [];
//     const facilityLabels = { food:"Food stalls", washroom:"Washrooms", cloakroom:"Cloak rooms", waiting:"Waiting areas", escalator:"Escalators" };
//     const facilityLabelsHi = { food:"खाने के स्टॉल", washroom:"शौचालय", cloakroom:"क्लोक रूम", waiting:"प्रतीक्षा क्षेत्र", escalator:"एस्केलेटर" };
//     const facilityLabelsTe = { food:"ఆహార స్టాల్లు", washroom:"వాష్‌రూమ్‌లు", cloakroom:"క్లోక్ రూమ్‌లు", waiting:"వేచి ఉండే ప్రాంతాలు", escalator:"ఎస్కలేటర్లు" };

//     return {
//       intent: "facility",
//       intentData: toDataString({
//         topic: "platform_facility",
//         platform_number: pfNum,
//         facility_type: facilityType,
//         items: facilityItems,
//       }),
//       response: facilityItems.length === 0
//         ? g(base,
//             `No ${facilityLabels[facilityType]?.toLowerCase()} at Platform ${cardinal(pfNum)}.`,
//             `प्लेटफॉर्म ${pfNum} पर ${facilityLabelsHi[facilityType]} उपलब्ध नहीं है।`,
//             `ప్లాట్‌ఫారం ${pfNum}లో ${facilityLabelsTe[facilityType]} అందుబాటులో లేదు.`)
//         : g(base,
//             `Platform ${cardinal(pfNum)} – ${facilityLabels[facilityType]}: ${facilityItems.join(" · ")}`,
//             `प्लेटफॉर्म ${pfNum} पर ${facilityLabelsHi[facilityType]}: ${facilityItems.join(" · ")}`,
//             `ప్లాట్‌ఫారం ${pfNum}లో ${facilityLabelsTe[facilityType]}: ${facilityItems.join(" · ")}`),
//     };
//   }

//   // ── Unknown ────────────────────────────────────────────────────────────────────
//   return {
//     intent: "unknown",
//     intentData: toDataString({ topic: "unknown", user_query: text }),
//     response: g(base,
//       "I didn't understand. Ask about a train number, platform, timing or facilities.",
//       "मैं समझ नहीं पाया। कृपया ट्रेन नंबर, प्लेटफॉर्म, समय या सुविधाओं के बारे में पूछें।",
//       "నేను అర్థం చేసుకోలేకపోయాను. దయచేసి ట్రెయిన్, ప్లాట్‌ఫారం లేదా సౌకర్యాల గురించి అడగండి."),
//   };
// }

// module.exports = { detectIntent, TRAINS, PLATFORM_FACILITIES };

// intent.js — Railway Enquiry Intent Engine
// Now returns { intent, response, intentData } where:
//   - intent      → intent label (string)
//   - response    → static fallback text (used if Sarvam Chat fails)
//   - intentData  → JSON-stringified structured facts for Sarvam Chat to use
// Supports: English (en-IN), Hindi (hi-IN), Telugu (te-IN)

// // intent.js — Railway Enquiry Intent Engine
// // Now returns { intent, response, intentData } where:
// //   - intent      → intent label (string)
// //   - response    → static fallback text (used if Sarvam Chat fails)
// //   - intentData  → JSON-stringified structured facts for Sarvam Chat to use
// // Supports: English (en-IN), Hindi (hi-IN), Telugu (te-IN)

// const TRAINS = [
//   { number:"12951", name:"Mumbai Rajdhani",      nameHindi:"मुंबई राजधानी",         nameTelugu:"ముంబై రాజ్‌ధాని",          from:"Mumbai Central", to:"New Delhi",        scheduledArrival:"08:35", actualArrival:"08:52", scheduledDeparture:"08:45", actualDeparture:"09:02", platform:3, status:"delayed",  delay:17, type:"arriving"  },
//   { number:"12002", name:"Bhopal Shatabdi",      nameHindi:"भोपाल शताब्दी",          nameTelugu:"భోపాల్ శతాబ్ది",           from:"New Delhi",      to:"Habibganj",        scheduledArrival:"10:00", actualArrival:"10:00", scheduledDeparture:"06:00", actualDeparture:"06:00", platform:1, status:"on-time", delay:0,  type:"departing" },
//   { number:"22691", name:"Rajdhani Express",     nameHindi:"राजधानी एक्सप्रेस",      nameTelugu:"రాజ్‌ధాని ఎక్స్‌ప్రెస్",  from:"Bangalore",      to:"New Delhi",        scheduledArrival:"20:00", actualArrival:"21:30", scheduledDeparture:"20:10", actualDeparture:"21:40", platform:5, status:"delayed",  delay:90, type:"passing"   },
//   { number:"12301", name:"Howrah Rajdhani",      nameHindi:"हावड़ा राजधानी",          nameTelugu:"హౌరా రాజ్‌ధాని",           from:"Howrah",         to:"New Delhi",        scheduledArrival:"09:55", actualArrival:"09:55", scheduledDeparture:"10:05", actualDeparture:"10:05", platform:2, status:"on-time", delay:0,  type:"arriving"  },
//   { number:"19027", name:"Vivek Express",        nameHindi:"विवेक एक्सप्रेस",         nameTelugu:"వివేక్ ఎక్స్‌ప్రెస్",     from:"Dibrugarh",      to:"Kanyakumari",      scheduledArrival:"14:20", actualArrival:"15:05", scheduledDeparture:"14:30", actualDeparture:"15:15", platform:6, status:"delayed",  delay:45, type:"passing"   },
//   { number:"12563", name:"Bihar Sampark Kranti", nameHindi:"बिहार संपर्क क्रांति",   nameTelugu:"బీహార్ సంపర్క్ క్రాంతి",  from:"New Delhi",      to:"Rajendranagar",    scheduledArrival:"11:00", actualArrival:"11:00", scheduledDeparture:"11:05", actualDeparture:"11:05", platform:4, status:"on-time", delay:0,  type:"departing" },
//   { number:"17064", name:"Ajanta Express",       nameHindi:"अजंता एक्सप्रेस",         nameTelugu:"అజంతా ఎక్స్‌ప్రెస్",      from:"Secunderabad",   to:"Mumbai CSMT",      scheduledArrival:"13:10", actualArrival:"13:10", scheduledDeparture:"13:20", actualDeparture:"13:20", platform:3, status:"on-time", delay:0,  type:"departing" },
//   { number:"12723", name:"AP Express",           nameHindi:"एपी एक्सप्रेस",           nameTelugu:"ఏపీ ఎక్స్‌ప్రెస్",        from:"Hyderabad",      to:"Hazrat Nizamuddin",scheduledArrival:"07:30", actualArrival:"07:45", scheduledDeparture:"07:40", actualDeparture:"07:55", platform:1, status:"delayed",  delay:15, type:"arriving"  },
// ];

// const PLATFORM_FACILITIES = {
//   1: { food:["Juice Corner (near gate 1A)","Amul Parlour (mid-platform)"], washroom:["Near gate 1A (paid)","End of platform 1"], cloakroom:["Main cloakroom near gate 1 – open 24h"], waiting:["AC Waiting Hall – ground floor near gate 1"], escalator:["Gate 1 escalator (up only)"], atm:["SBI ATM near ticket counter"], pharmacy:[] },
//   2: { food:["Café Coffee Day (platform 2 entry)","Railway Canteen (mid)"], washroom:["Platform 2 – near footbridge"], cloakroom:[], waiting:["Open waiting benches"], escalator:["Footbridge escalator (both sides)"], atm:[], pharmacy:[] },
//   3: { food:["IRCTC Food Stall","Hot Meals Counter","Bisleri water stall"], washroom:["Platform 3 – near IRCTC stall (free)","End of platform 3"], cloakroom:["Cloak room near platform 3 ramp – ₹30/hr"], waiting:["Platform 3 waiting shed"], escalator:["Main escalator (platform 3 ↔ overbridge)"], atm:["HDFC ATM near ramp"], pharmacy:["MedPlus counter near gate 3"] },
//   4: { food:["Snack stall near platform 4 exit"], washroom:["Platform 4 – near exit gate"], cloakroom:[], waiting:["Covered waiting area"], escalator:[], atm:[], pharmacy:[] },
//   5: { food:["Food Court (large – 20 items)","Domino's Express","Chai & Snack corner"], washroom:["Platform 5 – near food court (paid)","Disabled-friendly washroom near ramp"], cloakroom:["Cloak room – platform 5 entry – open 6am–11pm"], waiting:["AC Lounge near platform 5 (₹50 entry)","General waiting shed"], escalator:["Escalator up/down near food court"], atm:["Axis Bank ATM inside food court"], pharmacy:["Apollo Pharmacy – platform 5 end"] },
//   6: { food:["Tea/Coffee vending machine","Snack cart"], washroom:["Platform 6 – start of platform"], cloakroom:[], waiting:["Waiting benches near gate 6"], escalator:[], atm:[], pharmacy:[] },
// };

// const TRAIN_NAME_ALIASES = [
//   { aliases:["mumbai rajdhani","12951","मुंबई राजधानी","ముంబై రాజ్‌ధాని"], number:"12951" },
//   { aliases:["bhopal shatabdi","12002","भोपाल शताब्दी","భోపాల్ శతాబ్ది"], number:"12002" },
//   { aliases:["rajdhani express","22691","राजधानी एक्सप्रेस","రాజ్‌ధాని ఎక్స్‌ప్రెస్","rajdhani"], number:"22691" },
//   { aliases:["howrah rajdhani","12301","हावड़ा राजधानी","హౌరా రాజ్‌ధాని"], number:"12301" },
//   { aliases:["vivek express","19027","विवेक एक्सप्रेस","వివేక్ ఎక్స్‌ప్రెస్","vivek"], number:"19027" },
//   { aliases:["bihar sampark","12563","बिहार संपर्क क्रांति","బీహార్ సంపర్క్ క్రాంతి","sampark kranti"], number:"12563" },
//   { aliases:["ajanta express","17064","अजंता एक्सप्रेस","అజంతా ఎక్స్‌ప్రెస్","ajanta"], number:"17064" },
//   { aliases:["ap express","12723","एपी एक्सप्रेस","ఏపీ ఎక్స్‌ప్రెస్","andhra pradesh express"], number:"12723" },
// ];

// // ── Helpers ─────────────────────────────────────────────────────────────────

// function findTrainByName(text) {
//   const lower = text.toLowerCase();
//   const numMatch = lower.match(/\b(\d{5})\b/);
//   if (numMatch) return TRAINS.find(t => t.number === numMatch[1]) || null;
//   for (const entry of TRAIN_NAME_ALIASES) {
//     if (entry.aliases.some(a => lower.includes(a.toLowerCase()))) {
//       return TRAINS.find(t => t.number === entry.number) || null;
//     }
//   }
//   return null;
// }

// function getLangBase(lang) {
//   if (lang === "hi-IN" || lang === "hi") return "hi";
//   if (lang === "te-IN" || lang === "te") return "te";
//   return "en";
// }

// function g(base, en, hi, te) {
//   if (base === "hi") return hi;
//   if (base === "te") return te;
//   return en;
// }

// /** Serialize an object to a readable key: value string for the AI */
// function toDataString(obj) {
//   return JSON.stringify(obj, null, 2);
// }

// // ── Main export ──────────────────────────────────────────────────────────────

// /**
//  * Detect the intent from user text.
//  *
//  * Returns:
//  *   intent      - intent label
//  *   response    - static fallback text (used when Sarvam Chat is unavailable)
//  *   intentData  - JSON string with all extracted facts for Sarvam Chat
//  */

// // ── Number to words converter ────────────────────────────────────────────────
// function numberToWords(num, lang) {
//   const numStr = num.toString().split("").join(" ");
//   if (lang === "en") return numStr;

//   const digits = {
//     hi: ["शून्य","एक","दो","तीन","चार","पाँच","छह","सात","आठ","नौ"],
//     te: ["సున్న","ఒకటి","రెండు","మూడు","నాలుగు","అయిదు","ఆరు","ఏడు","ఎనిమిది","తొమ్మిది"],
//   };

//   const words = digits[lang];
//   if (!words) return numStr;

//   // Speak each digit separately: 12951 → "एक दो नौ पाँच एक"
//   return num.toString().split("").map(d => words[parseInt(d)]).join(" ");
// }

// function detectIntent(text, language = "en-IN") {
//   const base = getLangBase(language);
//   const n = (number) => numberToWords(number, base);
//   const lower = (text || "").toLowerCase().trim();

//   // ── Empty input ─────────────────────────────────────────────────────────────
//   if (!lower) {
//     return {
//       intent: "fallback",
//       intentData: toDataString({ topic: "no_input" }),
//       response: g(base,
//         "Please ask about a train number, platform, timing or facilities.",
//         "कृपया ट्रेन नंबर, प्लेटफॉर्म, समय या सुविधाओं के बारे में पूछें।",
//         "దయచేసి ట్రెయిన్ నంబర్, ప్లాట్‌ఫారం లేదా సౌకర్యాల గురించి అడగండి."),
//     };
//   }

//   // ── Greeting ─────────────────────────────────────────────────────────────────
//   if (/\b(hello|hi|hey|namaste|नमस्ते|నమస్కారం|good morning|good evening)\b/i.test(lower)) {
//     return {
//       intent: "greeting",
//       intentData: toDataString({ topic: "greeting" }),
//       response: g(base,
//         "Hello! Welcome to the Railway Enquiry System. How can I help you?",
//         "नमस्ते! रेलवे पूछताछ प्रणाली में आपका स्वागत है।",
//         "నమస్కారం! రైల్వే విచారణ వ్యవస్థకు స్వాగతం."),
//     };
//   }

//   // ── Farewell ──────────────────────────────────────────────────────────────────
//   if (/\b(bye|goodbye|thank you|thanks|धन्यवाद|अलविदा|ధన్యవాదాలు|వీడ్కోలు)\b/i.test(lower)) {
//     return {
//       intent: "farewell",
//       intentData: toDataString({ topic: "farewell" }),
//       response: g(base,
//         "Thank you for using the Railway Enquiry System. Have a safe journey!",
//         "धन्यवाद। सुरक्षित यात्रा करें!",
//         "ధన్యవాదాలు. సురక్షితమైన ప్రయాణం!"),
//     };
//   }

//   // ── PNR ───────────────────────────────────────────────────────────────────────
//   if (/\b(pnr|पीएनआर|పీఎన్ఆర్)\b/i.test(lower)) {
//     return {
//       intent: "pnr_status",
//       intentData: toDataString({ topic: "pnr_status", helpline: "139", website: "indianrailways.gov.in" }),
//       response: g(base,
//         "To check your PNR status, visit the Indian Railways website or call 139.",
//         "पीएनआर स्थिति जांचने के लिए भारतीय रेलवे की वेबसाइट पर जाएं या 139 पर कॉल करें।",
//         "పీఎన్‌ఆర్ స్థితి కోసం భారతీయ రైల్వే వెబ్‌సైట్‌ను సందర్శించండి లేదా 139 కి కాల్ చేయండి."),
//     };
//   }

//   // ── Ticket booking ────────────────────────────────────────────────────────────
//   if (/ticket|booking|reservation|टिकट|బుకింగ్/i.test(lower)) {
//     return {
//       intent: "ticket_info",
//       intentData: toDataString({ topic: "ticket_booking", counter: "near main entrance", online: "IRCTC website or app", helpline: "139" }),
//       response: g(base,
//         "Ticket counters are near the main entrance. Book online via IRCTC or call 139.",
//         "टिकट काउंटर मुख्य प्रवेश के पास हैं। आईआरसीटीसी पर ऑनलाइन बुकिंग भी कर सकते हैं।",
//         "టికెట్ కౌంటర్లు ప్రధాన ప్రవేశద్వారం దగ్గర ఉన్నాయి. IRCTC ద్వారా ఆన్‌లైన్‌లో బుక్ చేయవచ్చు."),
//     };
//   }

//   // ── Train search by destination ───────────────────────────────────────────────
//   const isTrainSearch = /train|trains|available|ट्रेन|రైలు/.test(lower);
//   let destination = null;
//   const enMatch = /to\s+([a-z]+(?:\s+[a-z]+)?)/.exec(lower);
//   const hiMatch = /([^\s]+)\s+के लिए/.exec(text);
//   const teMatch = /([^\s]+)\s+(కు|కి)/.exec(text);
//   if (enMatch) destination = enMatch[1].trim();
//   else if (hiMatch) destination = hiMatch[1].trim();
//   else if (teMatch) destination = teMatch[1].trim();

//   const cityMap = {
//     "delhi":"new delhi","दिल्ली":"new delhi","దిల్లీ":"new delhi",
//     "mumbai":"mumbai central","मुंबई":"mumbai central","ముంబై":"mumbai central",
//     "hyderabad":"hyderabad","हैदराबाद":"hyderabad","హైదరాబాద్":"hyderabad",
//   };
//   if (destination) { const k = destination.toLowerCase(); if (cityMap[k]) destination = cityMap[k]; }

//   if (isTrainSearch && destination) {
//     const matched = TRAINS.filter(t => t.to.toLowerCase().includes(destination.toLowerCase()));
//     if (matched.length === 0) {
//       return {
//         intent: "train_search",
//         intentData: toDataString({ topic: "train_search", destination, trains_found: [] }),
//         response: g(base,
//           `No trains found to ${destination}.`,
//           `${destination} के लिए कोई ट्रेन नहीं मिली।`,
//           `${destination} కు రైళ్లు లేవు.`),
//       };
//     }
//     const trainList = matched.map(t => ({
//       number: t.number, name: t.name,
//       platform: t.platform, status: t.status, delay: t.delay,
//       arrival: t.actualArrival, departure: t.actualDeparture,
//     }));
//     return {
//       intent: "train_search",
//       intentData: toDataString({ topic: "train_search", destination, trains_found: trainList }),
//       response: g(base,
//         `Available trains to ${destination}: ${matched.map(t=>`${t.name} (${t.number})`).join(", ")}.`,
//         `${destination} के लिए उपलब्ध ट्रेनें: ${matched.map(t=>`${t.name} (${t.number})`).join(", ")}।`,
//         `${destination} కు వెళ్లే రైళ్లు: ${matched.map(t=>`${t.name} (${t.number})`).join(", ")}.`),
//     };
//   }

//   // ── Platform number extraction ─────────────────────────────────────────────────
//   // Handles: "platform 3", "3 platform", "प्लेटफॉर्म 3", "3 प्लेटफॉर्म", "ప్లాట్‌ఫారం 3"
// const pfRaw = lower.match(/platform\s*(?:no\.?|number)?\s*(\d+)|(\d+)\s*(?:नंबर\s*)?(?:प्लेटफॉर्म|platform)|(?:प्लेटफॉर्म|ప్లాట్‌ఫారం)\s*(\d+)/i);
//   const pfNum = pfRaw ? parseInt(pfRaw[1] || pfRaw[2] || pfRaw[3]) : null;

//   // ── Facility flags ──────────────────────────────────────────────────────────────
//   const isFoodQ      = /food|eat|stall|restaurant|canteen|cafe|snack|खाना|భోజనం/i.test(lower);
//   const isWashroomQ  = /washroom|toilet|restroom|bathroom|శౌచాలయం|వాష్‌రూమ్/i.test(lower);
//   const isCloakQ     = /cloak|luggage|locker/i.test(lower);
//   const isWaitingQ   = /waiting|lounge|wait/i.test(lower);
//   const isEscalatorQ = /escalat|lift|elevator/i.test(lower);
//   const isAnyFacility = isFoodQ || isWashroomQ || isCloakQ || isWaitingQ || isEscalatorQ;

//   // ── Timing flags ────────────────────────────────────────────────────────────────
//   const isArrivalQ   = /arriv|reach|incoming|आगमन|రాక/i.test(lower);
//   const isDepartureQ = /depart|leav|going|प्रस्थान|వెళ్తుంది/i.test(lower);
//   const isTimingQ    = /time|when|schedule|कब|ఎప్పుడు/i.test(lower);
//   const isWhereQ     = /where|कहाँ|ఎక్కడ/i.test(lower);
//   const isPlatformQ  = /platform|प्लेटफॉर्म|ప్లాట్‌ఫారం/i.test(lower);

//   // ── Find train ─────────────────────────────────────────────────────────────────
//   const train = findTrainByName(lower);

//   if (train) {
//     const trainInfo = {
//       number: train.number,
//       name: train.name,
//       from: train.from,
//       to: train.to,
//       platform: train.platform,
//       scheduled_arrival: train.scheduledArrival,
//       actual_arrival: train.actualArrival,
//       scheduled_departure: train.scheduledDeparture,
//       actual_departure: train.actualDeparture,
//       status: train.status,
//       delay_minutes: train.delay,
//       type: train.type,
//     };

//     if (isWhereQ) {
//       return {
//         intent: "train_status",
//         intentData: toDataString({ topic: "train_location", train: trainInfo }),
//         response: g(base,
//           `Train ${train.number} ${train.name} is at Platform ${train.platform}.`,
//           `ट्रेन नंबर ${train.number} ${train.nameHindi} प्लेटफॉर्म ${train.platform} पर है।`,
//           `ట్రెయిన్ నంబర్ ${train.number} ${train.nameTelugu} ప్లాట్‌ఫారం ${train.platform}లో ఉంది.`), 
//       };
//     }

//     if (isPlatformQ && !isTimingQ) {
//       return {
//         intent: "platform_query",
//         intentData: toDataString({ topic: "train_platform", train: trainInfo }),
//         response: g(base,
//           `${train.name}, train number ${train.number}, will arrive at Platform ${train.platform}.`,
//           `${train.nameHindi}, ट्रेन नंबर ${train.number}, प्लेटफॉर्म ${train.platform} पर आएगी।`,
//           `${train.nameTelugu}, రైలు నంబర్ ${train.number}, ప్లాట్‌ఫారం ${train.platform}కి వస్తుంది.`), 
//       };
//     }

//     if (isArrivalQ && !isDepartureQ) {
//       return {
//         intent: "arrival_time",
//         intentData: toDataString({ topic: "train_arrival", train: trainInfo }),
//         response: g(base,
//           `Train ${train.number} ${train.name} arrives at ${train.actualArrival} on Platform ${train.platform}.`,
//           `ट्रेन नंबर ${train.number} ${train.nameHindi} ${train.actualArrival} बजे प्लेटफॉर्म ${train.platform} पर आएगी।`,
//           `ట్రెయిన్ నంబర్ ${train.number} ${train.nameTelugu} ${train.actualArrival}కు ప్లాట్‌ఫారం ${train.platform}కి వస్తుంది.`), 
//       };
//     }

//     if (isDepartureQ && !isArrivalQ) {
//       return {
//         intent: "departure_time",
//         intentData: toDataString({ topic: "train_departure", train: trainInfo }),
//         response: g(base,
//          `Train ${train.number} ${train.name} departs at ${train.actualDeparture} from Platform ${train.platform}.`,
//          `ट्रेन नंबर ${train.number} ${train.nameHindi} ${train.actualDeparture} बजे प्लेटफॉर्म ${train.platform} से जाएगी।`,
//          `ట్రెయిన్ నంబర్ ${train.number} ${train.nameTelugu} ${train.actualDeparture}కు ప్లాట్‌ఫారం ${train.platform} నుంచి వెళ్తుంది.`),
//       };
//     }

//     if (isTimingQ) {
//       return {
//         intent: "timing",
//         intentData: toDataString({ topic: "train_timing", train: trainInfo }),
//         response: g(base,
//           `Train ${train.number} ${train.name} arrives at ${train.actualArrival} and departs at ${train.actualDeparture} from Platform ${train.platform}.`,
//           `ट्रेन ${train.nameHindi} ${train.actualArrival} बजे आएगी और ${train.actualDeparture} बजे प्लेटफॉर्म ${train.platform} से जाएगी।`,
//           `ట్రెయిన్ ${train.nameTelugu} ${train.actualArrival}కు వస్తుంది మరియు ${train.actualDeparture}కు ప్లాట్‌ఫారం ${train.platform} నుంచి వెళ్తుంది.`),
//       };
//     }

//     if (/delay|late|देरी|लेट|ఆలస్యం/i.test(lower)) {
//       return {
//         intent: "train_delay",
//         intentData: toDataString({ topic: "train_delay", train: trainInfo }),
//         response: g(base,
//           train.delay > 0
//             ? `Train ${train.number} ${train.name} is running ${train.delay} minutes late.`
//             : `Train ${train.number} ${train.name} is running on time.`,
//           train.delay > 0
//             ? `ट्रेन ${train.nameHindi} ${train.delay} मिनट देरी से चल रही है।`
//             : `ट्रेन ${train.nameHindi} समय पर चल रही है।`,
//           train.delay > 0
//             ? `ట్రెయిన్ ${train.nameTelugu} ${train.delay} నిమిషాలు ఆలస్యంగా వస్తుంది.`
//             : `ట్రెయిన్ ${train.nameTelugu} సమయానికి వస్తుంది.`),
//       };
//     }
//     // ── Train number query ──────────────────────────────────────────────────────
//     const isTrainNumberQ = /number|नंबर|నంబర్|no\.|संख्या|సంఖ్య/i.test(lower);
//     if (isTrainNumberQ) {
//       return {
//         intent: "train_number",
//         intentData: toDataString({ topic: "train_number", train: trainInfo }),
//         response: g(base,
//       `${train.name} train number is ${train.number}. It runs from ${train.from} to ${train.to} on Platform ${train.platform}.`,
//       `${train.nameHindi} का ट्रेन नंबर ${train.number} है। यह ${train.from} से ${train.to} तक प्लेटफॉर्म ${train.platform} पर चलती है।`,
//       `${train.nameTelugu} రైలు నంబర్ ${train.number}. ఇది ${train.from} నుండి ${train.to} వరకు ప్లాట్‌ఫారం ${train.platform}లో వస్తుంది.`),
//   };
// }

//     // Generic train status — always include train number in all languages
//     return {
//       intent: "train_status",
//       intentData: toDataString({ topic: "train_status", train: trainInfo }),
//       response: g(base,
//         `${train.name}, train number ${train.number}, is at Platform ${train.platform}. Arrival: ${train.actualArrival}, Departure: ${train.actualDeparture}.`,
//         `${train.nameHindi}, ट्रेन नंबर ${train.number}, प्लेटफॉर्म ${train.platform} पर है। आगमन: ${train.actualArrival}, प्रस्थान: ${train.actualDeparture}।`,
//         `${train.nameTelugu}, రైలు నంబర్ ${train.number}, ప్లాట్‌ఫారం ${train.platform}లో ఉంది. రాక: ${train.actualArrival}, నిష్క్రమణ: ${train.actualDeparture}.`),
//     };
//   }
//   // ── Trains at a specific platform ─────────────────────────────────────────────
//   if (pfNum && !isAnyFacility) {
//     const pfTrains = TRAINS.filter(t => t.platform === pfNum);
//     const trainList = pfTrains.map(t => ({ number: t.number, name: t.name, status: t.status, delay: t.delay, arrival: t.actualArrival, departure: t.actualDeparture }));
//     return {
//       intent: "platform_trains",
//       intentData: toDataString({ topic: "platform_trains", platform_number: pfNum, trains: trainList }),
//       response: pfTrains.length === 0
//         ? g(base,
//             `No trains currently at Platform ${cardinal(pfNum)}.`,
//             `प्लेटफॉर्म ${pfNum} पर कोई ट्रेन नहीं है।`,
//             `ప్లాట్‌ఫారం ${pfNum}లో ట్రెయిన్లు లేవు.`)
//         : g(base,
//             `Trains at Platform ${cardinal(pfNum)}: ${pfTrains.map(t=>`${n(t.number)} ${t.name}`).join(", ")}.`,
//             `प्लेटफॉर्म ${pfNum} पर ट्रेनें: ${pfTrains.map(t=>`${t.number} ${t.nameHindi}`).join(", ")}।`,
//             `ప్లాట్‌ఫారం ${pfNum}లో ట్రెయిన్లు: ${pfTrains.map(t=>`${t.number} ${t.nameTelugu}`).join(", ")}.`),
//     };
//   }

//   // ── Facility at a specific platform ───────────────────────────────────────────
//   if (isAnyFacility && pfNum) {
//     const fac = PLATFORM_FACILITIES[pfNum];
//     if (!fac) {
//       return {
//         intent: "facility",
//         intentData: toDataString({ topic: "facility", platform_number: pfNum, available: false }),
//         response: g(base,
//           `Facility info for Platform ${cardinal(pfNum)} not available.`,
//           `प्लेटफॉर्म ${pfNum} के लिए सुविधा जानकारी उपलब्ध नहीं है।`,
//           `ప్లాట్‌ఫారం ${pfNum} కోసం సౌకర్యాల సమాచారం అందుబాటులో లేదు.`),
//       };
//     }

//     const facilityType = isFoodQ ? "food" : isWashroomQ ? "washroom" : isCloakQ ? "cloakroom" : isWaitingQ ? "waiting" : "escalator";
//     const facilityItems = fac[facilityType] || [];
//     const facilityLabels = { food:"Food stalls", washroom:"Washrooms", cloakroom:"Cloak rooms", waiting:"Waiting areas", escalator:"Escalators" };
//     const facilityLabelsHi = { food:"खाने के स्टॉल", washroom:"शौचालय", cloakroom:"क्लोक रूम", waiting:"प्रतीक्षा क्षेत्र", escalator:"एस्केलेटर" };
//     const facilityLabelsTe = { food:"ఆహార స్టాల్లు", washroom:"వాష్‌రూమ్‌లు", cloakroom:"క్లోక్ రూమ్‌లు", waiting:"వేచి ఉండే ప్రాంతాలు", escalator:"ఎస్కలేటర్లు" };

//     return {
//       intent: "facility",
//       intentData: toDataString({
//         topic: "platform_facility",
//         platform_number: pfNum,
//         facility_type: facilityType,
//         items: facilityItems,
//       }),
//       response: facilityItems.length === 0
//         ? g(base,
//             `No ${facilityLabels[facilityType]?.toLowerCase()} at Platform ${cardinal(pfNum)}.`,
//             `प्लेटफॉर्म ${pfNum} पर ${facilityLabelsHi[facilityType]} उपलब्ध नहीं है।`,
//             `ప్లాట్‌ఫారం ${pfNum}లో ${facilityLabelsTe[facilityType]} అందుబాటులో లేదు.`)
//         : g(base,
//             `Platform ${cardinal(pfNum)} – ${facilityLabels[facilityType]}: ${facilityItems.join(" · ")}`,
//             `प्लेटफॉर्म ${pfNum} पर ${facilityLabelsHi[facilityType]}: ${facilityItems.join(" · ")}`,
//             `ప్లాట్‌ఫారం ${pfNum}లో ${facilityLabelsTe[facilityType]}: ${facilityItems.join(" · ")}`),
//     };
//   }

//   // ── Unknown ────────────────────────────────────────────────────────────────────
//   return {
//     intent: "unknown",
//     intentData: toDataString({ topic: "unknown", user_query: text }),
//     response: g(base,
//       "I didn't understand. Ask about a train number, platform, timing or facilities.",
//       "मैं समझ नहीं पाया। कृपया ट्रेन नंबर, प्लेटफॉर्म, समय या सुविधाओं के बारे में पूछें।",
//       "నేను అర్థం చేసుకోలేకపోయాను. దయచేసి ట్రెయిన్, ప్లాట్‌ఫారం లేదా సౌకర్యాల గురించి అడగండి."),
//   };
// }

// module.exports = { detectIntent, TRAINS, PLATFORM_FACILITIES };

// intent.js — Railway Enquiry Intent Engine
// Now returns { intent, response, intentData } where:
//   - intent      → intent label (string)
//   - response    → static fallback text (used if Sarvam Chat fails)
//   - intentData  → JSON-stringified structured facts for Sarvam Chat to use
// Supports: English (en-IN), Hindi (hi-IN), Telugu (te-IN)

const TRAINS = [
  { number: "12951", name: "Mumbai Rajdhani", nameHindi: "मुंबई राजधानी", nameTelugu: "ముంబై రాజ్‌ధాని", from: "Mumbai Central", to: "New Delhi", scheduledArrival: "08:35", actualArrival: "08:52", scheduledDeparture: "08:45", actualDeparture: "09:02", platform: 3, status: "delayed", delay: 17, type: "arriving" },
  { number: "12002", name: "Bhopal Shatabdi", nameHindi: "भोपाल शताब्दी", nameTelugu: "భోపాల్ శతాబ్ది", from: "New Delhi", to: "Habibganj", scheduledArrival: "10:00", actualArrival: "10:00", scheduledDeparture: "06:00", actualDeparture: "06:00", platform: 1, status: "on-time", delay: 0, type: "departing" },
  { number: "22691", name: "Rajdhani Express", nameHindi: "राजधानी एक्सप्रेस", nameTelugu: "రాజ్‌ధాని ఎక్స్‌ప్రెస్", from: "Bangalore", to: "New Delhi", scheduledArrival: "20:00", actualArrival: "21:30", scheduledDeparture: "20:10", actualDeparture: "21:40", platform: 5, status: "delayed", delay: 90, type: "passing" },
  { number: "12301", name: "Howrah Rajdhani", nameHindi: "हावड़ा राजधानी", nameTelugu: "హౌరా రాజ్‌ధాని", from: "Howrah", to: "New Delhi", scheduledArrival: "09:55", actualArrival: "09:55", scheduledDeparture: "10:05", actualDeparture: "10:05", platform: 2, status: "on-time", delay: 0, type: "arriving" },
  { number: "19027", name: "Vivek Express", nameHindi: "विवेक एक्सप्रेस", nameTelugu: "వివేక్ ఎక్స్‌ప్రెస్", from: "Dibrugarh", to: "Kanyakumari", scheduledArrival: "14:20", actualArrival: "15:05", scheduledDeparture: "14:30", actualDeparture: "15:15", platform: 6, status: "delayed", delay: 45, type: "passing" },
  { number: "12563", name: "Bihar Sampark Kranti", nameHindi: "बिहार संपर्क क्रांति", nameTelugu: "బీహార్ సంపర్క్ క్రాంతి", from: "New Delhi", to: "Rajendranagar", scheduledArrival: "11:00", actualArrival: "11:00", scheduledDeparture: "11:05", actualDeparture: "11:05", platform: 4, status: "on-time", delay: 0, type: "departing" },
  { number: "17064", name: "Ajanta Express", nameHindi: "अजंता एक्सप्रेस", nameTelugu: "అజంతా ఎక్స్‌ప్రెస్", from: "Secunderabad", to: "Mumbai CSMT", scheduledArrival: "13:10", actualArrival: "13:10", scheduledDeparture: "13:20", actualDeparture: "13:20", platform: 3, status: "on-time", delay: 0, type: "departing" },
  { number: "12723", name: "AP Express", nameHindi: "एपी एक्सप्रेस", nameTelugu: "ఏపీ ఎక్స్‌ప్రెస్", from: "Hyderabad", to: "Hazrat Nizamuddin", scheduledArrival: "07:30", actualArrival: "07:45", scheduledDeparture: "07:40", actualDeparture: "07:55", platform: 1, status: "delayed", delay: 15, type: "arriving" },
];

const PLATFORM_FACILITIES = {
  1: { food: ["Juice Corner (near gate 1A)", "Amul Parlour (mid-platform)"], washroom: ["Near gate 1A (paid)", "End of platform 1"], cloakroom: ["Main cloakroom near gate 1 – open 24h"], waiting: ["AC Waiting Hall – ground floor near gate 1"], escalator: ["Gate 1 escalator (up only)"], atm: ["SBI ATM near ticket counter"], pharmacy: [] },
  2: { food: ["Café Coffee Day (platform 2 entry)", "Railway Canteen (mid)"], washroom: ["Platform 2 – near footbridge"], cloakroom: [], waiting: ["Open waiting benches"], escalator: ["Footbridge escalator (both sides)"], atm: [], pharmacy: [] },
  3: { food: ["IRCTC Food Stall", "Hot Meals Counter", "Bisleri water stall"], washroom: ["Platform 3 – near IRCTC stall (free)", "End of platform 3"], cloakroom: ["Cloak room near platform 3 ramp – ₹30/hr"], waiting: ["Platform 3 waiting shed"], escalator: ["Main escalator (platform 3 ↔ overbridge)"], atm: ["HDFC ATM near ramp"], pharmacy: ["MedPlus counter near gate 3"] },
  4: { food: ["Snack stall near platform 4 exit"], washroom: ["Platform 4 – near exit gate"], cloakroom: [], waiting: ["Covered waiting area"], escalator: [], atm: [], pharmacy: [] },
  5: { food: ["Food Court (large – 20 items)", "Domino's Express", "Chai & Snack corner"], washroom: ["Platform 5 – near food court (paid)", "Disabled-friendly washroom near ramp"], cloakroom: ["Cloak room – platform 5 entry – open 6am–11pm"], waiting: ["AC Lounge near platform 5 (₹50 entry)", "General waiting shed"], escalator: ["Escalator up/down near food court"], atm: ["Axis Bank ATM inside food court"], pharmacy: ["Apollo Pharmacy – platform 5 end"] },
  6: { food: ["Tea/Coffee vending machine", "Snack cart"], washroom: ["Platform 6 – start of platform"], cloakroom: [], waiting: ["Waiting benches near gate 6"], escalator: [], atm: [], pharmacy: [] },
};

const TRAIN_NAME_ALIASES = [
  { aliases: ["mumbai rajdhani", "rajdhani mumbai", "12951", "मुंबई राजधानी", "ముంబై రాజ్‌ధాని"], number: "12951" },
  { aliases: ["bhopal shatabdi", "bhopal express", "bhopal", "12002", "भोपाल शताब्दी", "भोपाल एक्सप्रेस", "भोपाल", "భోపాల్ శతాబ్ది", "భోపాల్ ఎక్స్‌ప్రెస్", "భోపాల్"], number: "12002" },
  { aliases: ["rajdhani express", "22691", "राजधानी एक्सप्रेस", "రాజ్‌ధాని ఎక్స్‌ప్రెస్", "rajdhani"], number: "22691" },
  { aliases: ["howrah rajdhani", "12301", "हावड़ा राजधानी", "హౌరా రాజ్‌ధాని"], number: "12301" },
  { aliases: ["vivek express", "19027", "विवेक एक्सप्रेस", "వివేక్ ఎక్స్‌ప్రెస్", "vivek"], number: "19027" },
  { aliases: ["bihar sampark", "12563", "बिहार संपर्क क्रांति", "బీహార్ సంపర్క్ క్రాంతి", "sampark kranti"], number: "12563" },
  { aliases: ["ajanta express", "17064", "अजंता एक्सप्रेस", "అజంతా ఎక్స్‌ప్రెస్", "ajanta"], number: "17064" },
  { aliases: ["ap express", "12723", "एपी एक्सप्रेस", "ఏపీ ఎక్స్‌ప్రెస్", "andhra pradesh express"], number: "12723" },
];

// ── Helpers ─────────────────────────────────────────────────────────────────

// Strip zero-width characters (ZWNJ U+200C, ZWJ U+200D, etc.) that STT engines omit
function normalizeZW(str) {
  return str.replace(/[\u200B-\u200D\uFEFF]/g, "");
}

function findTrainByName(text) {
  const lower = normalizeZW(text.toLowerCase());
  const numMatch = lower.match(/\b(\d{5})\b/);
  if (numMatch) return TRAINS.find(t => t.number === numMatch[1]) || null;
  for (const entry of TRAIN_NAME_ALIASES) {
    if (entry.aliases.some(a => lower.includes(normalizeZW(a.toLowerCase())))) {
      return TRAINS.find(t => t.number === entry.number) || null;
    }
  }
  return null;
}

function getLangBase(lang) {
  if (lang === "hi-IN" || lang === "hi") return "hi";
  if (lang === "te-IN" || lang === "te") return "te";
  return "en";
}

function g(base, en, hi, te) {
  if (base === "hi") return hi;
  if (base === "te") return te;
  return en;
}

/** Serialize an object to a readable key: value string for the AI */
function toDataString(obj) {
  return JSON.stringify(obj, null, 2);
}

// ── Main export ──────────────────────────────────────────────────────────────

/**
 * Detect the intent from user text.
 *
 * Returns:
 *   intent      - intent label
 *   response    - static fallback text (used when Sarvam Chat is unavailable)
 *   intentData  - JSON string with all extracted facts for Sarvam Chat
 */

// ── Number to words converter ────────────────────────────────────────────────
// Digit-by-digit: for train numbers (12951 → "one two nine five one" / "एक दो नौ पाँच एक" / "ఒకటి రెండు తొమ్మిది అయిదు ఒకటి")
function numberToWords(num, lang) {
  const EN_DIGITS = ["zero", "one", "two", "three", "four", "five", "six", "seven", "eight", "nine"];
  const HI_DIGITS = ["शून्य", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ"];
  const TE_DIGITS = ["సున్న", "ఒకటి", "రెండు", "మూడు", "నాలుగు", "అయిదు", "ఆరు", "ఏడు", "ఎనిమిది", "తొమ్మిది"];
  const map = { en: EN_DIGITS, hi: HI_DIGITS, te: TE_DIGITS };
  const words = map[lang] || EN_DIGITS;
  return num.toString().split("").map(d => words[parseInt(d)]).join(" ");
}

// Cardinal words: for small integers like platform (1–6) and delay minutes (0–90)
function cardinalToWords(num, lang) {
  const n = parseInt(num);
  if (lang === "en") return n.toString(); // TTS handles English numerals fine

  const HI = [
    "शून्य", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ", "दस",
    "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस", "बीस",
    "इक्कीस", "बाईस", "तेईस", "चौबीस", "पच्चीस", "छब्बीस", "सत्ताईस", "अट्ठाईस", "उनतीस", "तीस",
    "इकतीस", "बत्तीस", "तैंतीस", "चौंतीस", "पैंतीस", "छत्तीस", "सैंतीस", "अड़तीस", "उनतालीस", "चालीस",
    "इकतालीस", "बयालीस", "तैंतालीस", "चवालीस", "पैंतालीस", "छियालीस", "सैंतालीस", "अड़तालीस", "उनचास", "पचास",
    "इक्यावन", "बावन", "तिरपन", "चौवन", "पचपन", "छप्पन", "सत्तावन", "अट्ठावन", "उनसठ", "साठ",
    "इकसठ", "बासठ", "तिरसठ", "चौसठ", "पैंसठ", "छियासठ", "सड़सठ", "अड़सठ", "उनहत्तर", "सत्तर",
    "इकहत्तर", "बहत्तर", "तिहत्तर", "चौहत्तर", "पचहत्तर", "छिहत्तर", "सतहत्तर", "अठहत्तर", "उनासी", "अस्सी",
    "इक्यासी", "बयासी", "तिरासी", "चौरासी", "पचासी", "छियासी", "सत्तासी", "अठासी", "नवासी", "नब्बे",
  ];
  const TE = [
    "సున్న", "ఒకటి", "రెండు", "మూడు", "నాలుగు", "అయిదు", "ఆరు", "ఏడు", "ఎనిమిది", "తొమ్మిది", "పది",
    "పదకొండు", "పన్నెండు", "పదమూడు", "పద్నాలుగు", "పదిహేను", "పదహారు", "పదిహేడు", "పద్దెనిమిది", "పందొమ్మిది", "ఇరవై",
    "ఇరవై ఒకటి", "ఇరవై రెండు", "ఇరవై మూడు", "ఇరవై నాలుగు", "ఇరవై అయిదు", "ఇరవై ఆరు", "ఇరవై ఏడు", "ఇరవై ఎనిమిది", "ఇరవై తొమ్మిది", "ముప్పై",
    "ముప్పై ఒకటి", "ముప్పై రెండు", "ముప్పై మూడు", "ముప్పై నాలుగు", "ముప్పై అయిదు", "ముప్పై ఆరు", "ముప్పై ఏడు", "ముప్పై ఎనిమిది", "ముప్పై తొమ్మిది", "నలభై",
    "నలభై ఒకటి", "నలభై రెండు", "నలభై మూడు", "నలభై నాలుగు", "నలభై అయిదు", "నలభై ఆరు", "నలభై ఏడు", "నలభై ఎనిమిది", "నలభై తొమ్మిది", "యాభై",
    "యాభై ఒకటి", "యాభై రెండు", "యాభై మూడు", "యాభై నాలుగు", "యాభై అయిదు", "యాభై ఆరు", "యాభై ఏడు", "యాభై ఎనిమిది", "యాభై తొమ్మిది", "అరవై",
    "అరవై ఒకటి", "అరవై రెండు", "అరవై మూడు", "అరవై నాలుగు", "అరవై అయిదు", "అరవై ఆరు", "అరవై ఏడు", "అరవై ఎనిమిది", "అరవై తొమ్మిది", "డెభై",
    "డెభై ఒకటి", "డెభై రెండు", "డెభై మూడు", "డెభై నాలుగు", "డెభై అయిదు", "డెభై ఆరు", "డెభై ఏడు", "డెభై ఎనిమిది", "డెభై తొమ్మిది", "ఎనభై",
    "ఎనభై ఒకటి", "ఎనభై రెండు", "ఎనభై మూడు", "ఎనభై నాలుగు", "ఎనభై అయిదు", "ఎనభై ఆరు", "ఎనభై ఏడు", "ఎనభై ఎనిమిది", "ఎనభై తొమ్మిది", "తొంభై",
  ];
  if (lang === "hi") return (n >= 0 && n < HI.length) ? HI[n] : n.toString();
  if (lang === "te") return (n >= 0 && n < TE.length) ? TE[n] : n.toString();
  return n.toString();
}

function timeToWords(timeStr, lang) {
  const [h, m] = timeStr.split(":").map(Number);

  if (lang === "en") {
    // Convert 24h to 12h spoken format for TTS: "08:52" → "8 52 AM"
    const period = h >= 12 ? "PM" : "AM";
    const h12 = h === 0 ? 12 : h > 12 ? h - 12 : h;
    return m === 0 ? `${h12} ${period}` : `${h12} ${m < 10 ? "0" + m : m} ${period}`;
  }

  const HI_HOURS = [
    "", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ",
    "दस", "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह",
    "सत्रह", "अठारह", "उन्नीस", "बीस", "इक्कीस", "बाईस", "तेईस"
  ];
  const HI_MINS = [
    "", "एक", "दो", "तीन", "चार", "पाँच", "छह", "सात", "आठ", "नौ", "दस",
    "ग्यारह", "बारह", "तेरह", "चौदह", "पंद्रह", "सोलह", "सत्रह", "अठारह", "उन्नीस", "बीस",
    "इक्कीस", "बाईस", "तेईस", "चौबीस", "पच्चीस", "छब्बीस", "सत्ताईस", "अट्ठाईस", "उनतीस", "तीस",
    "इकतीस", "बत्तीस", "तैंतीस", "चौंतीस", "पैंतीस", "छत्तीस", "सैंतीस", "अड़तीस", "उनतालीस", "चालीस",
    "इकतालीस", "बयालीस", "तैंतालीस", "चवालीस", "पैंतालीस", "छियालीस", "सैंतालीस", "अड़तालीस", "उनचास", "पचास",
    "इक्यावन", "बावन", "तिरपन", "चौवन", "पचपन", "छप्पन", "सत्तावन", "अट्ठावन", "उनसठ"
  ];
  const TE_HOURS = [
    "", "ఒంటి", "రెండు", "మూడు", "నాలుగు", "అయిదు", "ఆరు", "ఏడు",
    "ఎనిమిది", "తొమ్మిది", "పది", "పదకొండు", "పన్నెండు", "పదమూడు",
    "పద్నాలుగు", "పదిహేను", "పదహారు", "పదిహేడు", "పద్దెనిమిది",
    "పందొమ్మిది", "ఇరవై", "ఇరవై ఒకటి", "ఇరవై రెండు", "ఇరవై మూడు"
  ];
  const TE_MINS = [
    "", "ఒకటి", "రెండు", "మూడు", "నాలుగు", "అయిదు", "ఆరు", "ఏడు", "ఎనిమిది", "తొమ్మిది", "పది",
    "పదకొండు", "పన్నెండు", "పదమూడు", "పద్నాలుగు", "పదిహేను", "పదహారు", "పదిహేడు", "పద్దెనిమిది", "పందొమ్మిది", "ఇరవై",
    "ఇరవై ఒకటి", "ఇరవై రెండు", "ఇరవై మూడు", "ఇరవై నాలుగు", "ఇరవై అయిదు", "ఇరవై ఆరు", "ఇరవై ఏడు", "ఇరవై ఎనిమిది", "ఇరవై తొమ్మిది", "ముప్పై",
    "ముప్పై ఒకటి", "ముప్పై రెండు", "ముప్పై మూడు", "ముప్పై నాలుగు", "ముప్పై అయిదు", "ముప్పై ఆరు", "ముప్పై ఏడు", "ముప్పై ఎనిమిది", "ముప్పై తొమ్మిది", "నలభై",
    "నలభై ఒకటి", "నలభై రెండు", "నలభై మూడు", "నలభై నాలుగు", "నలభై అయిదు", "నలభై ఆరు", "నలభై ఏడు", "నలభై ఎనిమిది", "నలభై తొమ్మిది", "యాభై",
    "యాభై ఒకటి", "యాభై రెండు", "యాభై మూడు", "యాభై నాలుగు", "యాభై అయిదు", "యాభై ఆరు", "యాభై ఏడు", "యాభై ఎనిమిది", "యాభై తొమ్మిది"
  ];

  if (lang === "hi") {
    const hw = HI_HOURS[h] || h.toString();
    return m === 0 ? `${hw} बजे` : `${hw} बजकर ${HI_MINS[m]} मिनट`;
  }
  if (lang === "te") {
    const hw = TE_HOURS[h] || h.toString();
    return m === 0 ? `${hw} గంటలకు` : `${hw} గంటల ${TE_MINS[m]} నిమిషాలకు`;
  }
  return timeStr;
}

function detectIntent(text, language = "en-IN") {
  const base = getLangBase(language);
  const n = (number) => numberToWords(number, base);      // digit-by-digit: train numbers
  const cardinal = (number) => cardinalToWords(number, base);  // cardinal words: platform, delay
  const t = (time) => timeToWords(time, base);
  const lower = (text || "").toLowerCase().trim();

  // ── Empty input ─────────────────────────────────────────────────────────────
  if (!lower) {
    return {
      intent: "fallback",
      intentData: toDataString({ topic: "no_input" }),
      response: g(base,
        "Please ask about a train number, platform, timing or facilities.",
        "कृपया ट्रेन नंबर, प्लेटफॉर्म, समय या सुविधाओं के बारे में पूछें।",
        "దయచేసి ట్రెయిన్ నంబర్, ప్లాట్‌ఫారం లేదా సౌకర్యాల గురించి అడగండి."),
    };
  }

  // ── Greeting ─────────────────────────────────────────────────────────────────
  if (/\b(hello|hi|hey|namaste|नमस्ते|నమస్కారం|good morning|good evening)\b/i.test(lower)) {
    return {
      intent: "greeting",
      intentData: toDataString({ topic: "greeting" }),
      response: g(base,
        "Hello! Welcome to the Railway Enquiry System. How can I help you?",
        "नमस्ते! रेलवे पूछताछ प्रणाली में आपका स्वागत है।",
        "నమస్కారం! రైల్వే విచారణ వ్యవస్థకు స్వాగతం."),
    };
  }

  // ── Farewell ──────────────────────────────────────────────────────────────────
  if (/\b(bye|goodbye|thank you|thanks|धन्यवाद|अलविदा|ధన్యవాదాలు|వీడ్కోలు)\b/i.test(lower)) {
    return {
      intent: "farewell",
      intentData: toDataString({ topic: "farewell" }),
      response: g(base,
        "Thank you for using the Railway Enquiry System. Have a safe journey!",
        "धन्यवाद। सुरक्षित यात्रा करें!",
        "ధన్యవాదాలు. సురక్షితమైన ప్రయాణం!"),
    };
  }

  // ── PNR ───────────────────────────────────────────────────────────────────────
  if (/\b(pnr|पीएनआर|పీఎన్ఆర్)\b/i.test(lower)) {
    return {
      intent: "pnr_status",
      intentData: toDataString({ topic: "pnr_status", helpline: "139", website: "indianrailways.gov.in" }),
      response: g(base,
        "To check your PNR status, visit the Indian Railways website or call 139.",
        "पीएनआर स्थिति जांचने के लिए भारतीय रेलवे की वेबसाइट पर जाएं या 139 पर कॉल करें।",
        "పీఎన్‌ఆర్ స్థితి కోసం భారతీయ రైల్వే వెబ్‌సైట్‌ను సందర్శించండి లేదా 139 కి కాల్ చేయండి."),
    };
  }

  // ── Ticket booking ────────────────────────────────────────────────────────────
  if (/ticket|booking|reservation|टिकट|బుకింగ్/i.test(lower)) {
    return {
      intent: "ticket_info",
      intentData: toDataString({ topic: "ticket_booking", counter: "near main entrance", online: "IRCTC website or app", helpline: "139" }),
      response: g(base,
        "Ticket counters are near the main entrance. Book online via IRCTC or call 139.",
        "टिकट काउंटर मुख्य प्रवेश के पास हैं। आईआरसीटीसी पर ऑनलाइन बुकिंग भी कर सकते हैं।",
        "టికెట్ కౌంటర్లు ప్రధాన ప్రవేశద్వారం దగ్గర ఉన్నాయి. IRCTC ద్వారా ఆన్‌లైన్‌లో బుక్ చేయవచ్చు."),
    };
  }

  // ── Next N hour trains ────────────────────────────────────────────────────────
  const isNextHourQ = /next\s+(?:1|one)\s+hour|अगले\s+एक\s+घंटे|తదుపరి\s+(?:1|ఒక)\s+గంట/i.test(lower)
    || /1\s+hour|one\s+hour/i.test(lower) && /train/i.test(lower);
  if (isNextHourQ) {
    const allTrainList = TRAINS.map(t => ({
      number: t.number, name: t.name,
      platform: t.platform, status: t.status, delay: t.delay,
      arrival: t.actualArrival, departure: t.actualDeparture, type: t.type,
    }));
    const trainNames = TRAINS.map(t => `${t.name} (${t.number})`).join(", ");
    const trainNamesHi = TRAINS.map(t => `${t.nameHindi} (${n(t.number)})`).join(", ");
    const trainNamesTe = TRAINS.map(t => `${t.nameTelugu} (${n(t.number)})`).join(", ");
    return {
      intent: "next_hour_trains",
      intentData: toDataString({ topic: "train_search", time_window: "next 1 hour", trains_found: allTrainList }),
      response: g(base,
        `Trains in the next hour: ${trainNames}.`,
        `अगले एक घंटे में ट्रेनें: ${trainNamesHi}।`,
        `తదుపరి ఒక గంటలో రైళ్లు: ${trainNamesTe}.`),
    };
  }

  // ── Train search by destination ───────────────────────────────────────────────
  // Telugu STT may output various forms: రైలు, రైళ్లు, రైళ్ళు, ట్రెయిన్, నేడు (today)
  const isTrainSearch = /train|trains|available|today|ట్రెయిన్|రైళ్ళు|రైళ్లు|రైలు|నేడు|ट्रेन|रेल/.test(lower);

  // Extract destination — only used if NO named train is found (prevents city-in-train-name collisions)
  const cityMap = {
    "delhi": "new delhi", "new delhi": "new delhi",
    "दिल्ली": "new delhi", "नई दिल्ली": "new delhi",
    "దిల్లీ": "new delhi", "న్యూ ఢిల్లీ": "new delhi", "ఢిల్లీ": "new delhi", "దిల్లీ": "new delhi",
    "mumbai": "mumbai central", "मुंबई": "mumbai central", "ముంబై": "mumbai central",
    "hyderabad": "hyderabad", "हैदराबाद": "hyderabad", "హైదరాబాద్": "hyderabad",
    "howrah": "howrah", "हावड़ा": "howrah", "హౌరా": "howrah",
  };

  function extractDestination(text, lower) {
    // English: "trains to new delhi"
    const enMatch = /to\s+(new\s+delhi|[a-z]+(?:\s+[a-z]+)?)/.exec(lower);
    if (enMatch) return enMatch[1].trim();
    // Hindi: "दिल्ली के लिए ट्रेन"
    const hiMatch = /([^\s]+(?:\s+[^\s]+)?)\s+के लिए/.exec(text);
    if (hiMatch) return hiMatch[1].trim();
    // Telugu postposition separate: "న్యూ ఢిల్లీ కు రైళ్లు"
    const teMatchSep = /([\u0C00-\u0C7F]+(?:\s+[\u0C00-\u0C7F]+)?)\s+(కు|కి)/.exec(text);
    if (teMatchSep) return teMatchSep[1].trim();
    // Telugu postposition fused: "ఢిల్లీకి రైళ్లు"
    const teMatchFused = /([\u0C00-\u0C7F]+?)(కు|కి)\b/.exec(text);
    if (teMatchFused) return teMatchFused[1].trim();
    // Bare Telugu city name (only when no postposition) — safe because this
    // function is only called when findTrainByName already returned null
    const teCity = /(న్యూ ఢిల్లీ|ఢిల్లీ|దిల్లీ|ముంబై|హైదరాబాద్|హౌరా)/.exec(text);
    if (teCity) return teCity[1];
    // Bare Hindi city name
    const hiCity = /(नई दिल्ली|दिल्ली|मुंबई|हैदराबाद|हावड़ा)/.exec(text);
    if (hiCity) return hiCity[1];
    return null;
  }

  // ── Platform number extraction ─────────────────────────────────────────────────
  // Handles: "platform 3", "3 platform", "प्लेटफॉर्म 3", "3 प्लेटफॉर्म", "ప్లాట్‌ఫారం 3"
  const pfRaw = lower.match(/platform\s*(?:no\.?|number)?\s*(\d+)|(\d+)\s*(?:नंबर\s*)?(?:प्लेटफॉर्म|platform)|(?:प्लेटफॉर्म|ప్లాట్‌ఫారం)\s*(\d+)/i);
  const pfNum = pfRaw ? parseInt(pfRaw[1] || pfRaw[2] || pfRaw[3]) : null;

  // ── Facility flags ──────────────────────────────────────────────────────────────
  const isFoodQ = /food|eat|stall|restaurant|canteen|cafe|snack|खाना|భోజనం|తినడం/i.test(lower);
  const isWashroomQ = /washroom|toilet|restroom|bathroom|శౌచాలయం|వాష్‌రూమ్|టాయిలెట్/i.test(lower);
  const isCloakQ = /cloak|luggage|locker|సామాను|క్లోక్/i.test(lower);
  const isWaitingQ = /waiting|lounge|wait|వేచి|వేచుండు/i.test(lower);
  const isEscalatorQ = /escalat|lift|elevator|ఎస్కలేటర్|లిఫ్ట్/i.test(lower);
  const isAnyFacility = isFoodQ || isWashroomQ || isCloakQ || isWaitingQ || isEscalatorQ;

  // ── Timing flags ────────────────────────────────────────────────────────────────
  // Telugu: రాక/వచ్చే=arrival, నిష్క్రమణ/బయలుదేరు/వెళ్ళే=departure, సమయం/ఎప్పుడు=time/when
  // Hindi:  आगमन=arrival, प्रस्थान/जाना=departure, समय/कब=time/when, कहाँ/कहां=where
  const isArrivalQ = /arriv|reach|incoming|आगमन|రాక|వచ్చే/i.test(lower);
  const isDepartureQ = /depart|leav|going|प्रस्थान|जाना|నిష్క్రమణ|బయలుదేరు|వెళ్ళే|వెళ్తుంది|వెళ్ళు/i.test(lower);
  const isTimingQ = /time|when|schedule|समय|कब|సమయం|ఎప్పుడు/i.test(lower);
  const isWhereQ = /where|कहाँ|कहां|ఎక్కడ/i.test(lower);
  const isPlatformQ = /platform|प्लेटफॉर्म|ప్లాట్‌ఫారం/i.test(lower);

  // ── Find train ─────────────────────────────────────────────────────────────────
  const train = findTrainByName(lower);

  if (train) {
    const trainInfo = {
      number: train.number,
      name: train.name,
      from: train.from,
      to: train.to,
      platform: train.platform,
      scheduled_arrival: train.scheduledArrival,
      actual_arrival: train.actualArrival,
      scheduled_departure: train.scheduledDeparture,
      actual_departure: train.actualDeparture,
      status: train.status,
      delay_minutes: train.delay,
      type: train.type,
    };

    if (isWhereQ) {
      return {
        intent: "train_status",
        intentData: toDataString({ topic: "train_location", train: trainInfo }),
        response: g(base,
          `${train.name} (${train.number}) is at Platform ${cardinal(train.platform)}.`,
          `${train.nameHindi} (${n(train.number)}) प्लेटफॉर्म ${cardinal(train.platform)} पर है।`,
          `${train.nameTelugu} (${n(train.number)}) ప్లాట్‌ఫారం ${cardinal(train.platform)}లో ఉంది.`),
      };
    }

    if (isPlatformQ && !isTimingQ) {
      return {
        intent: "platform_query",
        intentData: toDataString({ topic: "train_platform", train: trainInfo }),
        response: g(base,
          `${train.name} (${train.number}) will arrive at Platform ${cardinal(train.platform)}.`,
          `${train.nameHindi} (${n(train.number)}) प्लेटफॉर्म ${cardinal(train.platform)} पर आएगी।`,
          `${train.nameTelugu} (${n(train.number)}) ప్లాట్‌ఫారం ${cardinal(train.platform)}కి వస్తుంది.`),
      };
    }

    if (isArrivalQ && !isDepartureQ) {
      return {
        intent: "arrival_time",
        intentData: toDataString({ topic: "train_arrival", train: trainInfo }),
        response: g(base,
          `${train.name} (${train.number}) arrives at ${t(train.actualArrival)} on Platform ${cardinal(train.platform)}.`,
          `${train.nameHindi} (${n(train.number)}) ${t(train.actualArrival)} प्लेटफॉर्म ${cardinal(train.platform)} पर आएगी।`,
          `${train.nameTelugu} (${n(train.number)}) ${t(train.actualArrival)} ప్లాట్‌ఫారం ${cardinal(train.platform)}కి వస్తుంది.`),
      };
    }

    if (isDepartureQ && !isArrivalQ) {
      return {
        intent: "departure_time",
        intentData: toDataString({ topic: "train_departure", train: trainInfo }),
        response: g(base,
          `${train.name} (${train.number}) departs at ${t(train.actualDeparture)} from Platform ${cardinal(train.platform)}.`,
          `${train.nameHindi} (${n(train.number)}) ${t(train.actualDeparture)} प्लेटफॉर्म ${cardinal(train.platform)} से जाएगी।`,
          `${train.nameTelugu} (${n(train.number)}) ${t(train.actualDeparture)} ప్లాట్‌ఫారం ${cardinal(train.platform)} నుంచి వెళ్తుంది.`),
      };
    }

    if (isTimingQ) {
      return {
        intent: "timing",
        intentData: toDataString({ topic: "train_timing", train: trainInfo }),
        response: g(base,
          `${train.name} (${train.number}) arrives at ${t(train.actualArrival)} and departs at ${t(train.actualDeparture)} from Platform ${cardinal(train.platform)}.`,
          `${train.nameHindi} (${n(train.number)}) ${t(train.actualArrival)} आएगी और ${t(train.actualDeparture)} प्लेटफॉर्म ${cardinal(train.platform)} से जाएगी।`,
          `${train.nameTelugu} (${n(train.number)}) ${t(train.actualArrival)} వస్తుంది మరియు ${t(train.actualDeparture)} ప్లాట్‌ఫారం ${cardinal(train.platform)} నుంచి వెళ్తుంది.`),
      };
    }

    if (/delay|late|देरी|लेट|ఆలస్యం/i.test(lower)) {
      return {
        intent: "train_delay",
        intentData: toDataString({ topic: "train_delay", train: trainInfo }),
        response: g(base,
          train.delay > 0
            ? `${train.name} (${train.number}) is running ${cardinal(train.delay)} minutes late.`
            : `${train.name} (${train.number}) is running on time.`,
          train.delay > 0
            ? `${train.nameHindi} (${n(train.number)}) ${cardinal(train.delay)} मिनट देरी से चल रही है।`
            : `${train.nameHindi} (${n(train.number)}) समय पर चल रही है।`,
          train.delay > 0
            ? `${train.nameTelugu} (${n(train.number)}) ${cardinal(train.delay)} నిమిషాలు ఆలస్యంగా వస్తుంది.`
            : `${train.nameTelugu} (${n(train.number)}) సమయానికి వస్తుంది.`),
      };
    }
    // ── Train number query ──────────────────────────────────────────────────────
    const isTrainNumberQ = /number|नंबर|నంబర్|no\.|संख्या|సంఖ్య/i.test(lower);
    if (isTrainNumberQ) {
      return {
        intent: "train_number",
        intentData: toDataString({ topic: "train_number", train: trainInfo }),
        response: g(base,
          `${train.name} (${train.number}) runs from ${train.from} to ${train.to} on Platform ${cardinal(train.platform)}.`,
          `${train.nameHindi} (${n(train.number)}) यह ${train.from} से ${train.to} तक प्लेटफॉर्म ${cardinal(train.platform)} पर चलती है।`,
          `${train.nameTelugu} (${n(train.number)}). ఇది ${train.from} నుండి ${train.to} వరకు ప్లాట్‌ఫారం ${cardinal(train.platform)}లో వస్తుంది.`),
      };
    }

    // Generic train status — always include train number in all languages
    return {
      intent: "train_status",
      intentData: toDataString({ topic: "train_status", train: trainInfo }),
      response: g(base,
        `${train.name} (${train.number}) is at Platform ${cardinal(train.platform)}. Arrival: ${t(train.actualArrival)}, Departure: ${t(train.actualDeparture)}.`,
        `${train.nameHindi} (${n(train.number)}) प्लेटफॉर्म ${cardinal(train.platform)} पर है। आगमन: ${t(train.actualArrival)}, प्रस्थान: ${t(train.actualDeparture)}।`,
        `${train.nameTelugu} (${n(train.number)}) ప్లాట్‌ఫారం ${cardinal(train.platform)}లో ఉంది. రాక: ${t(train.actualArrival)}, నిష్క్రమణ: ${t(train.actualDeparture)}.`),
    };
  }

  // ── Train search by destination (only reached when no named train matched) ─────
  if (isTrainSearch) {
    let destination = extractDestination(text, lower);
    if (destination) {
      const k = destination.toLowerCase();
      if (cityMap[k]) destination = cityMap[k];
      const matched = TRAINS.filter(t => t.to.toLowerCase().includes(destination.toLowerCase()));
      if (matched.length === 0) {
        return {
          intent: "train_search",
          intentData: toDataString({ topic: "train_search", destination, trains_found: [] }),
          response: g(base,
            `No trains found to ${destination}.`,
            `${destination} के लिए कोई ट्रेन नहीं मिली।`,
            `${destination} కు రైళ్లు లేవు.`),
        };
      }
      const trainList = matched.map(t => ({
        number: t.number, name: t.name,
        platform: t.platform, status: t.status, delay: t.delay,
        arrival: t.actualArrival, departure: t.actualDeparture,
      }));
      return {
        intent: "train_search",
        intentData: toDataString({ topic: "train_search", destination, trains_found: trainList }),
        response: g(base,
          `Available trains to ${destination}: ${matched.map(t => `${t.name} (${t.number})`).join(", ")}.`,
          `${destination} के लिए उपलब्ध ट्रेनें: ${matched.map(t => `${t.name} (${n(t.number)})`).join(", ")}।`,
          `${destination} కు వెళ్లే రైళ్లు: ${matched.map(t => `${t.name} (${n(t.number)})`).join(", ")}.`),
      };
    }
  }

  // ── Trains at a specific platform ─────────────────────────────────────────────
  if (pfNum && !isAnyFacility) {
    const pfTrains = TRAINS.filter(t => t.platform === pfNum);
    const trainList = pfTrains.map(t => ({ number: t.number, name: t.name, status: t.status, delay: t.delay, arrival: t.actualArrival, departure: t.actualDeparture }));
    return {
      intent: "platform_trains",
      intentData: toDataString({ topic: "platform_trains", platform_number: pfNum, trains: trainList }),
      response: pfTrains.length === 0
        ? g(base,
          `No trains currently at Platform ${cardinal(pfNum)}.`,
          `प्लेटफॉर्म ${cardinal(pfNum)} पर कोई ट्रेन नहीं है।`,
          `ప్లాట్‌ఫారం ${cardinal(pfNum)}లో ట్రెయిన్లు లేవు.`)
        : g(base,
          `Trains at Platform ${cardinal(pfNum)}: ${pfTrains.map(t => `${n(t.number)} ${t.name}`).join(", ")}.`,
          `प्लेटफॉर्म ${cardinal(pfNum)} पर ट्रेनें: ${pfTrains.map(t => `${n(t.number)} ${t.nameHindi}`).join(", ")}।`,
          `ప్లాట్‌ఫారం ${cardinal(pfNum)}లో ట్రెయిన్లు: ${pfTrains.map(t => `${n(t.number)} ${t.nameTelugu}`).join(", ")}.`),
    };
  }

  // ── Facility at a specific platform ───────────────────────────────────────────
  if (isAnyFacility && pfNum) {
    const fac = PLATFORM_FACILITIES[pfNum];
    if (!fac) {
      return {
        intent: "facility",
        intentData: toDataString({ topic: "facility", platform_number: pfNum, available: false }),
        response: g(base,
          `Facility info for Platform ${cardinal(pfNum)} not available.`,
          `प्लेटफॉर्म ${cardinal(pfNum)} के लिए सुविधा जानकारी उपलब्ध नहीं है।`,
          `ప్లాట్‌ఫారం ${cardinal(pfNum)} కోసం సౌకర్యాల సమాచారం అందుబాటులో లేదు.`),
      };
    }

    const facilityType = isFoodQ ? "food" : isWashroomQ ? "washroom" : isCloakQ ? "cloakroom" : isWaitingQ ? "waiting" : "escalator";
    const facilityItems = fac[facilityType] || [];
    const facilityLabels = { food: "Food stalls", washroom: "Washrooms", cloakroom: "Cloak rooms", waiting: "Waiting areas", escalator: "Escalators" };
    const facilityLabelsHi = { food: "खाने के स्टॉल", washroom: "शौचालय", cloakroom: "क्लोक रूम", waiting: "प्रतीक्षा क्षेत्र", escalator: "एस्केलेटर" };
    const facilityLabelsTe = { food: "ఆహార స్టాల్లు", washroom: "వాష్‌రూమ్‌లు", cloakroom: "క్లోక్ రూమ్‌లు", waiting: "వేచి ఉండే ప్రాంతాలు", escalator: "ఎస్కలేటర్లు" };

    return {
      intent: "facility",
      intentData: toDataString({
        topic: "platform_facility",
        platform_number: pfNum,
        facility_type: facilityType,
        items: facilityItems,
      }),
      response: facilityItems.length === 0
        ? g(base,
          `No ${facilityLabels[facilityType]?.toLowerCase()} at Platform ${cardinal(pfNum)}.`,
          `प्लेटफॉर्म ${cardinal(pfNum)} पर ${facilityLabelsHi[facilityType]} उपलब्ध नहीं है।`,
          `ప్లాట్‌ఫారం ${cardinal(pfNum)}లో ${facilityLabelsTe[facilityType]} అందుబాటులో లేదు.`)
        : g(base,
          `Platform ${cardinal(pfNum)} – ${facilityLabels[facilityType]}: ${facilityItems.join(" · ")}`,
          `प्लेटफॉर्म ${cardinal(pfNum)} पर ${facilityLabelsHi[facilityType]}: ${facilityItems.join(" · ")}`,
          `ప్లాట్‌ఫారం ${cardinal(pfNum)}లో ${facilityLabelsTe[facilityType]}: ${facilityItems.join(" · ")}`),
    };
  }

  // ── Unknown ────────────────────────────────────────────────────────────────────
  return {
    intent: "unknown",
    intentData: toDataString({ topic: "unknown", user_query: text }),
    response: g(base,
      "I didn't understand. Ask about a train number, platform, timing or facilities.",
      "मैं समझ नहीं पाया। कृपया ट्रेन नंबर, प्लेटफॉर्म, समय या सुविधाओं के बारे में पूछें।",
      "నేను అర్థం చేసుకోలేకపోయాను. దయచేసి ట్రెయిన్, ప్లాట్‌ఫారం లేదా సౌకర్యాల గురించి అడగండి."),
  };
}

module.exports = { detectIntent, TRAINS, PLATFORM_FACILITIES };
