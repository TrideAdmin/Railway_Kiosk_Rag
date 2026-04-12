// scripts/ingest-sample.js
// Run: node scripts/ingest-sample.js
// Pre-loads realistic railway knowledge into Pinecone

require("dotenv").config({ path: require("path").join(__dirname, "../.env") });
const { ingestDocuments, clearIndex } = require("../rag/pipeline");
const fs = require("fs");
const path = require("path");

// ── Sample data files ────────────────────────────────────────────────────────

const SAMPLE_CSV = `train_number,train_name,from,to,scheduled_arrival,actual_arrival,scheduled_departure,actual_departure,platform,status,delay_minutes
12951,Mumbai Rajdhani,Mumbai Central,New Delhi,08:35,08:52,08:45,09:02,3,delayed,17
12002,Bhopal Shatabdi,New Delhi,Habibganj,10:00,10:00,06:00,06:00,1,on-time,0
22691,Rajdhani Express,Bangalore,New Delhi,20:00,21:30,20:10,21:40,5,delayed,90
12301,Howrah Rajdhani,Howrah,New Delhi,09:55,09:55,10:05,10:05,2,on-time,0
19027,Vivek Express,Dibrugarh,Kanyakumari,14:20,15:05,14:30,15:15,6,delayed,45
12563,Bihar Sampark Kranti,New Delhi,Rajendranagar,11:00,11:00,11:05,11:05,4,on-time,0
17064,Ajanta Express,Secunderabad,Mumbai CSMT,13:10,13:10,13:20,13:20,3,on-time,0
12723,AP Express,Hyderabad,Hazrat Nizamuddin,07:30,07:45,07:40,07:55,1,delayed,15`;

const STATION_KNOWLEDGE = `
RAILWAY STATION GENERAL INFORMATION
=====================================

TICKET BOOKING:
- Counter booking available at main entrance (open 24 hours)
- Online booking via IRCTC website: irctc.co.in or IRCTC Rail Connect app
- Tatkal quota opens at 10:00 AM one day before travel for AC classes
- Tatkal for sleeper class opens at 11:00 AM
- Helpline: 139 (24x7 railway enquiry)
- PNR status check: SMS PNR <number> to 139, or visit indianrailways.gov.in

PLATFORM FACILITIES:

Platform 1:
- Food: Juice Corner near gate 1A, Amul Parlour (mid-platform)
- Washrooms: Near gate 1A (paid, Rs 5), End of platform 1
- Cloakroom: Main cloakroom near gate 1, open 24 hours, Rs 30/item/day
- Waiting: AC Waiting Hall ground floor near gate 1 (free for passengers with valid ticket)
- Escalator: Gate 1 escalator (up only), stairs available for down
- ATM: SBI ATM near ticket counter
- Wheelchair assistance available at gate 1A

Platform 2:
- Food: Café Coffee Day at platform 2 entry, Railway Canteen (mid-platform) serving meals Rs 50-150
- Washrooms: Near footbridge, free
- Waiting: Open waiting benches (no AC)
- Escalator: Footbridge escalator (both sides)

Platform 3:
- Food: IRCTC Food Stall (licensed), Hot Meals Counter (thali Rs 70), Bisleri water stall
- Washrooms: Near IRCTC stall (free), End of platform 3
- Cloakroom: Near platform 3 ramp, Rs 30/hour
- Waiting: Platform 3 waiting shed (covered, no AC)
- Escalator: Main escalator connecting platform 3 to overbridge
- ATM: HDFC ATM near ramp
- Medical: MedPlus counter near gate 3

Platform 4:
- Food: Snack stall near exit
- Washrooms: Near exit gate (free)
- Waiting: Covered waiting area

Platform 5:
- Food: Large food court (20+ items), Domino's Express, Chai & Snack corner
- Washrooms: Near food court (paid Rs 5), Disabled-friendly washroom near ramp
- Cloakroom: Platform 5 entry, open 6 AM to 11 PM
- Waiting: AC Executive Lounge (Rs 50 entry, valid ticket required), General waiting shed
- Escalator: Up/down near food court
- ATM: Axis Bank ATM inside food court
- Medical: Apollo Pharmacy at platform 5 end
- Wheelchair: Available at platform 5 ramp (call 139 for assistance)

Platform 6:
- Food: Tea/Coffee vending machines, Snack cart
- Washrooms: Start of platform (free)
- Waiting: Benches near gate 6

EMERGENCY & HELPLINES:
- Railway Police (RPF): 182
- Medical Emergency: 108 or station medical room (near gate 2)
- Lost & Found: Station Master's office near gate 1
- Enquiry: 139

GENERAL RULES:
- Passengers must carry valid ID proof along with ticket
- No smoking inside station premises (fine Rs 200)
- Photography restricted on platforms
- Unattended luggage will be removed by security
- Last entry to platform: 5 minutes before departure

TRAIN CLASSES AVAILABLE:
- 1AC: First Class Air Conditioned (sleeper, premium)
- 2AC: Two-tier Air Conditioned
- 3AC: Three-tier Air Conditioned
- 3E: Three-tier Economy AC (newer trains)
- SL: Sleeper Class (non-AC)
- CC: Chair Car (AC, day trains like Shatabdi)
- 2S: Second Sitting (non-AC, short distance)
- GEN: General / Unreserved

LUGGAGE ALLOWANCE:
- First AC: 70 kg
- Second AC: 50 kg
- Third AC: 40 kg
- Sleeper: 40 kg
- Second Class: 35 kg
- Excess luggage charged at Rs 2 per kg

CANCELLATION & REFUND POLICY:
- More than 48 hours before departure: Minimum cancellation charges (Rs 120-240 per passenger)
- 12-48 hours before: 25% of fare deducted
- 4-12 hours before: 50% of fare deducted
- Less than 4 hours: No refund (except waitlisted tickets)
- Tatkal tickets: No refund except in case of train cancellation

SENIOR CITIZEN CONCESSION:
- Male passengers 60+ years: 40% discount on basic fare
- Female passengers 58+ years: 50% discount on basic fare
- Available for all classes including Tatkal
`;

const IRCTC_FAQS = `
FREQUENTLY ASKED QUESTIONS — RAILWAY STATION

Q: How do I check my PNR status?
A: You can check PNR status by calling 139, visiting indianrailways.gov.in, using the IRCTC app, or SMS "PNR <10-digit PNR number>" to 139.

Q: What happens if my train is delayed?
A: If a train is delayed by more than 3 hours, you can get a full refund by filing a TDR (Ticket Deposit Receipt) within 72 hours.

Q: Where can I get wheelchair assistance?
A: Wheelchair assistance is available at gates 1A and 5. Call 139 at least 2 hours before your train to book assistance.

Q: What is the Rajdhani Express?
A: Rajdhani Express trains are premium, fully air-conditioned express trains that connect major cities to New Delhi. They are among the fastest and most comfortable trains in India. Train 22691 runs from Bangalore to New Delhi.

Q: What is the Shatabdi Express?
A: Shatabdi Express trains are day-time intercity trains with AC chair car service. They offer meals included in the ticket price. Train 12002 (Bhopal Shatabdi) runs from New Delhi to Habibganj.

Q: How early should I arrive at the station?
A: Arrive at least 30 minutes before departure for regular trains, and 1 hour before for long-distance trains. Platform gates open 20 minutes before scheduled departure.

Q: Is there free Wi-Fi at the station?
A: Yes, RailWire free Wi-Fi is available. Look for "RailWire" network and authenticate using your mobile number.

Q: How do I use the cloakroom?
A: Cloakroom at Platform 1 is open 24 hours (Rs 30/item/day). Platform 3 cloakroom charges Rs 30/hour. Carry a valid ID and your ticket receipt.

Q: What food is available at the station?
A: Platform 5 has the largest food court with 20+ items including Domino's Express. Platform 3 has IRCTC-licensed food. Platform 1 has Amul and juice stalls. Tea and snacks are available on all platforms.

Q: Can I upgrade my ticket class?
A: Upgrades can be done at the Reservation Counter before departure, subject to availability. Tatkal upgrades carry additional charges.

Q: What is the Mumbai Rajdhani?
A: Mumbai Rajdhani (train number 12951) runs from Mumbai Central to New Delhi. It is a prestigious overnight premium train covering the 1,385 km journey. Today it arrives at Platform 3 and is running 17 minutes behind schedule.

Q: What is the AP Express?
A: AP Express (train number 12723) runs from Hyderabad to Hazrat Nizamuddin in New Delhi. It serves Andhra Pradesh and Telangana passengers. Today it arrives at Platform 1 at 07:45 AM, running 15 minutes late.

Q: What is the Vivek Express?
A: Vivek Express (train number 19027) is the longest train route in India, running from Dibrugarh in Assam to Kanyakumari in Tamil Nadu. Today it passes through Platform 6 and is running 45 minutes late.
`;

async function main() {
  console.log("\n🚂 Railway Kiosk — Sample Data Ingestion");
  console.log("=========================================\n");

  // Write sample files
  const csvPath = path.join(__dirname, "../data/train_schedules.csv");
  const stationPath = path.join(__dirname, "../data/station_info.txt");
  const faqPath = path.join(__dirname, "../data/irctc_faqs.txt");

  fs.writeFileSync(csvPath, SAMPLE_CSV);
  fs.writeFileSync(stationPath, STATION_KNOWLEDGE);
  fs.writeFileSync(faqPath, IRCTC_FAQS);
  console.log("✅ Sample data files written.");

  // clearIndex() now safely skips deleteAll if the index is empty (e.g. freshly created),
  // and retries with backoff if Pinecone's data plane isn't ready yet.
  console.log("🗑️  Clearing existing Pinecone index...");
  await clearIndex();

  const sources = [
    {
      type: "csv",
      path: csvPath,
      namespace: "schedules",
      metadata: { category: "train_schedules", date: new Date().toISOString().split("T")[0] },
    },
    {
      type: "txt",
      path: stationPath,
      namespace: "station",
      metadata: { category: "station_facilities" },
    },
    {
      type: "txt",
      path: faqPath,
      namespace: "faqs",
      metadata: { category: "faq" },
    },
  ];

  console.log(`\n📥 Ingesting ${sources.length} sources...\n`);
  const result = await ingestDocuments(sources);

  console.log(`\n✅ Ingestion complete!`);
  console.log(`   Sources: ${result.ingested}`);
  console.log(`   Chunks:  ${result.chunks}`);
  console.log(`\n🎉 Your Pinecone index is ready. Start the server: npm start\n`);
}

main().catch((err) => {
  console.error("❌ Ingestion failed:", err);
  process.exit(1);
});
