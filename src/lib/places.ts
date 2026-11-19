// Indian states / union territories and their main cities (for the State → City dropdowns).
export const PLACES: Record<string, string[]> = {
  "Andhra Pradesh": ["Visakhapatnam", "Vijayawada", "Guntur", "Nellore", "Kurnool", "Tirupati", "Kakinada", "Rajahmundry", "Anantapur", "Kadapa"],
  "Arunachal Pradesh": ["Itanagar", "Naharlagun", "Pasighat", "Tawang"],
  "Assam": ["Guwahati", "Dibrugarh", "Silchar", "Jorhat", "Tezpur", "Nagaon"],
  "Bihar": ["Patna", "Gaya", "Bhagalpur", "Muzaffarpur", "Darbhanga", "Purnia"],
  "Chhattisgarh": ["Raipur", "Bhilai", "Bilaspur", "Korba", "Durg"],
  "Goa": ["Panaji", "Margao", "Vasco da Gama", "Mapusa"],
  "Gujarat": ["Ahmedabad", "Surat", "Vadodara", "Rajkot", "Bhavnagar", "Jamnagar", "Gandhinagar"],
  "Haryana": ["Gurugram", "Faridabad", "Panipat", "Ambala", "Hisar", "Karnal", "Rohtak"],
  "Himachal Pradesh": ["Shimla", "Dharamshala", "Mandi", "Solan", "Kullu"],
  "Jharkhand": ["Ranchi", "Jamshedpur", "Dhanbad", "Bokaro", "Hazaribagh"],
  "Karnataka": ["Bengaluru", "Mysuru", "Mangaluru", "Hubballi", "Dharwad", "Belagavi", "Kalaburagi", "Davanagere", "Ballari", "Shivamogga", "Tumakuru", "Udupi", "Manipal", "Vijayapura", "Hassan", "Mandya"],
  "Kerala": ["Thiruvananthapuram", "Kochi", "Kozhikode", "Thrissur", "Kollam", "Kannur", "Palakkad", "Kottayam"],
  "Madhya Pradesh": ["Bhopal", "Indore", "Jabalpur", "Gwalior", "Ujjain", "Sagar"],
  "Maharashtra": ["Mumbai", "Pune", "Nagpur", "Nashik", "Thane", "Navi Mumbai", "Aurangabad", "Solapur", "Kolhapur", "Amravati"],
  "Manipur": ["Imphal", "Thoubal", "Churachandpur"],
  "Meghalaya": ["Shillong", "Tura", "Jowai"],
  "Mizoram": ["Aizawl", "Lunglei", "Champhai"],
  "Nagaland": ["Kohima", "Dimapur", "Mokokchung"],
  "Odisha": ["Bhubaneswar", "Cuttack", "Rourkela", "Berhampur", "Sambalpur", "Puri"],
  "Punjab": ["Ludhiana", "Amritsar", "Jalandhar", "Patiala", "Bathinda", "Mohali"],
  "Rajasthan": ["Jaipur", "Jodhpur", "Udaipur", "Kota", "Ajmer", "Bikaner"],
  "Sikkim": ["Gangtok", "Namchi", "Gyalshing"],
  "Tamil Nadu": ["Chennai", "Coimbatore", "Madurai", "Tiruchirappalli", "Salem", "Tirunelveli", "Vellore", "Erode", "Thoothukudi", "Hosur"],
  "Telangana": ["Hyderabad", "Secunderabad", "Warangal", "Nizamabad", "Karimnagar", "Khammam"],
  "Tripura": ["Agartala", "Udaipur (Tripura)", "Dharmanagar"],
  "Uttar Pradesh": ["Lucknow", "Kanpur", "Noida", "Ghaziabad", "Agra", "Varanasi", "Prayagraj", "Meerut", "Bareilly", "Aligarh", "Gorakhpur"],
  "Uttarakhand": ["Dehradun", "Haridwar", "Rishikesh", "Haldwani", "Roorkee"],
  "West Bengal": ["Kolkata", "Howrah", "Durgapur", "Asansol", "Siliguri", "Kharagpur"],
  "Andaman and Nicobar Islands": ["Port Blair"],
  "Chandigarh": ["Chandigarh"],
  "Dadra and Nagar Haveli and Daman and Diu": ["Daman", "Silvassa", "Diu"],
  "Delhi": ["New Delhi", "Delhi"],
  "Jammu and Kashmir": ["Srinagar", "Jammu", "Anantnag", "Baramulla"],
  "Ladakh": ["Leh", "Kargil"],
  "Lakshadweep": ["Kavaratti"],
  "Puducherry": ["Puducherry", "Karaikal"],
};
export const STATES = Object.keys(PLACES).sort();

const ALIAS: Record<string, string> = { bangalore: "Bengaluru", mysore: "Mysuru", mangalore: "Mangaluru", hubli: "Hubballi", belgaum: "Belagavi", gulbarga: "Kalaburagi", bombay: "Mumbai", madras: "Chennai", calcutta: "Kolkata", gurgaon: "Gurugram", trivandrum: "Thiruvananthapuram", cochin: "Kochi", calicut: "Kozhikode", vizag: "Visakhapatnam", poona: "Pune", allahabad: "Prayagraj", "new delhi": "New Delhi", banaras: "Varanasi", shimoga: "Shivamogga", tumkur: "Tumakuru", bijapur: "Vijayapura", bellary: "Ballari" };

/** Find {state, city} from free text like "Old Airport Road, Bangalore". */
export function findPlace(text: string | null | undefined): { state: string; city: string } | null {
  if (!text) return null;
  const t = text.toLowerCase();
  for (const [a, city] of Object.entries(ALIAS)) if (new RegExp(`\\b${a}\\b`).test(t)) return { state: stateOf(city)!, city };
  for (const s of STATES) for (const c of PLACES[s]) if (new RegExp(`\\b${c.toLowerCase().replace(/[()]/g, "")}\\b`).test(t)) return { state: s, city: c };
  return null;
}
export const stateOf = (city: string) => STATES.find((s) => PLACES[s].includes(city)) ?? null;
