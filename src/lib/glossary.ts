export type Term = { id: string; term: string; group: "Basics" | "Forecasting" | "Supply" | "Markets" | "Grid & settlement" | "Cost"; def: string };

export const GLOSSARY: Term[] = [
  { id: "mw", term: "MW (megawatt)", group: "Basics", def: "Power at one instant. Demand of 12,000 MW means consumers are drawing 12,000 MW right now." },
  { id: "mu", term: "MU (million units)", group: "Basics", def: "Energy over time. 1 MU = 1 GWh = 10 lakh kWh. 1,000 MW running for one hour is 1 MU." },
  { id: "block", term: "Time block", group: "Basics", def: "The grid runs on 15-minute blocks, 96 per day. Schedules, bids and penalties are all settled block by block." },
  { id: "horizon", term: "Planning horizon", group: "Basics", def: "How far ahead you are looking: real-time (next hour), intra-day, day-ahead, week, month, year, or 10 years. Each horizon has its own market and refresh rate." },
  { id: "band", term: "P10–P90 band", group: "Forecasting", def: "The likely range. There's a 10% chance the real value is below P10 and a 10% chance it's above P90, so 8 times out of 10 it lands inside the band." },
  { id: "mape", term: "MAPE", group: "Forecasting", def: "Mean absolute percentage error: the average size of forecast misses. Lower is better; 2% means the forecast is typically within 2% of actual." },
  { id: "bias", term: "Bias", group: "Forecasting", def: "Whether the forecast tends to run high (+) or low (−). A small bias is corrected automatically on each revision." },
  { id: "scada", term: "SCADA / AMI / MDMS", group: "Forecasting", def: "The live data sources: SCADA telemetry from substations every few minutes, smart meters (AMI) and the meter data management system (MDMS)." },
  { id: "dc", term: "Declared capacity (DC)", group: "Supply", def: "What a plant tells the load despatch centre it can deliver in each block. Outages and derating lower it." },
  { id: "isgs", term: "ISGS", group: "Supply", def: "Inter-State Generating Stations: central plants (e.g. NTPC) whose output is shared among states by allocation." },
  { id: "ipp", term: "IPP / PPA", group: "Supply", def: "Independent power producers, contracted through power purchase agreements, usually with a fixed and a variable charge." },
  { id: "re", term: "RE (renewable energy)", group: "Supply", def: "Solar, wind and hydro. Treated as must-run: it's used first because its variable cost is near zero." },
  { id: "bess", term: "BESS / PSP", group: "Supply", def: "Battery energy storage and pumped-storage hydro. Stores cheap midday solar to cover the evening peak." },
  { id: "merit", term: "Merit order", group: "Supply", def: "Running plants cheapest-first by variable cost until demand is met. The last plant needed is the marginal plant." },
  { id: "vc", term: "Variable cost (VC)", group: "Supply", def: "Fuel cost per MWh for a plant. If a plant's VC is above the market price, it is cheaper to buy from the market instead." },
  { id: "gap", term: "Gap (deficit / surplus)", group: "Supply", def: "Available supply minus demand. Negative means a deficit to buy; positive means surplus that can be sold." },
  { id: "rtm", term: "RTM", group: "Markets", def: "Real-Time Market on the power exchange: 48 half-hourly auctions a day, delivery about an hour later. Used to fix same-day gaps." },
  { id: "dam", term: "DAM", group: "Markets", def: "Day-Ahead Market: bids for all 96 blocks of tomorrow, submitted 10:00–12:00 the day before." },
  { id: "tam", term: "TAM", group: "Markets", def: "Term-Ahead Market: contracts from a few days up to 11 days out, often round-the-clock (RTC) blocks." },
  { id: "deep", term: "DEEP portal", group: "Markets", def: "Government e-bidding portal for medium-term power procurement through tenders (months to a year)." },
  { id: "tbcb", term: "TBCB", group: "Markets", def: "Tariff-based competitive bidding: how long-term PPAs are awarded to the lowest tariff." },
  { id: "exch", term: "IEX / PXIL / HPX", group: "Markets", def: "India's three power exchanges. IEX handles most of the volume." },
  { id: "mcp", term: "MCP", group: "Markets", def: "Market clearing price: the single price at which buy and sell bids meet in each block. Capped at ₹10,000/MWh." },
  { id: "mcv", term: "MCV", group: "Markets", def: "Market clearing volume: how much power actually trades at the MCP." },
  { id: "gate", term: "Gate closure", group: "Markets", def: "The deadline after which bids for a session can no longer be changed." },
  { id: "buffer", term: "Buffer price", group: "Markets", def: "A margin added to the forecast price (here ₹50/MWh) so a buy bid still clears if the price lands slightly higher." },
  { id: "sldc", term: "SLDC", group: "Grid & settlement", def: "State Load Despatch Centre: the grid operator that receives forecasts and approves schedules." },
  { id: "dsm", term: "DSM (deviation settlement)", group: "Grid & settlement", def: "Penalty mechanism: drawing more or less than scheduled is charged per block. Staying inside the ±150 MW band avoids the steepest charges." },
  { id: "overdrawal", term: "Over-drawal", group: "Grid & settlement", def: "Drawing more power from the grid than scheduled. It attracts DSM charges and stresses grid frequency." },
  { id: "dr", term: "Demand response (DR)", group: "Grid & settlement", def: "Temporarily reducing load on selected feeders (e.g. agricultural pumping) to stay within schedule instead of paying penalties." },
  { id: "freq", term: "Grid frequency", group: "Grid & settlement", def: "Should stay close to 50 Hz. Low frequency signals the grid is short of power." },
  { id: "arr", term: "ARR rate", group: "Cost", def: "Average power purchase cost per kWh approved by the regulator (SERC) in the Annual Revenue Requirement. Spending above it is hard to recover." },
  { id: "lf", term: "Load factor", group: "Cost", def: "Average demand ÷ peak demand. Higher means a flatter load that is cheaper to serve." },
  { id: "plf", term: "PLF", group: "Cost", def: "Plant load factor: how much a plant actually generated compared with its full capacity." },
  { id: "rpo", term: "RPO", group: "Cost", def: "Renewable purchase obligation: the share of energy that must come from renewables." },
];

const RULES: [RegExp, string][] = [
  [/mape|forecast error/i, "mape"], [/\bre\b|re share|max re/i, "re"], [/band|p10|p90|range/i, "band"],
  [/dsm/i, "dsm"], [/mcv|probable volume|share of mcv/i, "mcv"], [/arr/i, "arr"], [/load factor/i, "lf"],
  [/dam/i, "dam"], [/rtm/i, "rtm"], [/gate/i, "gate"], [/dr target|feeders on dr|achieved/i, "dr"],
  [/frequency/i, "freq"], [/deficit|surplus|gap|position|shortfall|headroom/i, "gap"], [/saving|merit/i, "merit"],
  [/buy ÷ sell|price/i, "mcp"], [/available|outage/i, "dc"], [/energy|volume/i, "mu"], [/peak|demand|minimum|actual/i, "mw"],
];
export const termFor = (text: string) => {
  const hit = RULES.find(([re]) => re.test(text));
  return hit ? GLOSSARY.find((t) => t.id === hit[1]) : undefined;
};
